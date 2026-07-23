import { createServerFn } from "@tanstack/react-start";
import { jwtVerify, SignJWT, createRemoteJWKSet } from "jose";

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export const mintSupabaseToken = createServerFn({ method: "POST" })
  .validator((data: { firebaseToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");
      
      const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.VITE_SUPABASE_JWT_SECRET;
      if (!jwtSecret) throw new Error("SUPABASE_JWT_SECRET is not set");

      // Verify the Firebase Token
      const jwks = createRemoteJWKSet(new URL(JWKS_URL));
      const { payload } = await jwtVerify(data.firebaseToken, jwks, {
        issuer: `https://securetoken.google.com/${projectId}`,
      });

      // Mint a Supabase Token
      const secret = new TextEncoder().encode(jwtSecret);
      const supabaseToken = await new SignJWT({
        role: "authenticated",
        aud: "authenticated",
        email: payload.email,
        sub: payload.sub,
        app_metadata: { provider: "firebase", providers: ["firebase"] },
        user_metadata: {},
        is_anonymous: false,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      return { success: true, token: supabaseToken };
    } catch (error: any) {
      console.error("Token minting error:", error);
      return { success: false, message: error.message };
    }
  });

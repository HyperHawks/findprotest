import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { updatePassword, updateProfile as updateFirebaseProfile } from "firebase/auth";
import { COUNTRIES } from "@/lib/countries";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "My Profile — FINDPROTEST" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [dob, setDob] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [savingAuth, setSavingAuth] = useState(false);
  const [authMsg, setAuthMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    } else if (user) {
      // Fetch current profile
      supabase
        .from("profiles")
        .select("display_name, username, country_code, dob")
        .eq("id", user.uid)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || "");
            setUsername(data.username || "");
            setCountryCode(data.country_code || "");
            setDob(data.dob || "");
          }
        });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return null;

  const isGoogleUser = user.providerData.some((p) => p.providerId === "google.com");

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user!.uid,
        display_name: displayName,
        username: username || null,
        country_code: countryCode.toUpperCase(),
        dob: dob || null,
      }, { onConflict: "id" });

      if (error) throw error;
      
      // Update Firebase display name too
      await updateFirebaseProfile(user!, { displayName });

      setProfileMsg("Profile updated successfully!");
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setAuthMsg("Password must be at least 6 characters.");
      return;
    }
    setSavingAuth(true);
    setAuthMsg("");
    try {
      await updatePassword(user!, newPassword);
      setAuthMsg("Password updated successfully!");
      setNewPassword("");
    } catch (err: any) {
      setAuthMsg(`Error: ${err.message}. You may need to re-authenticate.`);
    } finally {
      setSavingAuth(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Profile Details */}
          <div className="border-2 border-border p-6 bg-tertiary">
            <h2 className="text-xl font-black uppercase mb-4">Public Details</h2>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">Display Name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">Username (Unique)</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="e.g. john_doe"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">Country</span>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm uppercase"
                >
                  <option value="">Select a country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">Date of Birth</span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
                />
              </label>

              {profileMsg && <p className="text-sm font-bold">{profileMsg}</p>}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full px-4 py-2 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Account Settings */}
          <div className="border-2 border-border p-6 bg-primary">
            <h2 className="text-xl font-black uppercase mb-4">Account Settings</h2>
            
            <div className="mb-6">
              <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">Email Address</span>
              <div className="w-full border-2 border-border bg-background/50 px-3 py-2 font-mono text-sm opacity-70 cursor-not-allowed">
                {user.email}
              </div>
              <p className="text-[10px] font-mono uppercase mt-1 text-muted-foreground">Email changes are currently restricted.</p>
            </div>

            {isGoogleUser ? (
              <div className="border-2 border-border p-4 bg-background">
                <p className="text-sm font-mono font-bold">You are signed in with Google.</p>
                <p className="text-xs font-mono mt-1 text-muted-foreground">Your password is managed by Google.</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <label className="block">
                  <span className="text-[11px] font-mono font-extrabold uppercase mb-1 block">New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
                    required
                    minLength={6}
                  />
                </label>

                {authMsg && <p className="text-sm font-bold">{authMsg}</p>}

                <button
                  type="submit"
                  disabled={savingAuth}
                  className="w-full px-4 py-2 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase hover:opacity-90 disabled:opacity-50"
                >
                  {savingAuth ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

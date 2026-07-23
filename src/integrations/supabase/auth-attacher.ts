import { createMiddleware } from '@tanstack/react-start'
import { auth } from '@/lib/firebase'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)

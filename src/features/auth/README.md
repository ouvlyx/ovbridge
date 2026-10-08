# 🔑 `src/features/auth/` — Authentication & Recovery

This module handles user authentication, Google OAuth sign-in, session state management, and password recovery.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `AuthContext.ts` | React context type definitions for user session and auth methods |
| `AuthProvider.tsx` | Supabase auth session listener and state provider with OAuth parameter parsing |
| `useAuth.ts` | React hook exposing auth state (`user`, `session`, `loading`, `signIn`, `signUp`, `signOut`, `signInWithGoogle`) |
| `LoginPage.tsx` | Sign-in page with email/password and branded Google OAuth button |
| `SignupPage.tsx` | Account registration view with email confirmation guidance |
| `ForgotPasswordPage.tsx` | Password recovery initiation view supporting reset email link and 6-digit OTP code entry |
| `ResetPasswordPage.tsx` | Password update interface invoking `supabase.auth.updateUser({ password })` |
| `AuthCallbackPage.tsx` | OAuth callback route handler processing tokens and session states |
| `ConfirmPage.tsx` | Email confirmation landing view |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)

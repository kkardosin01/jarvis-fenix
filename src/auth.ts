// Login com Google (Auth.js). Só entra quem está em ALLOWED_EMAILS.

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { emailPermitido } from '@/lib/acesso'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/nao-autorizado' },
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && emailPermitido(profile.email)
    }
  }
})

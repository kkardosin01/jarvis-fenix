'use server'

import { signOut } from '@/auth'

export async function sair(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

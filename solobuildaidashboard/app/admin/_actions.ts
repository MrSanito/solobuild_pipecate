'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function setRole(formData: FormData): Promise<void> {
  const { sessionClaims } = await auth()

  // Check that the user trying to set the Role is an admin
  if (sessionClaims?.metadata?.role !== 'admin') {
    return
  }

  const userId = formData.get('id') as string
  const role = formData.get('role') as string

  if (!userId || !role) {
    return
  }

  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    })
    revalidatePath('/admin')
  } catch (err: any) {
    console.error('Error in setRole:', err)
  }
}

export async function removeRole(formData: FormData): Promise<void> {
  const { sessionClaims } = await auth()

  // Check that the user trying to remove the Role is an admin
  if (sessionClaims?.metadata?.role !== 'admin') {
    return
  }

  const userId = formData.get('id') as string

  if (!userId) {
    return
  }

  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: null },
    })
    revalidatePath('/admin')
  } catch (err: any) {
    console.error('Error in removeRole:', err)
  }
}

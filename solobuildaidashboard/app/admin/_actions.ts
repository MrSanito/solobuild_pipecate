'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function setRole(formData: FormData) {
  const { sessionClaims } = await auth()

  // Check that the user trying to set the Role is an admin
  if (sessionClaims?.metadata?.role !== 'admin') {
    return { message: 'Not Authorized' }
  }

  const userId = formData.get('id') as string
  const role = formData.get('role') as string

  if (!userId || !role) {
    return { message: 'Missing required parameters' }
  }

  try {
    const client = await clerkClient()
    const res = await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    })
    revalidatePath('/admin')
    return { success: true, message: res.publicMetadata }
  } catch (err: any) {
    console.error('Error in setRole:', err)
    return { message: err?.message || 'Failed to update role' }
  }
}

export async function removeRole(formData: FormData) {
  const { sessionClaims } = await auth()

  // Check that the user trying to remove the Role is an admin
  if (sessionClaims?.metadata?.role !== 'admin') {
    return { message: 'Not Authorized' }
  }

  const userId = formData.get('id') as string

  if (!userId) {
    return { message: 'Missing user ID' }
  }

  try {
    const client = await clerkClient()
    const res = await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: null },
    })
    revalidatePath('/admin')
    return { success: true, message: res.publicMetadata }
  } catch (err: any) {
    console.error('Error in removeRole:', err)
    return { message: err?.message || 'Failed to remove role' }
  }
}

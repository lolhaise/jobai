'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export function useAdmin() {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      if (status === 'loading') return
      
      if (!session?.user?.id) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/check')
        const data = await response.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [session, status])

  return { isAdmin, isLoading, session }
}

export function useRequireAdmin() {
  const { isAdmin, isLoading } = useAdmin()
  
  if (isLoading) {
    return { isLoading: true, isAdmin: false }
  }
  
  if (!isAdmin) {
    throw new Error('Admin access required')
  }
  
  return { isLoading: false, isAdmin: true }
}
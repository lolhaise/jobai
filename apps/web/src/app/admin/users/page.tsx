'use client'

import { useState, useEffect } from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { UsersTable } from '@/components/admin/users/users-table'
import { UsersFilters } from '@/components/admin/users/users-filters'
import { BulkActions } from '@/components/admin/users/bulk-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { UserRole } from '@jobai/database'
import { Plus, RefreshCw } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  createdAt: string
  updatedAt: string
  applicationsCount: number
  resumesCount: number
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function UsersPage() {
  // State
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<'active' | 'pending' | 'suspended' | 'all'>('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [search, role, status, sortBy, sortOrder, currentPage])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      })

      if (search) params.set('search', search)
      if (role !== 'all') params.set('role', role)
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        throw new Error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle user actions
  async function handleUserAction(userId: string, action: 'activate' | 'deactivate' | 'delete') {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete user')
        
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        })
      } else {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailVerified: action === 'activate',
          }),
        })
        if (!response.ok) throw new Error('Failed to update user')
        
        toast({
          title: 'Success',
          description: `User ${action === 'activate' ? 'activated' : 'deactivated'} successfully`,
        })
      }
      
      fetchUsers()
      setSelectedUsers([])
    } catch (error) {
      console.error(`Error ${action} user:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${action} user`,
        variant: 'destructive',
      })
    }
  }

  // Handle bulk actions
  async function handleBulkAction(action: 'activate' | 'deactivate' | 'delete' | 'changeRole', roleValue?: UserRole) {
    try {
      const payload: any = {
        userIds: selectedUsers,
        action,
      }
      
      if (roleValue && action === 'changeRole') {
        payload.role = roleValue
      }

      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to perform bulk action')

      const result = await response.json()
      toast({
        title: 'Success',
        description: result.message,
      })

      fetchUsers()
      setSelectedUsers([])
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive',
      })
    }
  }

  // Handle export
  async function handleExport() {
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          type: 'users',
        }),
      })

      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'Users exported successfully',
      })
    } catch (error) {
      console.error('Error exporting users:', error)
      toast({
        title: 'Error',
        description: 'Failed to export users',
        variant: 'destructive',
      })
    }
  }

  // Clear filters
  function clearFilters() {
    setSearch('')
    setRole('all')
    setStatus('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">
                Manage user accounts, roles, and permissions
                {pagination && ` • ${pagination.totalCount} total users`}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <UsersFilters
            search={search}
            onSearchChange={setSearch}
            role={role}
            onRoleChange={setRole}
            status={status}
            onStatusChange={setStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onExport={handleExport}
            onClearFilters={clearFilters}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedUsers.length}
            onBulkAction={handleBulkAction}
            onClearSelection={() => setSelectedUsers([])}
          />

          {/* Users Table */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading users...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <UsersTable
              users={users}
              selectedUsers={selectedUsers}
              onSelectionChange={setSelectedUsers}
              onUserAction={handleUserAction}
            />
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}
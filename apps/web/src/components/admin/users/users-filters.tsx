'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Filter, Download, X } from 'lucide-react'
import { USER_ROLES, USER_STATUS_OPTIONS } from '@/lib/admin'
import { UserRole } from '@jobai/database'

interface UsersFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  role: UserRole | 'all'
  onRoleChange: (role: UserRole | 'all') => void
  status: 'active' | 'pending' | 'suspended' | 'all'
  onStatusChange: (status: 'active' | 'pending' | 'suspended' | 'all') => void
  sortBy: string
  onSortByChange: (sortBy: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void
  onExport: () => void
  onClearFilters: () => void
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'updatedAt', label: 'Last Updated' },
]

export function UsersFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onExport,
  onClearFilters,
}: UsersFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasActiveFilters = search || role !== 'all' || status !== 'all'

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Basic Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Select value={role} onValueChange={(value) => onRoleChange(value as UserRole | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(value) => onStatusChange(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {USER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 flex-1">
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-gray-600">Active filters:</span>
            {search && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Search: "{search}"
              </span>
            )}
            {role !== 'all' && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                Role: {USER_ROLES.find(r => r.value === role)?.label}
              </span>
            )}
            {status !== 'all' && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Status: {USER_STATUS_OPTIONS.find(s => s.value === status)?.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
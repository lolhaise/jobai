'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { UserCheck, UserX, Trash2, Crown, AlertTriangle } from 'lucide-react'
import { USER_ROLES } from '@/lib/admin'
import { UserRole } from '@jobai/database'

interface BulkActionsProps {
  selectedCount: number
  onBulkAction: (action: 'activate' | 'deactivate' | 'delete' | 'changeRole', role?: UserRole) => void
  onClearSelection: () => void
}

export function BulkActions({ selectedCount, onBulkAction, onClearSelection }: BulkActionsProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER)

  if (selectedCount === 0) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-900">
                {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Activate/Deactivate Actions */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAction('activate')}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAction('deactivate')}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>

              {/* Role Change */}
              <div className="flex items-center space-x-2">
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAction('changeRole', selectedRole)}
                  className="text-purple-700 border-purple-300 hover:bg-purple-50"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Change Role
                </Button>
              </div>

              {/* Delete Action */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAction('delete')}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-gray-600"
          >
            Clear Selection
          </Button>
        </div>

        {/* Warning for destructive actions */}
        <div className="mt-3 flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Bulk actions will affect all selected users. Admin users cannot be deleted.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
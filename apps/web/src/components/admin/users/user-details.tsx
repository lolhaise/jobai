'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, formatDateTime, formatUserRole, USER_ROLES } from '@/lib/admin'
import { UserRole, ApplicationStatus } from '@jobai/database'
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  FileText, 
  Activity,
  Edit,
  Save,
  X
} from 'lucide-react'

interface UserDetailsProps {
  user: {
    id: string
    name: string | null
    email: string
    role: UserRole
    emailVerified: Date | null
    createdAt: string
    updatedAt: string
    image: string | null
    profile: {
      phone: string | null
      location: string | null
      linkedinUrl: string | null
      githubUrl: string | null
    } | null
    _count: {
      applications: number
      resumes: number
      savedJobs: number
      activities: number
    }
    applications: Array<{
      id: string
      status: ApplicationStatus
      appliedAt: Date | null
      job: {
        title: string
        company: string
      }
    }>
    activities: Array<{
      id: string
      type: string
      description: string
      createdAt: string
    }>
  }
  onUpdate: (updates: { role?: UserRole; emailVerified?: boolean }) => Promise<void>
}

export function UserDetails({ user, onUpdate }: UserDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingRole, setEditingRole] = useState<UserRole>(user.role)
  const [editingStatus, setEditingStatus] = useState<boolean>(!!user.emailVerified)

  const handleSave = async () => {
    try {
      await onUpdate({
        role: editingRole !== user.role ? editingRole : undefined,
        emailVerified: editingStatus !== !!user.emailVerified ? editingStatus : undefined,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleCancel = () => {
    setEditingRole(user.role)
    setEditingStatus(!!user.emailVerified)
    setIsEditing(false)
  }

  const getStatusBadge = (verified: boolean) => {
    return verified ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="warning">Pending</Badge>
    )
  }

  const getRoleBadge = (role: UserRole) => {
    const variant = role === 'ADMIN' ? 'destructive' : role === 'PREMIUM' ? 'default' : 'secondary'
    return <Badge variant={variant}>{formatUserRole(role)}</Badge>
  }

  const getApplicationStatusBadge = (status: ApplicationStatus) => {
    const variant = 
      status === 'OFFERED' ? 'success' :
      status === 'REJECTED' ? 'destructive' :
      status === 'IN_PROGRESS' ? 'warning' :
      'secondary'
    return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* User Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || ''} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.name || 'No name'}</h2>
                <p className="text-gray-600 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {user.email}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Select value={editingRole} onValueChange={(value) => setEditingRole(value as UserRole)}>
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
                      <Select value={editingStatus ? 'active' : 'pending'} onValueChange={(value) => setEditingStatus(value === 'active')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(!!user.emailVerified)}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Details Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Joined {formatDate(user.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Last updated {formatDate(user.updatedAt)}
                  </span>
                </div>
                {user.profile?.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Phone: {user.profile.phone}</span>
                  </div>
                )}
                {user.profile?.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{user.profile.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Links */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.profile?.linkedinUrl && (
                  <div>
                    <span className="text-sm font-medium">LinkedIn:</span>
                    <a 
                      href={user.profile.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm ml-2"
                    >
                      {user.profile.linkedinUrl}
                    </a>
                  </div>
                )}
                {user.profile?.githubUrl && (
                  <div>
                    <span className="text-sm font-medium">GitHub:</span>
                    <a 
                      href={user.profile.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm ml-2"
                    >
                      {user.profile.githubUrl}
                    </a>
                  </div>
                )}
                {!user.profile?.linkedinUrl && !user.profile?.githubUrl && (
                  <p className="text-sm text-gray-500">No professional links added</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {user._count.applications}
                </div>
                <div className="text-sm text-gray-600">Applications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {user._count.resumes}
                </div>
                <div className="text-sm text-gray-600">Resumes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {user._count.savedJobs}
                </div>
                <div className="text-sm text-gray-600">Saved Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {user._count.activities}
                </div>
                <div className="text-sm text-gray-600">Activities</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Recent Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.applications.length > 0 ? (
                <div className="space-y-4">
                  {user.applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{app.job.title}</h4>
                        <p className="text-sm text-gray-600">{app.job.company}</p>
                        {app.appliedAt && (
                          <p className="text-xs text-gray-400">
                            Applied {formatDate(app.appliedAt.toString())}
                          </p>
                        )}
                      </div>
                      {getApplicationStatusBadge(app.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No applications found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.activities.length > 0 ? (
                <div className="space-y-4">
                  {user.activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No activity found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
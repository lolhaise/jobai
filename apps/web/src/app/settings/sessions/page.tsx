'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Monitor, Smartphone, Tablet, Globe, AlertTriangle, Trash2 } from 'lucide-react'

interface Session {
  id: string
  userId: string
  expires: string
  sessionToken: string
  createdAt: string
  updatedAt: string
  userAgent?: string
  ipAddress?: string
  location?: string
  isCurrent: boolean
}

const getDeviceIcon = (userAgent?: string) => {
  if (!userAgent) return Globe
  
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return Tablet
  }
  return Monitor
}

const getDeviceName = (userAgent?: string) => {
  if (!userAgent) return 'Unknown Device'
  
  const ua = userAgent.toLowerCase()
  
  // Browser detection
  let browser = 'Unknown Browser'
  if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('edge')) browser = 'Edge'
  
  // OS detection
  let os = 'Unknown OS'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  
  return `${browser} on ${os}`
}

export default function SessionsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revoking, setRevoking] = useState<string[]>([])

  useEffect(() => {
    if (session?.user) {
      loadSessions()
    }
  }, [session])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const data = await api.get('/api/sessions')
      setSessions(data.sessions)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sessions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    setRevoking(prev => [...prev, sessionId])
    
    try {
      await api.delete(`/api/sessions/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      toast({
        title: 'Session revoked',
        description: 'The session has been successfully revoked.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke session. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setRevoking(prev => prev.filter(id => id !== sessionId))
    }
  }

  const revokeAllOtherSessions = async () => {
    setIsLoading(true)
    
    try {
      await api.post('/api/sessions/revoke-all-others')
      await loadSessions()
      
      toast({
        title: 'Sessions revoked',
        description: 'All other sessions have been successfully revoked.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke sessions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const currentSession = sessions.find(s => s.isCurrent)
  const otherSessions = sessions.filter(s => !s.isCurrent)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions across different devices and browsers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading sessions...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Session */}
              {currentSession && (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 rounded-full bg-green-100 mr-3">
                        {(() => {
                          const DeviceIcon = getDeviceIcon(currentSession.userAgent)
                          return <DeviceIcon className="h-5 w-5 text-green-600" />
                        })()}
                      </div>
                      <div>
                        <h3 className="font-medium text-green-900">
                          {getDeviceName(currentSession.userAgent)}
                          <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                            Current
                          </span>
                        </h3>
                        <div className="text-sm text-green-700 space-y-1">
                          <p>IP Address: {currentSession.ipAddress || 'Unknown'}</p>
                          <p>Location: {currentSession.location || 'Unknown'}</p>
                          <p>Last active: {formatDate(currentSession.updatedAt)}</p>
                          <p>Created: {formatDate(currentSession.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Sessions */}
              {otherSessions.length > 0 && (
                <>
                  <div className="flex items-center justify-between pt-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Other Sessions ({otherSessions.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={revokeAllOtherSessions}
                      disabled={isLoading}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke All Others
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {otherSessions.map((sessionItem) => {
                      const DeviceIcon = getDeviceIcon(sessionItem.userAgent)
                      const isRevoking = revoking.includes(sessionItem.id)
                      
                      return (
                        <div key={sessionItem.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-gray-100 mr-3">
                                <DeviceIcon className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getDeviceName(sessionItem.userAgent)}
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>IP Address: {sessionItem.ipAddress || 'Unknown'}</p>
                                  <p>Location: {sessionItem.location || 'Unknown'}</p>
                                  <p>Last active: {formatDate(sessionItem.updatedAt)}</p>
                                  <p>Created: {formatDate(sessionItem.createdAt)}</p>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeSession(sessionItem.id)}
                              disabled={isRevoking}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              {isRevoking ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Revoking...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Revoke
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {sessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No active sessions found.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ul className="space-y-2 text-sm">
            <li>• Always sign out when using a shared or public computer</li>
            <li>• Regularly review and revoke sessions you don't recognize</li>
            <li>• If you see suspicious activity, change your password immediately</li>
            <li>• Enable two-factor authentication for additional security</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Link, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface CalendarIntegration {
  provider: 'GOOGLE' | 'OUTLOOK'; // Calendar provider type
  isConnected: boolean; // Connection status
  lastSyncedAt?: string; // Last sync timestamp
  email?: string; // Connected account email
}

interface CalendarEvent {
  id: string; // Event ID
  title: string; // Event title
  startTime: string; // Start time
  endTime: string; // End time
  location?: string; // Event location
  provider: 'GOOGLE' | 'OUTLOOK'; // Source provider
}

export function CalendarIntegration() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]); // Connected calendars
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Synced events
  const [syncing, setSyncing] = useState(false); // Sync in progress
  const [connecting, setConnecting] = useState<string | null>(null); // Provider being connected
  const [syncStatus, setSyncStatus] = useState<any>(null); // Last sync status

  useEffect(() => {
    fetchIntegrations(); // Load integrations on mount
    fetchEvents(); // Load synced events
  }, []);

  /**
   * Fetch calendar integrations from API
   */
  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/integrations');
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  /**
   * Fetch synced calendar events
   */
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  /**
   * Connect a calendar provider
   * @param provider - Calendar provider to connect
   */
  const connectCalendar = async (provider: 'GOOGLE' | 'OUTLOOK') => {
    setConnecting(provider); // Set connecting state
    try {
      // Get OAuth authorization URL
      const response = await fetch(`/api/calendar/auth/${provider.toLowerCase()}`);
      const { authUrl } = await response.json();
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      setConnecting(null);
    }
  };

  /**
   * Disconnect a calendar provider
   * @param provider - Calendar provider to disconnect
   */
  const disconnectCalendar = async (provider: 'GOOGLE' | 'OUTLOOK') => {
    try {
      const response = await fetch(`/api/calendar/disconnect/${provider.toLowerCase()}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Update local state
        setIntegrations(prev => 
          prev.map(int => 
            int.provider === provider 
              ? { ...int, isConnected: false }
              : int
          )
        );
      }
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    }
  };

  /**
   * Sync all connected calendars
   */
  const syncCalendars = async () => {
    setSyncing(true); // Set syncing state
    setSyncStatus(null); // Clear previous status
    
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date().toISOString(), // Sync from today
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ahead
        }),
      });
      
      const status = await response.json();
      setSyncStatus(status); // Store sync status
      
      // Refresh data after sync
      await fetchIntegrations();
      await fetchEvents();
    } catch (error) {
      console.error('Calendar sync failed:', error);
      setSyncStatus({ success: false, error: error.message });
    } finally {
      setSyncing(false); // Clear syncing state
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendar Integration</h2>
        <p className="text-muted-foreground">
          Connect your calendars to automatically schedule interviews and avoid conflicts
        </p>
      </div>

      {/* Connected Calendars */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Calendars</CardTitle>
          <CardDescription>
            Manage your calendar connections and sync settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Google Calendar</h3>
                  {integrations.find(i => i.provider === 'GOOGLE')?.isConnected ? (
                    <p className="text-sm text-muted-foreground">
                      Connected as {integrations.find(i => i.provider === 'GOOGLE')?.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Connect to sync with Google Calendar
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.find(i => i.provider === 'GOOGLE')?.isConnected ? (
                  <>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectCalendar('GOOGLE')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => connectCalendar('GOOGLE')}
                    disabled={connecting === 'GOOGLE'}
                  >
                    {connecting === 'GOOGLE' ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>

            {/* Outlook Calendar */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Outlook Calendar</h3>
                  {integrations.find(i => i.provider === 'OUTLOOK')?.isConnected ? (
                    <p className="text-sm text-muted-foreground">
                      Connected as {integrations.find(i => i.provider === 'OUTLOOK')?.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Connect to sync with Microsoft Outlook
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.find(i => i.provider === 'OUTLOOK')?.isConnected ? (
                  <>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectCalendar('OUTLOOK')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => connectCalendar('OUTLOOK')}
                    disabled={connecting === 'OUTLOOK'}
                  >
                    {connecting === 'OUTLOOK' ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sync button */}
          {integrations.some(i => i.isConnected) && (
            <div className="mt-6 flex justify-between items-center">
              <div>
                {integrations.find(i => i.isConnected && i.lastSyncedAt) && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {format(new Date(integrations.find(i => i.isConnected)!.lastSyncedAt!), 'MMM dd, HH:mm')}
                  </p>
                )}
              </div>
              <Button onClick={syncCalendars} disabled={syncing}>
                {syncing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Calendars'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      {syncStatus && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Alert className={syncStatus.success ? 'border-green-600' : 'border-red-600'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncStatus.success ? (
                  <>
                    Successfully synced {syncStatus.totalEvents} events.
                    {syncStatus.conflicts?.length > 0 && (
                      <span className="ml-1">
                        Found {syncStatus.conflicts.length} conflicts.
                      </span>
                    )}
                  </>
                ) : (
                  <>Sync failed: {syncStatus.error || 'Unknown error'}</>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interview Events</CardTitle>
            <CardDescription>
              Events synced from your connected calendars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={event.provider === 'GOOGLE' ? 'default' : 'secondary'}>
                      {event.provider}
                    </Badge>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startTime), 'MMM dd, HH:mm')} -{' '}
                        {format(new Date(event.endTime), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  {event.location && (
                    <Badge variant="outline">
                      <Link className="h-3 w-3 mr-1" />
                      {event.location}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
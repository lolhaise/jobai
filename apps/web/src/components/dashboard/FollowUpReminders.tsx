'use client';

// Follow-up Reminders Component
// Manages follow-up reminders and templates for applications

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast, addDays } from 'date-fns';
import {
  Bell,
  CalendarIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  FileText,
  DollarSign,
  XCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FollowUp {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  type: string;
  dueDate: string;
  completed: boolean;
  message?: string;
}

interface FollowUpTemplate {
  type: string;
  templates: string[];
}

export function FollowUpReminders() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch follow-ups
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/followups/pending');
      const data = await response.json();
      setFollowUps(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load follow-ups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFollowUps();
  }, []);

  // Mark follow-up as complete
  const handleComplete = async (followUpId: string) => {
    try {
      const response = await fetch(`/api/dashboard/followups/${followUpId}/complete`, {
        method: 'PUT'
      });

      if (!response.ok) {
        throw new Error('Failed to complete follow-up');
      }

      toast({
        title: 'Follow-up Completed',
        description: 'Great job staying on top of your applications!'
      });

      // Remove from list
      setFollowUps(followUps.filter(f => f.id !== followUpId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete follow-up',
        variant: 'destructive'
      });
    }
  };

  // Snooze follow-up
  const handleSnooze = async (followUpId: string, days: number) => {
    try {
      const newDueDate = addDays(new Date(), days);
      const response = await fetch(`/api/dashboard/followups/${followUpId}/snooze`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDueDate })
      });

      if (!response.ok) {
        throw new Error('Failed to snooze follow-up');
      }

      toast({
        title: 'Follow-up Snoozed',
        description: `Reminder moved to ${format(newDueDate, 'PP')}`
      });

      fetchFollowUps();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to snooze follow-up',
        variant: 'destructive'
      });
    }
  };

  // Get icon for follow-up type
  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case 'thank_you': return <MessageSquare className="h-4 w-4" />;
      case 'status_check': return <Clock className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'offer_response': return <DollarSign className="h-4 w-4" />;
      case 'rejection_followup': return <XCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Get color for follow-up type
  const getFollowUpColor = (type: string) => {
    switch (type) {
      case 'thank_you': return 'bg-blue-500';
      case 'status_check': return 'bg-yellow-500';
      case 'document': return 'bg-purple-500';
      case 'offer_response': return 'bg-green-500';
      case 'rejection_followup': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Group follow-ups by status
  const overdueFollowUps = followUps.filter(f => isPast(new Date(f.dueDate)));
  const todayFollowUps = followUps.filter(f => {
    const due = new Date(f.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });
  const upcomingFollowUps = followUps.filter(f => {
    const due = new Date(f.dueDate);
    const today = new Date();
    return due > today && due.toDateString() !== today.toDateString();
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Follow-up Reminders</CardTitle>
            <CardDescription>
              {followUps.length} pending follow-ups
              {overdueFollowUps.length > 0 && (
                <span className="text-red-500 ml-2">
                  ({overdueFollowUps.length} overdue)
                </span>
              )}
            </CardDescription>
          </div>
          <Button size="sm" onClick={fetchFollowUps}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {/* Overdue Follow-ups */}
            {overdueFollowUps.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-500">Overdue</h3>
                </div>
                <div className="space-y-2">
                  {overdueFollowUps.map((followUp) => (
                    <FollowUpItem
                      key={followUp.id}
                      followUp={followUp}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                      isOverdue
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Follow-ups */}
            {todayFollowUps.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Today</h3>
                </div>
                <div className="space-y-2">
                  {todayFollowUps.map((followUp) => (
                    <FollowUpItem
                      key={followUp.id}
                      followUp={followUp}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Follow-ups */}
            {upcomingFollowUps.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold">Upcoming</h3>
                </div>
                <div className="space-y-2">
                  {upcomingFollowUps.map((followUp) => (
                    <FollowUpItem
                      key={followUp.id}
                      followUp={followUp}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No follow-ups */}
            {followUps.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground">No pending follow-ups</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Follow-ups will appear here when you schedule them
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Individual follow-up item component
function FollowUpItem({ 
  followUp, 
  onComplete, 
  onSnooze,
  isOverdue = false 
}: { 
  followUp: FollowUp;
  onComplete: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  isOverdue?: boolean;
}) {
  const [showSnooze, setShowSnooze] = useState(false);

  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-2",
      isOverdue && "border-red-200 bg-red-50"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Checkbox
            onCheckedChange={(checked) => {
              if (checked) onComplete(followUp.id);
            }}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{followUp.company}</span>
              <Badge variant="outline" className="text-xs">
                {followUp.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{followUp.position}</p>
            {followUp.message && (
              <p className="text-xs text-muted-foreground italic">{followUp.message}</p>
            )}
            <div className="flex items-center space-x-2 text-xs">
              <CalendarIcon className="h-3 w-3" />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {format(new Date(followUp.dueDate), 'PP')}
              </span>
              <span className="text-muted-foreground">
                ({formatDistanceToNow(new Date(followUp.dueDate), { addSuffix: true })})
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Popover open={showSnooze} onOpenChange={setShowSnooze}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onSnooze(followUp.id, 1);
                    setShowSnooze(false);
                  }}
                >
                  Tomorrow
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onSnooze(followUp.id, 3);
                    setShowSnooze(false);
                  }}
                >
                  In 3 days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onSnooze(followUp.id, 7);
                    setShowSnooze(false);
                  }}
                >
                  Next week
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" size="sm" asChild>
            <a href={`/applications/${followUp.applicationId}`}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
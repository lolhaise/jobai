'use client';

// Interview Scheduler Component
// Manages interview scheduling, rescheduling, and calendar integration

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Clock, MapPin, Link2, User, Mail, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ScheduleInterviewProps {
  applicationId: string;
  company: string;
  position: string;
  onScheduled?: () => void;
}

export function InterviewScheduler({ applicationId, company, position, onScheduled }: ScheduleInterviewProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [type, setType] = useState<'phone' | 'video' | 'onsite'>('video');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sendReminders, setSendReminders] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Handle scheduling interview
  const handleSchedule = async () => {
    if (!date || !time) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time',
        variant: 'destructive'
      });
      return;
    }

    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(date, hours), minutes);

    setLoading(true);

    try {
      const response = await fetch('/api/dashboard/interviews/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          scheduledAt: scheduledAt.toISOString(),
          duration: parseInt(duration),
          type,
          location: type === 'onsite' ? location : undefined,
          meetingLink: type === 'video' ? meetingLink : undefined,
          interviewerName,
          interviewerEmail,
          notes,
          sendReminders
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to schedule interview');
      }

      const result = await response.json();

      toast({
        title: 'Interview Scheduled',
        description: `Your ${type} interview with ${company} has been scheduled for ${format(scheduledAt, 'PPp')}`
      });

      // Download ICS file if available
      if (result.calendarEvent) {
        await downloadICSFile(result.interview.id);
      }

      setOpen(false);
      if (onScheduled) onScheduled();
    } catch (error: any) {
      toast({
        title: 'Scheduling Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download ICS file for calendar import
  const downloadICSFile = async (interviewId: string) => {
    try {
      const response = await fetch(`/api/dashboard/interviews/${interviewId}/ics`);
      const { filename, content } = await response.json();
      
      const blob = new Blob([content], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download ICS file:', error);
    }
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute of [0, 30]) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview for {position} at {company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((timeOpt) => (
                    <SelectItem key={timeOpt} value={timeOpt}>
                      {timeOpt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location or Meeting Link */}
          {type === 'onsite' && (
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="relative">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter interview location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {type === 'video' && (
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <div className="relative">
                <Link2 className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoom, Teams, or other video link"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {/* Interviewer Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interviewer Name (Optional)</Label>
              <div className="relative">
                <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="John Smith"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interviewer Email (Optional)</Label>
              <div className="relative">
                <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="john@company.com"
                  value={interviewerEmail}
                  onChange={(e) => setInterviewerEmail(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes or preparation reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Send Email Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders 1 day and 2 hours before
              </p>
            </div>
            <Switch
              checked={sendReminders}
              onCheckedChange={setSendReminders}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
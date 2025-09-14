'use client';

import React, { useState } from 'react';
import { AlertTriangle, Calendar, Clock, MapPin, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface CalendarEvent {
  id: string; // Event ID
  title: string; // Event title
  description?: string; // Event description
  startTime: string; // Start time ISO string
  endTime: string; // End time ISO string
  location?: string; // Event location
  attendees?: string[]; // List of attendees
  provider: string; // Calendar provider
}

interface Conflict {
  baseEvent: CalendarEvent; // Primary event
  conflictingEvents: CalendarEvent[]; // Conflicting events
  severity: 'low' | 'medium' | 'high'; // Conflict severity
  suggestions: string[]; // Resolution suggestions
}

interface ConflictResolverProps {
  conflicts: Conflict[]; // List of conflicts to resolve
  onResolve: (conflictId: string, resolution: string) => void; // Resolution callback
}

export function ConflictResolver({ conflicts, onResolve }: ConflictResolverProps) {
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, string>>>({}); // Track resolutions
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null); // Expanded conflict view

  /**
   * Get severity color based on level
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100'; // High severity - red
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'; // Medium severity - yellow
      case 'low':
        return 'text-blue-600 bg-blue-100'; // Low severity - blue
      default:
        return 'text-gray-600 bg-gray-100'; // Default - gray
    }
  };

  /**
   * Format event time range for display
   */
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    return `${format(start, 'MMM dd, HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  /**
   * Handle resolution selection
   */
  const handleResolutionChange = (conflictId: string, resolution: string) => {
    setSelectedResolutions(prev => ({
      ...prev,
      [conflictId]: resolution, // Store selected resolution
    }));
  };

  /**
   * Apply selected resolution
   */
  const applyResolution = (conflictId: string) => {
    const resolution = selectedResolutions[conflictId];
    if (resolution) {
      onResolve(conflictId, resolution); // Call parent callback
    }
  };

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Conflicts Detected</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your calendar is clear - no scheduling conflicts found!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conflicts summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            Calendar Conflicts Detected
          </CardTitle>
          <CardDescription>
            Found {conflicts.length} scheduling conflict{conflicts.length !== 1 ? 's' : ''} that need attention
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Conflict cards */}
      {conflicts.map((conflict, index) => {
        const conflictId = `conflict-${index}`; // Generate unique ID
        const isExpanded = expandedConflict === conflictId; // Check if expanded

        return (
          <motion.div
            key={conflictId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-2 ${
              conflict.severity === 'high' ? 'border-red-200' :
              conflict.severity === 'medium' ? 'border-yellow-200' :
              'border-blue-200'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(conflict.severity)}>
                        {conflict.severity.toUpperCase()} PRIORITY
                      </Badge>
                      <Badge variant="outline">
                        {conflict.conflictingEvents.length + 1} Events
                      </Badge>
                    </div>
                    <h3 className="text-lg font-medium mt-2">
                      {conflict.baseEvent.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRange(conflict.baseEvent.startTime, conflict.baseEvent.endTime)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedConflict(isExpanded ? null : conflictId)}
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* Conflicting events list */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Conflicts with:</div>
                  {conflict.conflictingEvents.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </p>
                      </div>
                      <Badge variant="outline">{event.provider}</Badge>
                    </div>
                  ))}
                </div>

                {/* Expanded details and resolution options */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-6 space-y-4"
                  >
                    <Separator />

                    {/* Event details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {conflict.baseEvent.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{conflict.baseEvent.location}</span>
                        </div>
                      )}
                      {conflict.baseEvent.attendees && conflict.baseEvent.attendees.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{conflict.baseEvent.attendees.length} attendees</span>
                        </div>
                      )}
                    </div>

                    {/* AI suggestions */}
                    {conflict.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Suggestions:</h4>
                        <div className="space-y-1">
                          {conflict.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <span className="text-muted-foreground">•</span>
                              <p className="text-sm text-muted-foreground">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution options */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Choose Resolution:</h4>
                      <RadioGroup
                        value={selectedResolutions[conflictId] || ''}
                        onValueChange={(value) => handleResolutionChange(conflictId, value)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="keep-interview" id={`${conflictId}-keep`} />
                            <Label htmlFor={`${conflictId}-keep`} className="cursor-pointer">
                              Keep the interview, reschedule other event(s)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="reschedule-interview" id={`${conflictId}-reschedule`} />
                            <Label htmlFor={`${conflictId}-reschedule`} className="cursor-pointer">
                              Reschedule the interview to available slot
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="virtual" id={`${conflictId}-virtual`} />
                            <Label htmlFor={`${conflictId}-virtual`} className="cursor-pointer">
                              Make one event virtual to avoid travel time
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="delegate" id={`${conflictId}-delegate`} />
                            <Label htmlFor={`${conflictId}-delegate`} className="cursor-pointer">
                              Delegate or decline lower priority event
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id={`${conflictId}-manual`} />
                            <Label htmlFor={`${conflictId}-manual`} className="cursor-pointer">
                              Resolve manually later
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Apply resolution button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => applyResolution(conflictId)}
                        disabled={!selectedResolutions[conflictId]}
                      >
                        Apply Resolution
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
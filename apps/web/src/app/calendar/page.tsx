'use client';

import { CalendarIntegration } from '@/components/calendar/CalendarIntegration';
import { ConflictResolver } from '@/components/calendar/ConflictResolver';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export default function CalendarPage() {
  const [conflicts, setConflicts] = useState([]); // Store detected conflicts

  /**
   * Handle conflict resolution
   * @param conflictId - ID of the conflict
   * @param resolution - Selected resolution strategy
   */
  const handleConflictResolve = async (conflictId: string, resolution: string) => {
    // Send resolution to backend API
    try {
      const response = await fetch('/api/calendar/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, resolution }),
      });

      if (response.ok) {
        // Remove resolved conflict from list
        setConflicts(prev => prev.filter((c: any) => `conflict-${prev.indexOf(c)}` !== conflictId));
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="integration" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="integration">Calendar Integration</TabsTrigger>
          <TabsTrigger value="conflicts">Conflict Resolution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="integration" className="mt-6">
          <CalendarIntegration />
        </TabsContent>
        
        <TabsContent value="conflicts" className="mt-6">
          <ConflictResolver 
            conflicts={conflicts} 
            onResolve={handleConflictResolve} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
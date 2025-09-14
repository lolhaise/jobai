'use client';

// Import React hooks for state management
import { useState, useEffect } from 'react';

// Import drag and drop libraries
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

// Import ApplicationCard component
import { ApplicationCard } from './ApplicationCard';
import { KanbanColumn } from './KanbanColumn';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Import icons
import { Plus, RefreshCw } from 'lucide-react';

// Import types
import { ApplicationStatus } from '@prisma/client';

// Define interfaces for type safety
interface Application {
  id: string;
  status: ApplicationStatus;
  stage: string;
  priority: string;
  appliedAt: Date | null;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    companyLogo: string | null;
  };
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  _count: {
    applicationNotes: number;
    documents: number;
  };
  isFavorite: boolean;
  color: string | null;
  responseDeadline: Date | null;
  nextFollowUp: Date | null;
}

interface KanbanData {
  [key: string]: Application[];
}

interface KanbanBoardProps {
  data: KanbanData;
  onApplicationUpdate: () => void;
  isLoading: boolean;
}

// Define column configuration
const COLUMN_CONFIG = [
  {
    id: 'DRAFT',
    title: 'Draft',
    description: 'Applications being prepared',
    color: 'bg-gray-100',
    badge: 'secondary',
  },
  {
    id: 'APPLIED',
    title: 'Applied',
    description: 'Submitted applications',
    color: 'bg-blue-100',
    badge: 'default',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    description: 'Active interview process',
    color: 'bg-yellow-100',
    badge: 'warning',
  },
  {
    id: 'OFFERED',
    title: 'Offered',
    description: 'Received job offers',
    color: 'bg-green-100',
    badge: 'success',
  },
  {
    id: 'REJECTED',
    title: 'Rejected',
    description: 'Unsuccessful applications',
    color: 'bg-red-100',
    badge: 'destructive',
  },
  {
    id: 'ACCEPTED',
    title: 'Accepted',
    description: 'Offers accepted',
    color: 'bg-emerald-100',
    badge: 'success',
  },
  {
    id: 'WITHDRAWN',
    title: 'Withdrawn',
    description: 'Applications withdrawn',
    color: 'bg-orange-100',
    badge: 'secondary',
  },
] as const;

// Main KanbanBoard component
export function KanbanBoard({ data, onApplicationUpdate, isLoading }: KanbanBoardProps) {
  // State for managing drag and drop
  const [activeApplication, setActiveApplication] = useState<Application | null>(null);
  const [kanbanData, setKanbanData] = useState<KanbanData>(data);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setKanbanData(data);
  }, [data]);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px of movement before drag starts (prevents accidental drags)
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Find the application being dragged
    const application = findApplicationById(active.id as string);
    setActiveApplication(application);
  };

  // Handle drag over event (when dragging over different columns)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if we're dragging over a different column
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
    
    // Update the local state optimistically
    setKanbanData((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      
      // Find indices
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);
      
      // Remove from active container
      const [movedItem] = activeItems.splice(activeIndex, 1);
      
      // Update the status of the moved item
      movedItem.status = overContainer as ApplicationStatus;
      
      // Add to over container
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertIndex, 0, movedItem);
      
      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  };

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveApplication(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    
    if (!activeContainer || !overContainer) return;
    
    // If moving within the same container, handle reordering
    if (activeContainer === overContainer) {
      const items = kanbanData[activeContainer];
      const activeIndex = items.findIndex((item) => item.id === activeId);
      const overIndex = items.findIndex((item) => item.id === overId);
      
      if (activeIndex !== overIndex) {
        setKanbanData((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(items, activeIndex, overIndex),
        }));
      }
    }
    
    // Update positions on the server
    await updateApplicationPositions();
  };

  // Find application by ID across all columns
  const findApplicationById = (id: string): Application | null => {
    for (const columnData of Object.values(kanbanData)) {
      const application = columnData.find((app) => app.id === id);
      if (application) return application;
    }
    return null;
  };

  // Find which container/column an item belongs to
  const findContainer = (id: string): string | null => {
    // Check if ID is a column ID
    if (id in kanbanData) {
      return id;
    }
    
    // Otherwise, find the column containing this application
    for (const [columnId, applications] of Object.entries(kanbanData)) {
      if (applications.find((app) => app.id === id)) {
        return columnId;
      }
    }
    
    return null;
  };

  // Update application positions on the server
  const updateApplicationPositions = async () => {
    setIsUpdating(true);
    
    try {
      // Prepare updates array with new positions
      const updates = [];
      
      for (const [status, applications] of Object.entries(kanbanData)) {
        applications.forEach((app, index) => {
          updates.push({
            id: app.id,
            status: status as ApplicationStatus,
            position: index,
          });
        });
      }
      
      // Send updates to server (API call to be implemented)
      const response = await fetch('/api/applications/kanban/positions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update positions');
      }
      
      // Refresh data from server
      onApplicationUpdate();
    } catch (error) {
      console.error('Error updating positions:', error);
      
      // Revert to original data on error
      setKanbanData(data);
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className=\"grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4\">
        {COLUMN_CONFIG.map((column) => (
          <Card key={column.id} className=\"h-96\">
            <CardHeader className=\"pb-3\">
              <Skeleton className=\"h-5 w-20\" />
              <Skeleton className=\"h-4 w-32\" />
            </CardHeader>
            <CardContent>
              <div className=\"space-y-3\">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className=\"h-24 w-full\" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className=\"grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-h-96\">
        {COLUMN_CONFIG.map((column) => {
          const applications = kanbanData[column.id] || [];
          const applicationIds = applications.map((app) => app.id);
          
          return (
            <Card key={column.id} className={`flex flex-col ${column.color} border-2`}>
              <CardHeader className=\"pb-3 flex-shrink-0\">
                <div className=\"flex items-center justify-between\">
                  <CardTitle className=\"text-sm font-medium flex items-center\">
                    {column.title}
                    <Badge variant={column.badge as any} className=\"ml-2 text-xs\">
                      {applications.length}
                    </Badge>
                  </CardTitle>
                  {isUpdating && (
                    <RefreshCw className=\"h-4 w-4 animate-spin text-muted-foreground\" />
                  )}
                </div>
                <p className=\"text-xs text-muted-foreground\">{column.description}</p>
              </CardHeader>
              
              <CardContent className=\"flex-1 overflow-auto\">
                <SortableContext items={applicationIds} strategy={verticalListSortingStrategy}>
                  <KanbanColumn
                    id={column.id}
                    applications={applications}
                    onApplicationUpdate={onApplicationUpdate}
                  />
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeApplication ? (
          <div className=\"opacity-90 rotate-3 transform scale-105\">
            <ApplicationCard
              application={activeApplication}
              onUpdate={onApplicationUpdate}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
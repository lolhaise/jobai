'use client';

// Import React hooks
import { useState } from 'react';

// Import drag and drop utilities
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Import ApplicationCard component
import { ApplicationCard } from './ApplicationCard';

// Import UI components
import { Button } from '@/components/ui/button';

// Import icons
import { Plus } from 'lucide-react';

// Define interfaces for type safety
interface Application {
  id: string;
  status: string;
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

interface KanbanColumnProps {
  id: string;
  applications: Application[];
  onApplicationUpdate: () => void;
}

// KanbanColumn component for individual columns in the Kanban board
export function KanbanColumn({ id, applications, onApplicationUpdate }: KanbanColumnProps) {
  // State for hover effect during drag operations
  const [isOver, setIsOver] = useState(false);
  
  // Set up droppable area for this column
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: id,
  });

  // Handle quick add application to this column
  const handleQuickAdd = () => {
    // TODO: Implement quick add functionality
    // This could open a modal or navigate to create application with pre-selected status
    console.log(`Quick add application to ${id} column`);
  };

  // Get application IDs for sortable context
  const applicationIds = applications.map(app => app.id);

  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 min-h-32 p-2 rounded-md transition-colors ${
        isOverDroppable ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
      }`}
    >
      {/* Applications List */}
      <SortableContext items={applicationIds} strategy={verticalListSortingStrategy}>
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onUpdate={onApplicationUpdate}
          />
        ))}
      </SortableContext>

      {/* Empty State with Quick Add Button */}
      {applications.length === 0 && (
        <div className=\"text-center py-8\">
          <p className=\"text-sm text-muted-foreground mb-3\">No applications yet</p>
          <Button
            variant=\"ghost\"
            size=\"sm\"
            onClick={handleQuickAdd}
            className=\"text-muted-foreground hover:text-foreground\"
          >
            <Plus className=\"h-4 w-4 mr-1\" />
            Add Application
          </Button>
        </div>
      )}

      {/* Quick Add Button for non-empty columns */}
      {applications.length > 0 && (
        <Button
          variant=\"ghost\"
          size=\"sm\"
          onClick={handleQuickAdd}
          className=\"w-full text-muted-foreground hover:text-foreground border-2 border-dashed border-gray-200 hover:border-gray-300\"
        >
          <Plus className=\"h-4 w-4 mr-2\" />
          Add Application
        </Button>
      )}
    </div>
  );
}
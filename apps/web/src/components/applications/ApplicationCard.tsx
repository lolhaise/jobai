'use client';

// Import React hooks
import { useState } from 'react';

// Import Next.js components
import Link from 'next/link';
import Image from 'next/image';

// Import drag and drop utilities
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import UI components
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import icons
import {
  MoreVertical,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Paperclip,
  Heart,
  ExternalLink,
  Edit,
  Trash,
  Archive,
  Star,
  AlertCircle,
} from 'lucide-react';

// Import date utilities
import { formatDistanceToNow, format } from 'date-fns';

// Define interfaces for type safety
interface Application {
  id: string;
  status: string;
  stage: string;
  priority: string;
  appliedAt: Date | null;
  responseDeadline: Date | null;
  nextFollowUp: Date | null;
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
}

interface ApplicationCardProps {
  application: Application;
  onUpdate: () => void;
  isDragging?: boolean;
}

// Helper function to get priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-500';
    case 'HIGH':
      return 'bg-orange-500';
    case 'MEDIUM':
      return 'bg-blue-500';
    case 'LOW':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

// Helper function to get status badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'secondary';
    case 'APPLIED':
      return 'default';
    case 'IN_PROGRESS':
      return 'warning';
    case 'OFFERED':
      return 'success';
    case 'REJECTED':
      return 'destructive';
    case 'ACCEPTED':
      return 'success';
    case 'WITHDRAWN':
      return 'secondary';
    default:
      return 'secondary';
  }
};

// Helper function to check if deadline is approaching
const isDeadlineApproaching = (deadline: Date | null) => {
  if (!deadline) return false;
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000; // 3 days
};

// ApplicationCard component
export function ApplicationCard({ application, onUpdate, isDragging = false }: ApplicationCardProps) {
  // State for loading actions
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Set up sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: application.id });

  // Apply transform styles for drag animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    setIsUpdating(true);
    try {
      // API call to toggle favorite status
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: !application.isFavorite,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      // Refresh data
      onUpdate();
    } catch (error) {
      console.error('Error updating favorite:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle archive application
  const handleArchive = async () => {
    setIsUpdating(true);
    try {
      // API call to archive application
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive application');
      }

      // Refresh data
      onUpdate();
    } catch (error) {
      console.error('Error archiving application:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete application
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    setIsUpdating(true);
    try {
      // API call to delete application
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete application');
      }

      // Refresh data
      onUpdate();
    } catch (error) {
      console.error('Error deleting application:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if deadline is approaching
  const deadlineWarning = isDeadlineApproaching(application.responseDeadline);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isSortableDragging || isDragging ? 'shadow-lg opacity-75' : ''
      } ${application.color ? `border-l-4 border-l-[${application.color}]` : ''}`}
      {...attributes}
      {...listeners}
    >
      <CardHeader className=\"pb-2\">
        <div className=\"flex items-start justify-between\">
          {/* Company Logo and Info */}
          <div className=\"flex items-center space-x-3 flex-1 min-w-0\">
            {/* Company Avatar */}
            <Avatar className=\"h-10 w-10 flex-shrink-0\">
              {application.job.companyLogo ? (
                <AvatarImage 
                  src={application.job.companyLogo} 
                  alt={`${application.job.company} logo`} 
                />
              ) : (
                <AvatarFallback className=\"text-xs font-semibold\">
                  {application.job.company.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Job Info */}
            <div className=\"min-w-0 flex-1\">
              <h3 className=\"font-semibold text-sm leading-tight line-clamp-1\">
                {application.job.title}
              </h3>
              <p className=\"text-muted-foreground text-xs line-clamp-1\">
                {application.job.company}
              </p>
              {application.job.location && (
                <div className=\"flex items-center text-xs text-muted-foreground mt-1\">
                  <MapPin className=\"h-3 w-3 mr-1\" />
                  <span className=\"line-clamp-1\">{application.job.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                className=\"h-6 w-6 p-0 hover:bg-muted\"
                onClick={(e) => e.stopPropagation()}
                disabled={isUpdating}
              >
                <MoreVertical className=\"h-4 w-4\" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align=\"end\" className=\"w-48\">
              <DropdownMenuItem asChild>
                <Link href={`/applications/${application.id}`}>
                  <ExternalLink className=\"h-4 w-4 mr-2\" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/applications/${application.id}/edit`}>
                  <Edit className=\"h-4 w-4 mr-2\" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Heart className={`h-4 w-4 mr-2 ${application.isFavorite ? 'fill-current text-red-500' : ''}`} />
                {application.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className=\"h-4 w-4 mr-2\" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className=\"text-red-600\">
                <Trash className=\"h-4 w-4 mr-2\" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Priority Indicator */}
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center space-x-2\">
            {/* Priority Dot */}
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(application.priority)}`} />
            
            {/* Status Badge */}
            <Badge variant={getStatusVariant(application.status) as any} className=\"text-xs\">
              {application.stage}
            </Badge>
            
            {/* Favorite Star */}
            {application.isFavorite && (
              <Star className=\"h-3 w-3 fill-current text-yellow-500\" />
            )}
            
            {/* Deadline Warning */}
            {deadlineWarning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className=\"h-3 w-3 text-orange-500\" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Deadline approaching: {format(application.responseDeadline!, 'MMM dd')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className=\"pt-0 space-y-3\">
        {/* Tags */}
        {application.tags.length > 0 && (
          <div className=\"flex flex-wrap gap-1\">
            {application.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant=\"outline\"
                className=\"text-xs px-1.5 py-0.5\"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {application.tags.length > 3 && (
              <Badge variant=\"outline\" className=\"text-xs px-1.5 py-0.5\">
                +{application.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className=\"flex items-center justify-between text-xs text-muted-foreground\">
          <div className=\"flex items-center space-x-3\">
            {/* Notes Count */}
            {application._count.applicationNotes > 0 && (
              <div className=\"flex items-center\">
                <FileText className=\"h-3 w-3 mr-1\" />
                <span>{application._count.applicationNotes}</span>
              </div>
            )}
            
            {/* Documents Count */}
            {application._count.documents > 0 && (
              <div className=\"flex items-center\">
                <Paperclip className=\"h-3 w-3 mr-1\" />
                <span>{application._count.documents}</span>
              </div>
            )}
          </div>

          {/* Applied Date */}
          {application.appliedAt && (
            <div className=\"flex items-center\">
              <Calendar className=\"h-3 w-3 mr-1\" />
              <span>{formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Next Follow-up */}
        {application.nextFollowUp && (
          <div className=\"flex items-center text-xs text-blue-600\">
            <Clock className=\"h-3 w-3 mr-1\" />
            <span>Follow up: {format(new Date(application.nextFollowUp), 'MMM dd')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
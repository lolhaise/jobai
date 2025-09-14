'use client';

// Import React hooks
import { useState, useMemo } from 'react';

// Import Next.js components
import Link from 'next/link';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import icons
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Paperclip,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';

// Import date utilities
import { format, formatDistanceToNow, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

// Define interfaces for type safety
interface Application {
  id: string;
  status: string;
  stage: string;
  priority: string;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  activityLogs?: Array<{
    id: string;
    action: string;
    description: string;
    occurredAt: Date;
    user: {
      name: string | null;
      image: string | null;
    };
  }>;
}

interface TimelineData {
  [key: string]: Application[];
}

interface TimelineViewProps {
  data: TimelineData;
  onApplicationUpdate: () => void;
  isLoading: boolean;
}

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'APPLIED':
      return <CheckCircle className=\"h-4 w-4 text-blue-500\" />;
    case 'IN_PROGRESS':
      return <Clock className=\"h-4 w-4 text-yellow-500\" />;
    case 'OFFERED':
      return <TrendingUp className=\"h-4 w-4 text-green-500\" />;
    case 'REJECTED':
      return <XCircle className=\"h-4 w-4 text-red-500\" />;
    case 'ACCEPTED':
      return <CheckCircle className=\"h-4 w-4 text-emerald-500\" />;
    case 'WITHDRAWN':
      return <Pause className=\"h-4 w-4 text-gray-500\" />;
    default:
      return <Clock className=\"h-4 w-4 text-gray-500\" />;
  }
};

// Helper function to get status variant for badges
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

// Helper function to sort applications chronologically
const sortApplicationsByDate = (applications: Application[], sortBy: string) => {
  return [...applications].sort((a, b) => {
    let dateA: Date, dateB: Date;
    
    switch (sortBy) {
      case 'applied':
        dateA = a.appliedAt || a.createdAt;
        dateB = b.appliedAt || b.createdAt;
        break;
      case 'updated':
        dateA = a.updatedAt;
        dateB = b.updatedAt;
        break;
      case 'deadline':
        dateA = a.responseDeadline || new Date('2099-12-31');
        dateB = b.responseDeadline || new Date('2099-12-31');
        break;
      default:
        dateA = a.createdAt;
        dateB = b.createdAt;
    }
    
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
};

// Helper function to group applications by time period
const groupApplicationsByPeriod = (applications: Application[], groupBy: string) => {
  const groups: { [key: string]: Application[] } = {};
  
  applications.forEach((app) => {
    const date = app.appliedAt || app.createdAt;
    let key: string;
    
    switch (groupBy) {
      case 'week':
        const weekStart = startOfWeek(date);
        key = format(weekStart, 'MMM dd, yyyy');
        break;
      case 'month':
        key = format(date, 'MMM yyyy');
        break;
      case 'year':
        key = format(date, 'yyyy');
        break;
      default:
        key = format(date, 'MMM dd, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(app);
  });
  
  return groups;
};

// TimelineView component
export function TimelineView({ data, onApplicationUpdate, isLoading }: TimelineViewProps) {
  // State for timeline controls
  const [sortBy, setSortBy] = useState('applied');
  const [groupBy, setGroupBy] = useState('week');
  const [showActivity, setShowActivity] = useState(false);
  
  // Flatten all applications from data
  const allApplications = useMemo(() => {
    return Object.values(data).flat();
  }, [data]);
  
  // Sort and group applications
  const sortedApplications = useMemo(() => {
    return sortApplicationsByDate(allApplications, sortBy);
  }, [allApplications, sortBy]);
  
  const groupedApplications = useMemo(() => {
    return groupApplicationsByPeriod(sortedApplications, groupBy);
  }, [sortedApplications, groupBy]);

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className=\"space-y-6\">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className=\"h-5 w-32\" />
              <Skeleton className=\"h-4 w-24\" />
            </CardHeader>
            <CardContent className=\"space-y-4\">
              {[1, 2].map((j) => (
                <div key={j} className=\"flex space-x-4\">
                  <Skeleton className=\"h-10 w-10 rounded-full\" />
                  <div className=\"flex-1 space-y-2\">
                    <Skeleton className=\"h-4 w-48\" />
                    <Skeleton className=\"h-4 w-32\" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Timeline Controls */}
      <Card>
        <CardContent className=\"pt-6\">
          <div className=\"flex items-center justify-between flex-wrap gap-4\">
            <div className=\"flex items-center space-x-4\">
              {/* Sort By */}
              <div className=\"flex items-center space-x-2\">
                <label className=\"text-sm font-medium\">Sort by:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className=\"w-32\">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"applied\">Applied Date</SelectItem>
                    <SelectItem value=\"updated\">Last Updated</SelectItem>
                    <SelectItem value=\"created\">Created Date</SelectItem>
                    <SelectItem value=\"deadline\">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Group By */}
              <div className=\"flex items-center space-x-2\">
                <label className=\"text-sm font-medium\">Group by:</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className=\"w-24\">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"day\">Day</SelectItem>
                    <SelectItem value=\"week\">Week</SelectItem>
                    <SelectItem value=\"month\">Month</SelectItem>
                    <SelectItem value=\"year\">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Show Activity Toggle */}
            <Button
              variant={showActivity ? 'default' : 'outline'}
              size=\"sm\"
              onClick={() => setShowActivity(!showActivity)}
            >
              {showActivity ? 'Hide' : 'Show'} Activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Content */}
      <div className=\"space-y-6\">
        {Object.entries(groupedApplications).map(([period, applications]) => (
          <Card key={period}>
            <CardHeader>
              <CardTitle className=\"text-lg\">{period}</CardTitle>
              <p className=\"text-sm text-muted-foreground\">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </p>
            </CardHeader>
            
            <CardContent className=\"space-y-4\">
              {applications.map((application, index) => (
                <div key={application.id} className=\"relative\">
                  {/* Timeline Line */}
                  {index < applications.length - 1 && (
                    <div className=\"absolute left-4 top-12 w-px h-8 bg-border\" />
                  )}
                  
                  {/* Application Entry */}
                  <div className=\"flex space-x-4\">
                    {/* Status Icon */}
                    <div className=\"flex-shrink-0 w-8 h-8 bg-background border rounded-full flex items-center justify-center\">
                      {getStatusIcon(application.status)}
                    </div>
                    
                    {/* Application Details */}
                    <div className=\"flex-1 min-w-0\">
                      <div className=\"flex items-start justify-between\">
                        <div className=\"flex-1 min-w-0\">
                          {/* Job Title and Company */}
                          <div className=\"flex items-center space-x-2 mb-1\">
                            <h3 className=\"font-semibold text-sm line-clamp-1\">
                              {application.job.title}
                            </h3>
                            <span className=\"text-muted-foreground\">at</span>
                            <span className=\"font-medium text-sm line-clamp-1\">
                              {application.job.company}
                            </span>
                          </div>
                          
                          {/* Location and Date */}
                          <div className=\"flex items-center space-x-4 text-xs text-muted-foreground mb-2\">
                            {application.job.location && (
                              <div className=\"flex items-center\">
                                <MapPin className=\"h-3 w-3 mr-1\" />
                                {application.job.location}
                              </div>
                            )}
                            
                            {application.appliedAt && (
                              <div className=\"flex items-center\">
                                <Calendar className=\"h-3 w-3 mr-1\" />
                                {format(new Date(application.appliedAt), 'MMM dd, yyyy')}
                              </div>
                            )}
                            
                            {application.responseDeadline && (
                              <div className=\"flex items-center text-orange-600\">
                                <AlertCircle className=\"h-3 w-3 mr-1\" />
                                Deadline: {format(new Date(application.responseDeadline), 'MMM dd')}
                              </div>
                            )}
                          </div>
                          
                          {/* Tags and Metadata */}
                          <div className=\"flex items-center justify-between flex-wrap gap-2\">
                            <div className=\"flex items-center space-x-2\">
                              {/* Status Badge */}
                              <Badge variant={getStatusVariant(application.status) as any} className=\"text-xs\">
                                {application.stage}
                              </Badge>
                              
                              {/* Tags */}
                              {application.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant=\"outline\"
                                  className=\"text-xs\"
                                  style={{ borderColor: tag.color, color: tag.color }}
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                              
                              {application.tags.length > 2 && (
                                <Badge variant=\"outline\" className=\"text-xs\">
                                  +{application.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Counts */}
                            <div className=\"flex items-center space-x-3 text-xs text-muted-foreground\">
                              {application._count.applicationNotes > 0 && (
                                <div className=\"flex items-center\">
                                  <FileText className=\"h-3 w-3 mr-1\" />
                                  {application._count.applicationNotes}
                                </div>
                              )}
                              
                              {application._count.documents > 0 && (
                                <div className=\"flex items-center\">
                                  <Paperclip className=\"h-3 w-3 mr-1\" />
                                  {application._count.documents}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Activity Log */}
                          {showActivity && application.activityLogs && application.activityLogs.length > 0 && (
                            <div className=\"mt-3 p-3 bg-muted rounded-md\">
                              <h4 className=\"text-xs font-medium text-muted-foreground mb-2\">Recent Activity</h4>
                              <div className=\"space-y-2\">
                                {application.activityLogs.slice(0, 3).map((activity) => (
                                  <div key={activity.id} className=\"flex items-center space-x-2 text-xs\">
                                    <Avatar className=\"h-4 w-4\">
                                      <AvatarImage src={activity.user.image || ''} />
                                      <AvatarFallback className=\"text-xs\">
                                        {activity.user.name?.[0] || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className=\"text-muted-foreground\">
                                      {activity.description}
                                    </span>
                                    <span className=\"text-muted-foreground\">•</span>
                                    <span className=\"text-muted-foreground\">
                                      {formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        <Button variant=\"ghost\" size=\"sm\" asChild>
                          <Link href={`/applications/${application.id}`}>
                            <ExternalLink className=\"h-4 w-4\" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        
        {/* Empty State */}
        {Object.keys(groupedApplications).length === 0 && (
          <Card>
            <CardContent className=\"pt-12 pb-12 text-center\">
              <Calendar className=\"h-12 w-12 mx-auto text-muted-foreground mb-4\" />
              <h3 className=\"text-lg font-medium mb-2\">No applications found</h3>
              <p className=\"text-muted-foreground mb-4\">
                Start applying to jobs to see your timeline here.
              </p>
              <Button asChild>
                <Link href=\"/jobs\">
                  Browse Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
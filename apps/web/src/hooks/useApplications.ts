// Import React hooks
import { useState, useEffect, useCallback, useMemo } from 'react';

// Import types (these would come from a shared types package in a real app)
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
  color: string | null;
}

interface ApplicationStatistics {
  total: number;
  byStatus: Record<string, number>;
  byStage: Record<string, number>;
  responseRate: number;
  weeklyActivity: number;
}

interface ApplicationFilters {
  search: string;
  status: string;
  stage: string;
  priority: string;
  tags: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface PaginatedApplications {
  data: Application[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface KanbanData {
  [status: string]: Application[];
}

interface TimelineData {
  [period: string]: Application[];
}

// Custom hook for managing applications data
export function useApplications(filters: ApplicationFilters) {
  // State for applications data
  const [applications, setApplications] = useState<PaginatedApplications>({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  });
  
  // State for statistics
  const [statistics, setStatistics] = useState<ApplicationStatistics | null>(null);
  
  // State for loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // State for last refresh time
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Add filter parameters
    if (filters.search) params.append('search', filters.search);
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.stage !== 'all') params.append('stage', filters.stage);
    if (filters.priority !== 'all') params.append('priority', filters.priority);
    
    // Add tags
    filters.tags.forEach(tag => params.append('tags', tag));
    
    // Add date range
    if (filters.dateRange.from) {
      params.append('appliedAfter', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange.to) {
      params.append('appliedBefore', filters.dateRange.to.toISOString());
    }
    
    return params.toString();
  }, [filters]);

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make API request to fetch applications
      const response = await fetch(`/api/applications?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.statusText}`);
      }
      
      const data: PaginatedApplications = await response.json();
      
      // Transform dates from strings to Date objects
      const transformedData = {
        ...data,
        data: data.data.map(app => ({
          ...app,
          appliedAt: app.appliedAt ? new Date(app.appliedAt) : null,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
          responseDeadline: app.responseDeadline ? new Date(app.responseDeadline) : null,
          nextFollowUp: app.nextFollowUp ? new Date(app.nextFollowUp) : null,
        })),
      };
      
      setApplications(transformedData);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  // Fetch statistics from API
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/applications/statistics', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }
      
      const data: ApplicationStatistics = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      // Don't set error for statistics - it's not critical
    }
  }, []);

  // Fetch Kanban data from API
  const fetchKanbanData = useCallback(async (): Promise<KanbanData> => {
    try {
      const response = await fetch('/api/applications/kanban', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch kanban data: ${response.statusText}`);
      }
      
      const data: KanbanData = await response.json();
      
      // Transform dates from strings to Date objects
      const transformedData: KanbanData = {};
      Object.keys(data).forEach(status => {
        transformedData[status] = data[status].map(app => ({
          ...app,
          appliedAt: app.appliedAt ? new Date(app.appliedAt) : null,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
          responseDeadline: app.responseDeadline ? new Date(app.responseDeadline) : null,
          nextFollowUp: app.nextFollowUp ? new Date(app.nextFollowUp) : null,
        }));
      });
      
      return transformedData;
    } catch (err) {
      console.error('Error fetching kanban data:', err);
      return {};
    }
  }, []);

  // Transform applications data for Kanban view
  const kanbanData = useMemo((): KanbanData => {
    const grouped: KanbanData = {};
    
    // Initialize all status groups
    const statuses = ['DRAFT', 'APPLIED', 'IN_PROGRESS', 'OFFERED', 'REJECTED', 'ACCEPTED', 'WITHDRAWN'];
    statuses.forEach(status => {
      grouped[status] = [];
    });
    
    // Group applications by status
    applications.data.forEach(app => {
      if (grouped[app.status]) {
        grouped[app.status].push(app);
      } else {
        grouped[app.status] = [app];
      }
    });
    
    return grouped;
  }, [applications.data]);

  // Transform applications data for Timeline view
  const timelineData = useMemo((): TimelineData => {
    const grouped: TimelineData = {};
    
    applications.data.forEach(app => {
      const date = app.appliedAt || app.createdAt;
      const dateKey = date.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(app);
    });
    
    return grouped;
  }, [applications.data]);

  // Refresh function to manually trigger data reload
  const refreshApplications = useCallback(async () => {
    setLastRefresh(new Date());
    await Promise.all([
      fetchApplications(),
      fetchStatistics(),
    ]);
  }, [fetchApplications, fetchStatistics]);

  // Load data on mount and when filters change
  useEffect(() => {
    refreshApplications();
  }, [refreshApplications]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshApplications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshApplications]);

  // Return hook interface
  return {
    // Data
    applications: applications.data,
    applicationsMeta: applications.meta,
    statistics,
    kanbanData,
    timelineData,
    
    // Loading states
    isLoadingApplications: isLoading,
    error,
    lastRefresh,
    
    // Actions
    refreshApplications,
    fetchKanbanData,
    
    // Helper functions for individual operations
    createApplication: async (data: any) => {
      try {
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create application');
        }
        
        await refreshApplications();
        return await response.json();
      } catch (err) {
        console.error('Error creating application:', err);
        throw err;
      }
    },
    
    updateApplication: async (id: string, data: any) => {
      try {
        const response = await fetch(`/api/applications/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update application');
        }
        
        await refreshApplications();
        return await response.json();
      } catch (err) {
        console.error('Error updating application:', err);
        throw err;
      }
    },
    
    deleteApplication: async (id: string) => {
      try {
        const response = await fetch(`/api/applications/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete application');
        }
        
        await refreshApplications();
      } catch (err) {
        console.error('Error deleting application:', err);
        throw err;
      }
    },
    
    updateKanbanPositions: async (updates: Array<{ id: string; status: string; position: number }>) => {
      try {
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
        
        await refreshApplications();
      } catch (err) {
        console.error('Error updating kanban positions:', err);
        throw err;
      }
    },
  };
}
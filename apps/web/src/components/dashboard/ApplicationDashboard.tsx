'use client';

// Comprehensive Application Dashboard Component
// Displays metrics, charts, and insights for job applications

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import {
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  DollarSign,
  Download,
  RefreshCw,
  FileText,
  Bell,
  ChevronRight,
  Activity,
  Target,
  Award
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

// Dashboard metrics interface
interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  successRate: number;
  averageResponseTime: number;
  interviewRate: number;
  offerRate: number;
  rejectionRate: number;
  applicationsByStatus: Record<string, number>;
  recentActivity: ActivityItem[];
  upcomingInterviews: Interview[];
  pendingFollowUps: FollowUp[];
}

// Activity item interface
interface ActivityItem {
  id: string;
  type: 'application' | 'interview' | 'offer' | 'rejection' | 'followup';
  title: string;
  description: string;
  timestamp: string;
  applicationId: string;
}

// Interview interface
interface Interview {
  id: string;
  company: string;
  position: string;
  scheduledAt: string;
  type: 'phone' | 'video' | 'onsite';
}

// Follow-up interface
interface FollowUp {
  id: string;
  company: string;
  position: string;
  dueDate: string;
  type: string;
}

// Insight interface
interface Insight {
  type: 'warning' | 'improvement' | 'action' | 'success' | 'suggestion';
  title: string;
  description: string;
  action: string;
}

export function ApplicationDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const { toast } = useToast();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel
      const [metricsRes, timeSeriesRes, funnelRes, insightsRes] = await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch(`/api/dashboard/time-series?days=${selectedTimeRange}`),
        fetch('/api/dashboard/funnel'),
        fetch('/api/dashboard/insights')
      ]);

      if (!metricsRes.ok || !timeSeriesRes.ok || !funnelRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [metricsData, timeSeriesData, funnelData, insightsData] = await Promise.all([
        metricsRes.json(),
        timeSeriesRes.json(),
        funnelRes.json(),
        insightsRes.json()
      ]);

      setMetrics(metricsData);
      setTimeSeriesData(timeSeriesData);
      setFunnelData(funnelData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Export data
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const response = await fetch(`/api/dashboard/export?format=${format}`);
      const data = await response.json();
      
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_${format}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      
      toast({
        title: 'Export Successful',
        description: `Applications exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export application data',
        variant: 'destructive'
      });
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application': return <Briefcase className="h-4 w-4" />;
      case 'interview': return <Calendar className="h-4 w-4" />;
      case 'offer': return <Award className="h-4 w-4" />;
      case 'rejection': return <XCircle className="h-4 w-4" />;
      case 'followup': return <Bell className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Get color for insight type
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500';
      case 'improvement': return 'bg-blue-500';
      case 'action': return 'bg-orange-500';
      case 'success': return 'bg-green-500';
      case 'suggestion': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Status colors for pie chart
  const statusColors = {
    APPLIED: '#94a3b8',
    SCREENING: '#60a5fa',
    INTERVIEWING: '#818cf8',
    OFFERED: '#34d399',
    ACCEPTED: '#10b981',
    REJECTED: '#f87171',
    WITHDRAWN: '#fbbf24'
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Dashboard</h1>
          <p className="text-muted-foreground">Track your job search progress and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="relative group">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Briefcase className="h-4 w-4 mr-1" />
              Total Applications
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.totalApplications}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {metrics.activeApplications} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Success Rate
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.successRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.successRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Avg Response Time
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.averageResponseTime.toFixed(0)} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Time to first response
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Interview Rate
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.interviewRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {metrics.offerRate.toFixed(1)}% offer rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Insights & Recommendations</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {insights.map((insight, index) => (
              <Alert key={index}>
                <div className={`h-2 w-2 rounded-full ${getInsightColor(insight.type)}`} />
                <AlertTitle>{insight.title}</AlertTitle>
                <AlertDescription>
                  {insight.description}
                  <div className="mt-1 text-sm font-medium">{insight.action}</div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Application Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(metrics.applicationsByStatus).map(([status, count]) => ({
                        name: status,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(metrics.applicationsByStatus).map(([status], index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[status as keyof typeof statusColors] || '#gray'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Interviews and follow-ups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upcoming Interviews */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Interviews</h4>
                  {metrics.upcomingInterviews.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.upcomingInterviews.slice(0, 3).map((interview) => (
                        <div key={interview.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{interview.company}</p>
                              <p className="text-xs text-muted-foreground">
                                {interview.position} • {interview.type}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(interview.scheduledAt), 'MMM d, h:mm a')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming interviews</p>
                  )}
                </div>

                {/* Pending Follow-ups */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Follow-ups Due</h4>
                  {metrics.pendingFollowUps.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.pendingFollowUps.slice(0, 3).map((followUp) => (
                        <div key={followUp.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Bell className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-sm font-medium">{followUp.company}</p>
                              <p className="text-xs text-muted-foreground">
                                {followUp.type}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(followUp.dueDate), 'MMM d')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending follow-ups</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex justify-end space-x-2 mb-4">
            <Button
              variant={selectedTimeRange === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange(7)}
            >
              7 Days
            </Button>
            <Button
              variant={selectedTimeRange === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange(30)}
            >
              30 Days
            </Button>
            <Button
              variant={selectedTimeRange === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange(90)}
            >
              90 Days
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application Trends</CardTitle>
              <CardDescription>Applications over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="#8884d8" name="Applications" />
                  <Line type="monotone" dataKey="interviews" stroke="#82ca9d" name="Interviews" />
                  <Line type="monotone" dataKey="offers" stroke="#ffc658" name="Offers" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Funnel</CardTitle>
              <CardDescription>Conversion rates through stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={funnelData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    <LabelList dataKey="percentage" position="right" formatter={(value: number) => `${value.toFixed(0)}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates on your applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/applications/${activity.applicationId}`}>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
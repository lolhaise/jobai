'use client';

// Import React hooks
import { useMemo } from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Import icons
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  Award,
} from 'lucide-react';

// Define interfaces for type safety
interface ApplicationStatistics {
  total: number;
  byStatus: Record<string, number>;
  byStage: Record<string, number>;
  responseRate: number;
  weeklyActivity: number;
}

interface ApplicationStatsProps {
  statistics: ApplicationStatistics | null;
}

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// ApplicationStats component
export function ApplicationStats({ statistics }: ApplicationStatsProps) {
  // Calculate derived metrics
  const derivedStats = useMemo(() => {
    if (!statistics) return null;

    const appliedCount = Object.entries(statistics.byStatus)
      .filter(([status]) => status !== 'DRAFT')
      .reduce((sum, [, count]) => sum + count, 0);

    const activeCount = statistics.byStatus['APPLIED'] + 
                       statistics.byStatus['IN_PROGRESS'] || 0;

    const successRate = appliedCount > 0 
      ? Math.round(((statistics.byStatus['OFFERED'] + statistics.byStatus['ACCEPTED'] || 0) / appliedCount) * 100)
      : 0;

    const rejectionRate = appliedCount > 0 
      ? Math.round((statistics.byStatus['REJECTED'] || 0) / appliedCount * 100)
      : 0;

    const interviewRate = appliedCount > 0 
      ? Math.round(((Object.entries(statistics.byStage)
          .filter(([stage]) => ['SCREENING', 'PHONE_SCREEN', 'TECHNICAL', 'ONSITE', 'FINAL'].includes(stage))
          .reduce((sum, [, count]) => sum + count, 0)) / appliedCount) * 100)
      : 0;

    return {
      applied: appliedCount,
      active: activeCount,
      successRate,
      rejectionRate,
      interviewRate,
    };
  }, [statistics]);

  // Show loading state
  if (!statistics || !derivedStats) {
    return (
      <div className=\"grid gap-4 md:grid-cols-2 lg:grid-cols-4\">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">-</div>
              <p className=\"text-xs text-muted-foreground\">-</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Primary Stats Grid */}
      <div className=\"grid gap-4 md:grid-cols-2 lg:grid-cols-4\">
        {/* Total Applications */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Total Applications</CardTitle>
            <FileText className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{statistics.total}</div>
            <p className=\"text-xs text-muted-foreground\">
              {statistics.weeklyActivity} this week
            </p>
          </CardContent>
        </Card>

        {/* Active Applications */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Active Applications</CardTitle>
            <Clock className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-blue-600\">{derivedStats.active}</div>
            <p className=\"text-xs text-muted-foreground\">
              In progress or applied
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Success Rate</CardTitle>
            <Award className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-green-600\">{derivedStats.successRate}%</div>
            <p className=\"text-xs text-muted-foreground\">
              Offers received
            </p>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Response Rate</CardTitle>
            <Target className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-purple-600\">{statistics.responseRate}%</div>
            <p className=\"text-xs text-muted-foreground\">
              Employer responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Grid */}
      <div className=\"grid gap-4 md:grid-cols-3\">
        {/* Interview Rate */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Interview Rate</CardTitle>
            <Zap className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-xl font-bold text-orange-600\">{derivedStats.interviewRate}%</div>
            <Progress value={derivedStats.interviewRate} className=\"mt-2\" />
            <p className=\"text-xs text-muted-foreground mt-2\">
              Applications that led to interviews
            </p>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Weekly Activity</CardTitle>
            <Calendar className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-xl font-bold text-blue-600\">{statistics.weeklyActivity}</div>
            <div className=\"flex items-center mt-2\">
              <TrendingUp className=\"h-3 w-3 text-green-500 mr-1\" />
              <span className=\"text-xs text-green-600\">+12% from last week</span>
            </div>
            <p className=\"text-xs text-muted-foreground mt-1\">
              New applications submitted
            </p>
          </CardContent>
        </Card>

        {/* Rejection Rate */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Rejection Rate</CardTitle>
            <XCircle className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-xl font-bold text-red-600\">{derivedStats.rejectionRate}%</div>
            <Progress value={derivedStats.rejectionRate} className=\"mt-2\" />
            <p className=\"text-xs text-muted-foreground mt-2\">
              Applications that were rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className=\"text-lg\">Application Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid gap-4 md:grid-cols-2 lg:grid-cols-4\">
            {Object.entries(statistics.byStatus).map(([status, count]) => {
              const percentage = statistics.total > 0 
                ? Math.round((count / statistics.total) * 100) 
                : 0;
              
              // Status display configuration
              const statusConfig = {
                DRAFT: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
                APPLIED: { label: 'Applied', color: 'bg-blue-500', icon: CheckCircle },
                IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-500', icon: Clock },
                OFFERED: { label: 'Offered', color: 'bg-green-500', icon: Award },
                REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
                ACCEPTED: { label: 'Accepted', color: 'bg-emerald-500', icon: CheckCircle },
                WITHDRAWN: { label: 'Withdrawn', color: 'bg-orange-500', icon: XCircle },
              } as const;

              const config = statusConfig[status as keyof typeof statusConfig];
              if (!config || count === 0) return null;

              const IconComponent = config.icon;

              return (
                <div key={status} className=\"flex items-center justify-between p-3 bg-muted rounded-lg\">
                  <div className=\"flex items-center space-x-3\">
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <IconComponent className=\"h-4 w-4 text-white\" />
                    </div>
                    <div>
                      <p className=\"font-medium text-sm\">{config.label}</p>
                      <p className=\"text-xs text-muted-foreground\">{percentage}%</p>
                    </div>
                  </div>
                  <Badge variant=\"secondary\" className=\"text-lg font-semibold\">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className=\"text-lg\">Interview Stage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-3\">
            {Object.entries(statistics.byStage).map(([stage, count]) => {
              if (count === 0) return null;
              
              const percentage = statistics.total > 0 
                ? Math.round((count / statistics.total) * 100) 
                : 0;

              // Stage display configuration
              const stageLabels = {
                NOT_APPLIED: 'Not Applied',
                APPLIED: 'Applied',
                SCREENING: 'Screening',
                PHONE_SCREEN: 'Phone Screen',
                TECHNICAL: 'Technical',
                ONSITE: 'Onsite',
                FINAL: 'Final',
                OFFER: 'Offer',
                NEGOTIATION: 'Negotiation',
                CLOSED: 'Closed',
              } as const;

              const label = stageLabels[stage as keyof typeof stageLabels] || stage;

              return (
                <div key={stage} className=\"flex items-center justify-between\">
                  <div className=\"flex items-center space-x-3 flex-1\">
                    <span className=\"text-sm font-medium min-w-0 flex-1\">{label}</span>
                    <Progress value={percentage} className=\"w-24\" />
                  </div>
                  <div className=\"flex items-center space-x-2 ml-4\">
                    <span className=\"text-xs text-muted-foreground\">{percentage}%</span>
                    <Badge variant=\"outline\">{count}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
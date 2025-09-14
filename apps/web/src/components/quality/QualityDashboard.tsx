'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  FileText,
  Target,
  BookOpen,
  Edit3,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Interface for quality score data
interface QualityScore {
  combinedScore: number;
  passesQuality: boolean;
  ats: {
    overallScore: number;
    breakdown: {
      formatting: number;
      keywords: number;
      structure: number;
      readability: number;
      compatibility: number;
    };
    issues: Array<{
      type: string;
      category: string;
      message: string;
      impact: string;
      fix?: string;
    }>;
    recommendations: string[];
  };
  readability: {
    overallScore: number;
    gradeLevel: number;
    metrics: {
      fleschReadingEase: number;
      fleschKincaidGrade: number;
    };
    issues: Array<{
      type: string;
      text: string;
      issue: string;
      suggestion: string;
    }>;
    suggestions: string[];
  };
  grammar: {
    score: number;
    statistics: {
      totalWords: number;
      totalSentences: number;
      errorsFound: number;
      warningsFound: number;
    };
    errors: Array<{
      type: string;
      severity: string;
      text: string;
      message: string;
      suggestion: string;
    }>;
  };
  topIssues: Array<{
    source: string;
    message: string;
    severity: string;
  }>;
  recommendations: string[];
}

// Interface for approval workflow
interface ApprovalWorkflow {
  id: string;
  status: string;
  changes: Array<{
    id: string;
    type: string;
    category: string;
    original: string;
    suggested: string;
    reason: string;
    impact: string;
    confidence: number;
    approved?: boolean;
  }>;
}

export function QualityDashboard() {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  // Fetch quality score
  const fetchQualityScore = async (content: string, jobDescription?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/quality/full-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, jobDescription }),
      });
      const data = await response.json();
      setQualityScore(data);
    } catch (error) {
      console.error('Error fetching quality score:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle change approval
  const handleChangeApproval = (changeId: string, approved: boolean) => {
    setDecisions(prev => ({ ...prev, [changeId]: approved }));
  };

  // Submit all approvals
  const submitApprovals = async () => {
    if (!workflow) return;
    
    const decisionArray = Object.entries(decisions).map(([changeId, approved]) => ({
      changeId,
      approved,
    }));
    
    try {
      const response = await fetch(`/api/quality/workflow/${workflow.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: decisionArray }),
      });
      const data = await response.json();
      setWorkflow(data);
    } catch (error) {
      console.error('Error submitting approvals:', error);
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get score badge
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 50) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Needs Work', variant: 'destructive' as const };
  };

  // Get impact badge color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Quality Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive quality analysis and optimization
          </p>
        </div>
        <Button onClick={() => fetchQualityScore('Sample resume content')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Run Full Analysis
        </Button>
      </div>

      {qualityScore && (
        <>
          {/* Overall Score Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Combined Quality Score</p>
                  <div className="flex items-center space-x-4">
                    <span className={`text-5xl font-bold ${getScoreColor(qualityScore.combinedScore)}`}>
                      {qualityScore.combinedScore}
                    </span>
                    <Badge variant={getScoreBadge(qualityScore.combinedScore).variant}>
                      {getScoreBadge(qualityScore.combinedScore).label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {qualityScore.passesQuality ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Passes quality standards
                      </span>
                    ) : (
                      <span className="flex items-center text-orange-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        Needs improvement
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative h-32 w-32">
                  <svg className="transform -rotate-90 h-32 w-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(qualityScore.combinedScore * 377) / 100} 377`}
                      className={getScoreColor(qualityScore.combinedScore)}
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* ATS Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Target className="mr-2 h-4 w-4" />
                  ATS Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityScore.ats.overallScore}%</div>
                <Progress value={qualityScore.ats.overallScore} className="mt-2" />
                <div className="mt-3 space-y-1">
                  {Object.entries(qualityScore.ats.breakdown).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{key}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Readability Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Readability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityScore.readability.overallScore}%</div>
                <Progress value={qualityScore.readability.overallScore} className="mt-2" />
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Grade Level</span>
                    <span className="font-medium">{qualityScore.readability.gradeLevel}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Reading Ease</span>
                    <span className="font-medium">
                      {Math.round(qualityScore.readability.metrics.fleschReadingEase)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grammar Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Grammar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityScore.grammar.score}%</div>
                <Progress value={qualityScore.grammar.score} className="mt-2" />
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Errors</span>
                    <span className="font-medium text-red-600">
                      {qualityScore.grammar.statistics.errorsFound}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Warnings</span>
                    <span className="font-medium text-yellow-600">
                      {qualityScore.grammar.statistics.warningsFound}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Issues to Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {qualityScore.topIssues.map((issue, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="mt-0.5">
                            {issue.severity === 'critical' || issue.severity === 'error' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : issue.severity === 'warning' || issue.severity === 'major' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <Info className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {issue.source}
                              </Badge>
                              <Badge variant={getImpactColor(issue.severity)} className="text-xs">
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-sm">{issue.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues" className="space-y-4">
              <div className="grid gap-4">
                {/* ATS Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ATS Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {qualityScore.ats.issues.slice(0, 5).map((issue, index) => (
                        <div key={index} className="border-l-2 border-orange-500 pl-3">
                          <p className="text-sm font-medium">{issue.message}</p>
                          {issue.fix && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Fix: {issue.fix}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Grammar Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Grammar Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {qualityScore.grammar.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="border-l-2 border-red-500 pl-3">
                          <p className="text-sm font-medium">{error.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Suggestion: {error.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personalized Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {qualityScore.recommendations.map((rec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30"
                      >
                        <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approval Tab */}
            <TabsContent value="approval" className="space-y-4">
              {workflow ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Changes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Review and approve or reject each suggested change
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {workflow.changes.map((change) => (
                          <div
                            key={change.id}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{change.type}</Badge>
                                  <Badge variant={getImpactColor(change.impact)}>
                                    {change.impact} impact
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {change.confidence}% confidence
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{change.reason}</p>
                              </div>
                              <div className="flex space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={decisions[change.id] === true ? 'default' : 'outline'}
                                        onClick={() => handleChangeApproval(change.id, true)}
                                      >
                                        <ThumbsUp className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={decisions[change.id] === false ? 'destructive' : 'outline'}
                                        onClick={() => handleChangeApproval(change.id, false)}
                                      >
                                        <ThumbsDown className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                                <p className="text-xs text-muted-foreground mb-1">Original:</p>
                                <p className="text-sm">{change.original}</p>
                              </div>
                              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                                <p className="text-xs text-muted-foreground mb-1">Suggested:</p>
                                <p className="text-sm">{change.suggested}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button onClick={submitApprovals}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Submit Decisions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No changes to review</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
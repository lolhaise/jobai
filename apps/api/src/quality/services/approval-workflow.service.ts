import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Interface for approval workflow
interface ApprovalWorkflow {
  id: string;
  userId: string;
  documentId: string;
  documentType: 'resume' | 'cover_letter';
  originalContent: string;
  modifiedContent: string;
  changes: Change[];
  status: 'pending' | 'partially_approved' | 'approved' | 'rejected';
  approvedChanges: string[];
  rejectedChanges: string[];
  userFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// Interface for individual changes
interface Change {
  id: string;
  type: 'addition' | 'deletion' | 'modification' | 'reorder';
  category: string;
  original: string;
  suggested: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  position: {
    start: number;
    end: number;
    section?: string;
  };
  confidence: number; // 0-100
  approved?: boolean;
  userNote?: string;
}

// Interface for approval decision
interface ApprovalDecision {
  changeId: string;
  approved: boolean;
  userNote?: string;
}

// Interface for A/B test variant
interface ABTestVariant {
  id: string;
  testId: string;
  name: string;
  content: string;
  metrics: {
    views: number;
    approvals: number;
    rejections: number;
    avgTimeToDecision: number;
    conversionRate?: number;
  };
  isControl: boolean;
}

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  // Create a new approval workflow
  async createWorkflow(
    userId: string,
    documentId: string,
    documentType: 'resume' | 'cover_letter',
    originalContent: string,
    modifiedContent: string,
    changes: Omit<Change, 'id'>[]
  ): Promise<ApprovalWorkflow> {
    // Generate IDs for changes
    const changesWithIds: Change[] = changes.map((change, index) => ({
      ...change,
      id: `change_${documentId}_${index}`,
      approved: undefined
    }));
    
    // Create workflow record
    const workflow = await this.prisma.approvalWorkflow.create({
      data: {
        userId,
        documentId,
        documentType,
        originalContent,
        modifiedContent,
        changes: JSON.stringify(changesWithIds),
        status: 'pending',
        approvedChanges: [],
        rejectedChanges: [],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
    
    // Emit event for tracking
    this.eventEmitter.emit('workflow.created', {
      workflowId: workflow.id,
      userId,
      documentType,
      changesCount: changesWithIds.length
    });
    
    return {
      ...workflow,
      changes: changesWithIds
    };
  }

  // Get workflow by ID
  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { id: workflowId }
    });
    
    if (!workflow) return null;
    
    return {
      ...workflow,
      changes: JSON.parse(workflow.changes as string)
    };
  }

  // Submit approval decisions
  async submitApprovals(
    workflowId: string,
    decisions: ApprovalDecision[],
    userFeedback?: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Update changes with decisions
    const updatedChanges = workflow.changes.map(change => {
      const decision = decisions.find(d => d.changeId === change.id);
      if (decision) {
        return {
          ...change,
          approved: decision.approved,
          userNote: decision.userNote
        };
      }
      return change;
    });
    
    // Categorize changes
    const approvedChanges = updatedChanges
      .filter(c => c.approved === true)
      .map(c => c.id);
    
    const rejectedChanges = updatedChanges
      .filter(c => c.approved === false)
      .map(c => c.id);
    
    // Determine overall status
    let status: 'pending' | 'partially_approved' | 'approved' | 'rejected';
    if (approvedChanges.length === updatedChanges.length) {
      status = 'approved';
    } else if (rejectedChanges.length === updatedChanges.length) {
      status = 'rejected';
    } else if (approvedChanges.length > 0) {
      status = 'partially_approved';
    } else {
      status = 'pending';
    }
    
    // Update workflow
    const updated = await this.prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        changes: JSON.stringify(updatedChanges),
        approvedChanges,
        rejectedChanges,
        status,
        userFeedback
      }
    });
    
    // Emit event for tracking
    this.eventEmitter.emit('workflow.updated', {
      workflowId,
      status,
      approvedCount: approvedChanges.length,
      rejectedCount: rejectedChanges.length
    });
    
    // Apply approved changes if all approved
    if (status === 'approved' || status === 'partially_approved') {
      await this.applyApprovedChanges(workflowId);
    }
    
    return {
      ...updated,
      changes: updatedChanges
    };
  }

  // Apply only approved changes to document
  private async applyApprovedChanges(workflowId: string): Promise<string> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Get approved changes
    const approvedChanges = workflow.changes.filter(c => c.approved === true);
    
    // Sort changes by position (reverse order to maintain positions)
    approvedChanges.sort((a, b) => b.position.start - a.position.start);
    
    // Apply changes to content
    let finalContent = workflow.originalContent;
    
    for (const change of approvedChanges) {
      switch (change.type) {
        case 'deletion':
          finalContent = 
            finalContent.substring(0, change.position.start) +
            finalContent.substring(change.position.end);
          break;
        
        case 'addition':
          finalContent = 
            finalContent.substring(0, change.position.start) +
            change.suggested +
            finalContent.substring(change.position.start);
          break;
        
        case 'modification':
          finalContent = 
            finalContent.substring(0, change.position.start) +
            change.suggested +
            finalContent.substring(change.position.end);
          break;
        
        case 'reorder':
          // Handle section reordering separately
          finalContent = this.applyReorder(finalContent, change);
          break;
      }
    }
    
    // Save final version
    await this.prisma.document.update({
      where: { id: workflow.documentId },
      data: {
        content: finalContent,
        lastModified: new Date()
      }
    });
    
    return finalContent;
  }

  // Apply reorder changes
  private applyReorder(content: string, change: Change): string {
    // This would implement section reordering logic
    // For now, return content as-is
    return content;
  }

  // Get user's workflows
  async getUserWorkflows(
    userId: string,
    status?: string
  ): Promise<ApprovalWorkflow[]> {
    const workflows = await this.prisma.approvalWorkflow.findMany({
      where: {
        userId,
        ...(status && { status })
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return workflows.map(w => ({
      ...w,
      changes: JSON.parse(w.changes as string)
    }));
  }

  // Get workflow analytics
  async getWorkflowAnalytics(userId: string) {
    const workflows = await this.getUserWorkflows(userId);
    
    const totalWorkflows = workflows.length;
    const approvedWorkflows = workflows.filter(w => w.status === 'approved').length;
    const partiallyApprovedWorkflows = workflows.filter(w => w.status === 'partially_approved').length;
    const rejectedWorkflows = workflows.filter(w => w.status === 'rejected').length;
    const pendingWorkflows = workflows.filter(w => w.status === 'pending').length;
    
    // Calculate change-level analytics
    let totalChanges = 0;
    let approvedChanges = 0;
    let rejectedChanges = 0;
    const changesByCategory: Record<string, number> = {};
    const changesByType: Record<string, number> = {};
    
    for (const workflow of workflows) {
      totalChanges += workflow.changes.length;
      approvedChanges += workflow.approvedChanges.length;
      rejectedChanges += workflow.rejectedChanges.length;
      
      for (const change of workflow.changes) {
        changesByCategory[change.category] = (changesByCategory[change.category] || 0) + 1;
        changesByType[change.type] = (changesByType[change.type] || 0) + 1;
      }
    }
    
    return {
      summary: {
        totalWorkflows,
        approvedWorkflows,
        partiallyApprovedWorkflows,
        rejectedWorkflows,
        pendingWorkflows,
        approvalRate: totalWorkflows > 0 ? (approvedWorkflows / totalWorkflows) * 100 : 0
      },
      changes: {
        total: totalChanges,
        approved: approvedChanges,
        rejected: rejectedChanges,
        approvalRate: totalChanges > 0 ? (approvedChanges / totalChanges) * 100 : 0,
        byCategory: changesByCategory,
        byType: changesByType
      },
      trends: await this.calculateTrends(userId)
    };
  }

  // Calculate approval trends
  private async calculateTrends(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentWorkflows = await this.prisma.approvalWorkflow.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Group by day
    const dailyStats: Record<string, any> = {};
    
    for (const workflow of recentWorkflows) {
      const date = workflow.createdAt.toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          total: 0,
          approved: 0,
          rejected: 0
        };
      }
      
      dailyStats[date].total++;
      if (workflow.status === 'approved') dailyStats[date].approved++;
      if (workflow.status === 'rejected') dailyStats[date].rejected++;
    }
    
    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
      approvalRate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0
    }));
  }

  // Create A/B test for changes
  async createABTest(
    documentId: string,
    variants: Array<{
      name: string;
      content: string;
      isControl: boolean;
    }>
  ): Promise<string> {
    const testId = `ab_${documentId}_${Date.now()}`;
    
    // Create test variants
    const testVariants = await Promise.all(
      variants.map(variant => 
        this.prisma.aBTestVariant.create({
          data: {
            testId,
            name: variant.name,
            content: variant.content,
            isControl: variant.isControl,
            metrics: {
              views: 0,
              approvals: 0,
              rejections: 0,
              avgTimeToDecision: 0
            }
          }
        })
      )
    );
    
    // Create test record
    await this.prisma.aBTest.create({
      data: {
        id: testId,
        documentId,
        status: 'active',
        startDate: new Date(),
        variantIds: testVariants.map(v => v.id)
      }
    });
    
    return testId;
  }

  // Get random A/B test variant
  async getTestVariant(testId: string): Promise<ABTestVariant | null> {
    const test = await this.prisma.aBTest.findUnique({
      where: { id: testId }
    });
    
    if (!test || test.status !== 'active') return null;
    
    // Random selection (could be weighted)
    const variants = await this.prisma.aBTestVariant.findMany({
      where: { testId }
    });
    
    if (variants.length === 0) return null;
    
    const selected = variants[Math.floor(Math.random() * variants.length)];
    
    // Track view
    await this.prisma.aBTestVariant.update({
      where: { id: selected.id },
      data: {
        metrics: {
          ...selected.metrics,
          views: (selected.metrics as any).views + 1
        }
      }
    });
    
    return {
      ...selected,
      metrics: selected.metrics as any
    };
  }

  // Record A/B test result
  async recordTestResult(
    variantId: string,
    approved: boolean,
    timeToDecision: number
  ): Promise<void> {
    const variant = await this.prisma.aBTestVariant.findUnique({
      where: { id: variantId }
    });
    
    if (!variant) return;
    
    const metrics = variant.metrics as any;
    const currentAvg = metrics.avgTimeToDecision;
    const currentCount = metrics.approvals + metrics.rejections;
    
    // Update metrics
    await this.prisma.aBTestVariant.update({
      where: { id: variantId },
      data: {
        metrics: {
          ...metrics,
          approvals: approved ? metrics.approvals + 1 : metrics.approvals,
          rejections: approved ? metrics.rejections : metrics.rejections + 1,
          avgTimeToDecision: (currentAvg * currentCount + timeToDecision) / (currentCount + 1),
          conversionRate: approved 
            ? (metrics.approvals + 1) / metrics.views * 100
            : metrics.approvals / metrics.views * 100
        }
      }
    });
  }

  // Get A/B test results
  async getTestResults(testId: string) {
    const variants = await this.prisma.aBTestVariant.findMany({
      where: { testId },
      orderBy: { isControl: 'desc' }
    });
    
    if (variants.length === 0) return null;
    
    const control = variants.find(v => v.isControl);
    const treatments = variants.filter(v => !v.isControl);
    
    // Calculate statistical significance (simplified)
    const results = treatments.map(treatment => {
      const treatmentMetrics = treatment.metrics as any;
      const controlMetrics = control?.metrics as any || {};
      
      const improvement = controlMetrics.conversionRate 
        ? ((treatmentMetrics.conversionRate - controlMetrics.conversionRate) / controlMetrics.conversionRate) * 100
        : 0;
      
      return {
        variant: treatment.name,
        metrics: treatmentMetrics,
        improvement,
        isWinner: improvement > 10 // Simplified winner determination
      };
    });
    
    return {
      testId,
      control: control ? {
        name: control.name,
        metrics: control.metrics
      } : null,
      treatments: results,
      recommendation: results.find(r => r.isWinner)?.variant || 'Continue testing'
    };
  }
}
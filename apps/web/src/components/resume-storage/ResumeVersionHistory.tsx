'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
} from '@/components/ui/timeline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Clock,
  Download,
  Eye,
  Copy,
  ArrowLeftRight,
} from 'lucide-react';

interface ResumeVersion {
  id: string;
  version: number;
  title: string;
  versionNotes?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  isArchived: boolean;
  _count: {
    applications: number;
    tailoredResumes: number;
  };
}

interface VersionHistoryProps {
  resumeId: string;
  versions: ResumeVersion[];
  currentVersion: number;
  changelog?: string;
  onCompare?: (v1: string, v2: string) => void;
  onRestore?: (versionId: string) => void;
  onDownload?: (versionId: string) => void;
  onView?: (versionId: string) => void;
}

export function ResumeVersionHistory({
  resumeId,
  versions,
  currentVersion,
  changelog,
  onCompare,
  onRestore,
  onDownload,
  onView,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const handleSelectVersion = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompare) {
      onCompare(selectedVersions[0], selectedVersions[1]);
      setShowCompareDialog(false);
      setSelectedVersions([]);
    }
  };

  const getVersionIcon = (version: ResumeVersion, index: number) => {
    if (index === 0) return <GitCommit className="h-4 w-4" />;
    if (version.parentId && versions.some(v => v.parentId === version.id)) {
      return <GitBranch className="h-4 w-4" />;
    }
    if (version.versionNotes?.includes('Merged')) {
      return <GitMerge className="h-4 w-4" />;
    }
    return <GitCommit className="h-4 w-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Version History</CardTitle>
            <CardDescription>
              {versions.length} versions • Currently on v{currentVersion}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompareDialog(true)}
            disabled={versions.length < 2}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Compare Versions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Timeline>
          {versions.map((version, index) => (
            <TimelineItem key={version.id}>
              <TimelineConnector />
              <TimelineIcon>
                {getVersionIcon(version, index)}
              </TimelineIcon>
              <TimelineContent>
                <TimelineHeader>
                  <div className="flex items-center gap-2">
                    <TimelineTitle>
                      Version {version.version}: {version.title}
                    </TimelineTitle>
                    {version.version === currentVersion && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                    {version.isArchived && (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>
                </TimelineHeader>
                <TimelineDescription>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {version._count.applications > 0 && (
                        <span>{version._count.applications} applications</span>
                      )}
                      {version._count.tailoredResumes > 0 && (
                        <span>{version._count.tailoredResumes} tailored</span>
                      )}
                    </div>
                    
                    {version.versionNotes && (
                      <p className="text-sm">{version.versionNotes}</p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView?.(version.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {version.version !== currentVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore?.(version.id)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload?.(version.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </TimelineDescription>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>

        {changelog && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Changelog</h4>
            <pre className="text-xs whitespace-pre-wrap">{changelog}</pre>
          </div>
        )}
      </CardContent>

      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              Select two versions to compare their differences
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            {versions.map(version => (
              <div
                key={version.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedVersions.includes(version.id)
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectVersion(version.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Version {version.version}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(version.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {selectedVersions.includes(version.id) && (
                    <Badge>Selected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompareDialog(false);
                setSelectedVersions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompare}
              disabled={selectedVersions.length !== 2}
            >
              Compare Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
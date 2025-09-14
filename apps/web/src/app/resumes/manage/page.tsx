'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ResumeVersionHistory } from '@/components/resume-storage/ResumeVersionHistory';
import { ResumeTagManager } from '@/components/resume-storage/ResumeTagManager';
import { ResumeSharing } from '@/components/resume-storage/ResumeSharing';
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Download,
  Archive,
  Trash2,
  GitBranch,
  Clock,
  Tag,
  Share2,
  Eye,
  Copy,
  Plus,
  X,
} from 'lucide-react';

interface Resume {
  id: string;
  title: string;
  version: number;
  tags: string[];
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  viewCount: number;
  downloadCount: number;
  _count: {
    applications: number;
    tailoredResumes: number;
    shares: number;
  };
}

export default function ResumeManagementPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [userTags, setUserTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    fetchResumes();
    fetchUserTags();
  }, [session]);

  useEffect(() => {
    filterAndSortResumes();
  }, [resumes, searchQuery, selectedTags, showArchived, sortBy]);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes/storage/search', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes);
      }
    } catch (error) {
      toast({
        title: 'Error fetching resumes',
        description: 'Failed to load your resumes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTags = async () => {
    try {
      const response = await fetch('/api/resumes/storage/tags', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      
      if (response.ok) {
        const tags = await response.json();
        setUserTags(tags);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const filterAndSortResumes = () => {
    let filtered = [...resumes];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(resume =>
        resume.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resume.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(resume =>
        selectedTags.every(tag => resume.tags.includes(tag))
      );
    }
    
    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter(resume => !resume.isArchived);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    setFilteredResumes(filtered);
  };

  const handleArchive = async (resumeId: string, archive: boolean) => {
    try {
      const endpoint = archive ? 'archive' : 'unarchive';
      const response = await fetch(`/api/resumes/storage/${resumeId}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      
      if (response.ok) {
        toast({
          title: archive ? 'Resume archived' : 'Resume unarchived',
          description: `Resume has been ${archive ? 'archived' : 'unarchived'} successfully.`,
        });
        fetchResumes();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${archive ? 'archive' : 'unarchive'} resume.`,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTags = async (resumeId: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/resumes/storage/${resumeId}/tags`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });
      
      if (response.ok) {
        toast({
          title: 'Tags updated',
          description: 'Resume tags have been updated successfully.',
        });
        fetchResumes();
        fetchUserTags();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tags.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (resumeId: string, settings: any) => {
    const response = await fetch(`/api/resumes/storage/${resumeId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to share resume');
  };

  const ResumeCard = ({ resume }: { resume: Resume }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {resume.title}
              {resume.isDefault && (
                <Badge variant="secondary" className="text-xs">Default</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Version {resume.version} • {format(new Date(resume.updatedAt), 'MMM dd, yyyy')}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedResume(resume)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GitBranch className="h-4 w-4 mr-2" />
                Version History
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleArchive(resume.id, !resume.isArchived)}>
                <Archive className="h-4 w-4 mr-2" />
                {resume.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {resume._count.applications} applications
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {resume.viewCount} views
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {resume._count.shares} shares
          </span>
        </div>
        
        <ResumeTagManager
          resumeId={resume.id}
          currentTags={resume.tags}
          availableTags={userTags}
          onUpdateTags={(tags) => handleUpdateTags(resume.id, tags)}
        />
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <ResumeSharing
          resumeId={resume.id}
          resumeTitle={resume.title}
          onShare={(settings) => handleShare(resume.id, settings)}
        />
      </CardFooter>
    </Card>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Resume Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your resume versions, tags, and sharing settings
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resumes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Last Updated</SelectItem>
                    <SelectItem value="created">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant={showArchived ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {showArchived ? 'Hide' : 'Show'} Archived
                </Button>
              </div>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Resume
              </Button>
            </div>
          </CardHeader>
        </Card>

        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtering by:</span>
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
            >
              Clear all
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Resumes ({filteredResumes.length})
            </TabsTrigger>
            <TabsTrigger value="recent">
              Recently Used
            </TabsTrigger>
            <TabsTrigger value="shared">
              Shared
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredResumes.map(resume => (
                <ResumeCard key={resume.id} resume={resume} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="recent" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredResumes
                .filter(r => r.lastUsedAt)
                .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
                .slice(0, 6)
                .map(resume => (
                  <ResumeCard key={resume.id} resume={resume} />
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="shared" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredResumes
                .filter(r => r._count.shares > 0)
                .map(resume => (
                  <ResumeCard key={resume.id} resume={resume} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  Building,
  Briefcase,
  Download,
  Eye,
  Trash2,
  Star,
  TrendingUp,
  Clock,
  Filter
} from 'lucide-react';
import { CoverLetterGenerator } from '@/components/cover-letter/CoverLetterGenerator';

// Cover letter interface
interface CoverLetter {
  id: string;
  content: string;
  metadata: {
    tone: string;
    length: string;
    template: string;
    qualityScore: number;
  };
  resume: {
    id: string;
    title: string;
  };
  job: {
    id: string;
    title: string;
    company: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CoverLettersPage() {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [filteredLetters, setFilteredLetters] = useState<CoverLetter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<CoverLetter | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgScore: 0,
    thisWeek: 0,
    templates: new Set<string>()
  });

  // Mock data for demo
  const mockResume = { id: 'resume1', title: 'Software Engineer Resume' };
  const mockJob = { 
    id: 'job1', 
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.'
  };

  useEffect(() => {
    fetchCoverLetters();
  }, []);

  useEffect(() => {
    // Filter letters based on search
    const filtered = coverLetters.filter(letter =>
      letter.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.resume.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLetters(filtered);

    // Calculate stats
    const avgScore = coverLetters.reduce((sum, l) => 
      sum + (l.metadata?.qualityScore || 0), 0) / (coverLetters.length || 1);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = coverLetters.filter(l => 
      new Date(l.createdAt) > weekAgo
    ).length;

    const templates = new Set(coverLetters.map(l => 
      l.metadata?.template || 'standard'
    ));

    setStats({
      total: coverLetters.length,
      avgScore: Math.round(avgScore),
      thisWeek,
      templates
    });
  }, [coverLetters, searchQuery]);

  const fetchCoverLetters = async () => {
    try {
      const response = await fetch('/api/cover-letters');
      if (response.ok) {
        const data = await response.json();
        setCoverLetters(data);
      }
    } catch (error) {
      console.error('Failed to fetch cover letters:', error);
      // Use mock data for demo
      setCoverLetters([
        {
          id: '1',
          content: 'Dear Hiring Manager...',
          metadata: {
            tone: 'professional',
            length: 'medium',
            template: 'standard',
            qualityScore: 85
          },
          resume: mockResume,
          job: mockJob,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCoverLetter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;

    try {
      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCoverLetters(prev => prev.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete cover letter:', error);
    }
  };

  const exportCoverLetter = (letter: CoverLetter, format: 'pdf' | 'docx' | 'txt') => {
    const blob = new Blob([letter.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${letter.job.company}-${letter.job.title}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      professional: 'bg-blue-100 text-blue-800',
      enthusiastic: 'bg-orange-100 text-orange-800',
      confident: 'bg-purple-100 text-purple-800',
      conversational: 'bg-green-100 text-green-800',
      formal: 'bg-gray-100 text-gray-800'
    };
    return colors[tone] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cover Letters</h1>
        <p className="text-gray-600">
          AI-powered cover letters tailored for each application
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Letters</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Quality</p>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates Used</p>
                <p className="text-2xl font-bold">{stats.templates.size}</p>
              </div>
              <Filter className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Cover Letter
        </Button>
      </div>

      {/* Cover Letters Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cover letters...</p>
        </div>
      ) : filteredLetters.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No cover letters yet</h3>
          <p className="text-gray-600 mb-4">
            Generate your first AI-powered cover letter to get started
          </p>
          <Button onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Your First Cover Letter
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLetters.map(letter => (
            <Card key={letter.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {letter.job.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building className="h-3 w-3" />
                      {letter.job.company}
                    </CardDescription>
                  </div>
                  <Badge className={getToneColor(letter.metadata?.tone || 'professional')}>
                    {letter.metadata?.tone || 'professional'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Quality Score */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className={`font-medium ${getScoreColor(letter.metadata?.qualityScore || 0)}`}>
                      {letter.metadata?.qualityScore || 0}% Quality
                    </span>
                  </div>
                  <Badge variant="outline">
                    {letter.metadata?.length || 'medium'}
                  </Badge>
                </div>

                {/* Resume Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Briefcase className="h-3 w-3" />
                  {letter.resume.title}
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock className="h-3 w-3" />
                  {new Date(letter.createdAt).toLocaleDateString()}
                </div>

                {/* Preview */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {letter.content.substring(0, 150)}...
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedLetter(letter)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCoverLetter(letter, 'pdf')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCoverLetter(letter.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] overflow-y-auto">
            <CoverLetterGenerator
              resumeId={mockResume.id}
              jobId={mockJob.id}
              jobTitle={mockJob.title}
              companyName={mockJob.company}
              onClose={() => {
                setShowGenerator(false);
                fetchCoverLetters();
              }}
            />
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedLetter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedLetter.job.title}</CardTitle>
                  <CardDescription>{selectedLetter.job.company}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedLetter(null)}
                >
                  <span className="text-xl">×</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">
                {selectedLetter.content}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportCoverLetter(selectedLetter, 'pdf')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportCoverLetter(selectedLetter, 'docx')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export DOCX
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
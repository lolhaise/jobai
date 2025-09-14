'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Target,
  Briefcase,
  Building,
  Zap,
  BookOpen,
  Settings,
  Copy,
  Save,
  Trash2,
  ChevronRight
} from 'lucide-react';

// Cover letter tone options
enum CoverLetterTone {
  PROFESSIONAL = 'professional',
  ENTHUSIASTIC = 'enthusiastic',
  CONFIDENT = 'confident',
  CONVERSATIONAL = 'conversational',
  FORMAL = 'formal'
}

// Cover letter length options
enum CoverLetterLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long'
}

// Template interface
interface Template {
  id: string;
  name: string;
  description: string;
  tone: CoverLetterTone;
  industry?: string;
}

// Company research interface
interface CompanyResearch {
  name: string;
  industry?: string;
  mission?: string;
  values?: string[];
  recentNews?: string[];
  culture?: string;
}

// Cover letter interface
interface CoverLetter {
  id: string;
  content: string;
  qualityScore: number;
  template: string;
  tone: CoverLetterTone;
  length: number;
  suggestions: string[];
}

interface CoverLetterGeneratorProps {
  resumeId: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  onClose?: () => void;
}

export function CoverLetterGenerator({
  resumeId,
  jobId,
  jobTitle,
  companyName,
  onClose
}: CoverLetterGeneratorProps) {
  // State management
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [tone, setTone] = useState<CoverLetterTone>(CoverLetterTone.PROFESSIONAL);
  const [length, setLength] = useState<CoverLetterLength>(CoverLetterLength.MEDIUM);
  const [emphasizeSkills, setEmphasizeSkills] = useState<string[]>([]);
  const [includeAchievements, setIncludeAchievements] = useState(true);
  const [companyResearch, setCompanyResearch] = useState<CompanyResearch | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [activeTab, setActiveTab] = useState('generate');

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch available templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/cover-letters/templates/list');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  // Generate cover letter
  const generateCoverLetter = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/cover-letters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          jobId,
          tone,
          length,
          template: selectedTemplate,
          emphasizeSkills,
          includeAchievements,
          companyResearch
        })
      });

      if (!response.ok) throw new Error('Failed to generate cover letter');
      
      const data = await response.json();
      setCoverLetter(data);
      setEditedContent(data.content);
      setActiveTab('preview');
    } catch (error) {
      console.error('Cover letter generation error:', error);
      alert('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Research company
  const researchCompany = async () => {
    if (!companyName) return;
    
    try {
      // Simulate company research (in real app, would call API)
      setCompanyResearch({
        name: companyName,
        industry: 'Technology',
        mission: 'To innovate and transform the digital landscape',
        values: ['Innovation', 'Collaboration', 'Excellence', 'Integrity'],
        recentNews: ['Launched new AI product', 'Expanded to European markets'],
        culture: 'Fast-paced, innovative, and collaborative'
      });
    } catch (error) {
      console.error('Company research error:', error);
    }
  };

  // Adjust tone of existing cover letter
  const adjustTone = async (newTone: CoverLetterTone) => {
    if (!coverLetter) return;
    
    try {
      const response = await fetch('/api/cover-letters/adjust-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterId: coverLetter.id,
          newTone
        })
      });

      if (!response.ok) throw new Error('Failed to adjust tone');
      
      const data = await response.json();
      setCoverLetter({
        ...coverLetter,
        content: data.coverLetter.content,
        tone: newTone
      });
      setEditedContent(data.coverLetter.content);
      setTone(newTone);
    } catch (error) {
      console.error('Tone adjustment error:', error);
    }
  };

  // Optimize length
  const optimizeLength = async (targetLength: CoverLetterLength) => {
    if (!coverLetter) return;
    
    try {
      const response = await fetch('/api/cover-letters/optimize-length', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterId: coverLetter.id,
          targetLength
        })
      });

      if (!response.ok) throw new Error('Failed to optimize length');
      
      const data = await response.json();
      setCoverLetter({
        ...coverLetter,
        content: data.content
      });
      setEditedContent(data.content);
      setLength(targetLength);
    } catch (error) {
      console.error('Length optimization error:', error);
    }
  };

  // Save edited cover letter
  const saveEdited = async () => {
    if (!coverLetter) return;
    
    try {
      const response = await fetch(`/api/cover-letters/${coverLetter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent
        })
      });

      if (!response.ok) throw new Error('Failed to save changes');
      
      setCoverLetter({
        ...coverLetter,
        content: editedContent
      });
      setEditMode(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Export cover letter
  const exportCoverLetter = (format: 'pdf' | 'docx' | 'txt') => {
    if (!coverLetter) return;
    
    // Create blob based on format
    const blob = new Blob([coverLetter.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${jobTitle || 'document'}.${format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter.content);
    alert('Cover letter copied to clipboard!');
  };

  // Get tone color
  const getToneColor = (t: CoverLetterTone) => {
    const colors = {
      [CoverLetterTone.PROFESSIONAL]: 'bg-blue-100 text-blue-800',
      [CoverLetterTone.ENTHUSIASTIC]: 'bg-orange-100 text-orange-800',
      [CoverLetterTone.CONFIDENT]: 'bg-purple-100 text-purple-800',
      [CoverLetterTone.CONVERSATIONAL]: 'bg-green-100 text-green-800',
      [CoverLetterTone.FORMAL]: 'bg-gray-100 text-gray-800'
    };
    return colors[t] || 'bg-gray-100 text-gray-800';
  };

  // Get length target
  const getLengthTarget = (l: CoverLetterLength) => {
    const targets = {
      [CoverLetterLength.SHORT]: '~200 words',
      [CoverLetterLength.MEDIUM]: '~350 words',
      [CoverLetterLength.LONG]: '~500 words'
    };
    return targets[l];
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cover Letter Generator
            </CardTitle>
            <CardDescription>
              Create a tailored cover letter for {jobTitle} at {companyName}
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <span className="text-xl">×</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!coverLetter}>
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="optimize" disabled={!coverLetter}>
              <Settings className="h-4 w-4 mr-2" />
              Optimize
            </TabsTrigger>
          </TabsList>

          {/* Generation Tab */}
          <TabsContent value="generate" className="space-y-6">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-gray-500">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone Selection */}
            <div>
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.values(CoverLetterTone).map(t => (
                  <Button
                    key={t}
                    variant={tone === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTone(t)}
                    className="capitalize"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {/* Length Selection */}
            <div>
              <Label>Length</Label>
              <div className="flex gap-4 mt-2">
                {Object.values(CoverLetterLength).map(l => (
                  <Card
                    key={l}
                    className={`flex-1 p-3 cursor-pointer border-2 ${
                      length === l ? 'border-primary' : 'border-gray-200'
                    }`}
                    onClick={() => setLength(l)}
                  >
                    <div className="text-center">
                      <div className="font-medium capitalize">{l}</div>
                      <div className="text-sm text-gray-500">{getLengthTarget(l)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Company Research */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Company Research</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={researchCompany}
                  disabled={!companyName}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Research {companyName}
                </Button>
              </div>
              {companyResearch && (
                <Card className="p-3 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Industry:</span> {companyResearch.industry}
                    </div>
                    <div>
                      <span className="font-medium">Mission:</span> {companyResearch.mission}
                    </div>
                    <div>
                      <span className="font-medium">Values:</span>{' '}
                      {companyResearch.values?.join(', ')}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="achievements"
                  checked={includeAchievements}
                  onCheckedChange={(checked) => setIncludeAchievements(checked as boolean)}
                />
                <Label htmlFor="achievements">Include quantified achievements</Label>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={generateCoverLetter}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {coverLetter && (
              <>
                {/* Quality Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <Label>Quality Score</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={coverLetter.qualityScore} className="w-24" />
                        <span className="font-medium">{coverLetter.qualityScore}%</span>
                      </div>
                    </div>
                    <Badge className={getToneColor(coverLetter.tone)}>
                      {coverLetter.tone}
                    </Badge>
                    <Badge variant="outline">{coverLetter.length} words</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? 'Cancel Edit' : 'Edit'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                {editMode ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <Button onClick={saveEdited} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Card className="p-6 bg-white">
                    <div className="prose max-w-none whitespace-pre-wrap">
                      {coverLetter.content}
                    </div>
                  </Card>
                )}

                {/* Suggestions */}
                {coverLetter.suggestions.length > 0 && (
                  <div>
                    <Label>AI Suggestions</Label>
                    <div className="space-y-2 mt-2">
                      {coverLetter.suggestions.map((suggestion, index) => (
                        <Alert key={index}>
                          <Zap className="h-4 w-4" />
                          <AlertDescription>{suggestion}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Options */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => exportCoverLetter('pdf')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export as PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => exportCoverLetter('docx')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export as DOCX
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => exportCoverLetter('txt')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export as TXT
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-6">
            {coverLetter && (
              <>
                {/* Tone Adjustment */}
                <div>
                  <Label>Adjust Tone</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Change the tone while keeping the content intact
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(CoverLetterTone).map(t => (
                      <Button
                        key={t}
                        variant={tone === t ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => adjustTone(t)}
                        className="capitalize"
                        disabled={tone === t}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Length Optimization */}
                <div>
                  <Label>Optimize Length</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Expand or condense while maintaining key points
                  </p>
                  <div className="flex gap-4">
                    {Object.values(CoverLetterLength).map(l => (
                      <Card
                        key={l}
                        className={`flex-1 p-3 cursor-pointer border-2 ${
                          length === l ? 'border-primary' : 'border-gray-200'
                        }`}
                        onClick={() => optimizeLength(l)}
                      >
                        <div className="text-center">
                          <div className="font-medium capitalize">{l}</div>
                          <div className="text-sm text-gray-500">{getLengthTarget(l)}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Regenerate */}
                <div>
                  <Label>Regenerate</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Generate a completely new version with the same settings
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generateCoverLetter}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Version
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
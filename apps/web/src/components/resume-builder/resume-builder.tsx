'use client';

import React, { useState, useEffect } from 'react';
import { ResumeTemplate, ResumeBuilderInput, SectionType } from '@jobai/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, Save, Palette } from 'lucide-react';
import { ResumeEditor } from './resume-editor';
import { ResumePreview } from './resume-preview';
import { TemplateSelector } from './template-selector';
import { ExportDialog } from './export-dialog';
import { useToast } from '@/hooks/use-toast';

interface ResumeBuilderProps {
  templates: ResumeTemplate[];
  initialData?: ResumeBuilderInput;
  onSave?: (data: ResumeBuilderInput) => Promise<void>;
  onExport?: (data: ResumeBuilderInput, format: 'PDF' | 'DOCX') => Promise<void>;
}

export function ResumeBuilder({ templates, initialData, onSave, onExport }: ResumeBuilderProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(templates[0]);
  const [resumeData, setResumeData] = useState<ResumeBuilderInput>(
    initialData || {
      templateId: templates[0]?.id || '',
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: '',
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      customSections: [],
    }
  );
  
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Update template when selection changes
  useEffect(() => {
    if (selectedTemplate) {
      setResumeData(prev => ({
        ...prev,
        templateId: selectedTemplate.id,
      }));
    }
  }, [selectedTemplate]);

  const handleDataChange = (newData: Partial<ResumeBuilderInput>) => {
    setResumeData(prev => ({ ...prev, ...newData }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(resumeData);
      toast({
        title: 'Resume saved successfully',
        description: 'Your resume has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error saving resume',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'PDF' | 'DOCX') => {
    if (!onExport) return;
    
    try {
      await onExport(resumeData, format);
      toast({
        title: `Resume exported as ${format}`,
        description: 'Your resume has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold">Resume Builder</h1>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{selectedTemplate.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateSelector(true)}
            >
              <Palette className="h-4 w-4 mr-2" />
              Change Template
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full flex flex-col">
          <TabsList className="w-full justify-center border-b rounded-none h-10">
            <TabsTrigger value="editor" className="flex-1">
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="editor" className="h-full m-0 border-0 p-0">
              <ResumeEditor
                template={selectedTemplate}
                data={resumeData}
                onChange={handleDataChange}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="h-full m-0 border-0 p-0">
              <ResumePreview
                template={selectedTemplate}
                data={resumeData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Dialogs */}
      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
      />
      
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        resumeData={resumeData}
      />
    </div>
  );
}
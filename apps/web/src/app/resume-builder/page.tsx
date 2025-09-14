'use client';

import React, { useState, useEffect } from 'react';
import { ResumeTemplate, ResumeBuilderInput } from '@jobai/shared';
import { ResumeBuilder } from '@/components/resume-builder/resume-builder';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Mock templates - in real app, these would come from API
const mockTemplates: ResumeTemplate[] = [
  {
    id: 'modern-1',
    name: 'Modern Professional',
    category: 'MODERN' as any,
    preview: '/templates/modern-1.png',
    structure: [
      { id: 'contact', type: 'CONTACT' as any, title: 'Contact Information', isRequired: true, isVisible: true, order: 1, content: {} },
      { id: 'summary', type: 'SUMMARY' as any, title: 'Professional Summary', isRequired: false, isVisible: true, order: 2, content: {} },
      { id: 'experience', type: 'EXPERIENCE' as any, title: 'Professional Experience', isRequired: true, isVisible: true, order: 3, content: {} },
      { id: 'skills', type: 'SKILLS' as any, title: 'Technical Skills', isRequired: true, isVisible: true, order: 4, content: {} },
      { id: 'education', type: 'EDUCATION' as any, title: 'Education', isRequired: true, isVisible: true, order: 5, content: {} },
      { id: 'certifications', type: 'CERTIFICATIONS' as any, title: 'Certifications', isRequired: false, isVisible: true, order: 6, content: {} },
    ],
    styles: {
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'Inter',
      fontSize: 11,
      lineHeight: 1.4,
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      spacing: { section: 16, item: 8 }
    },
    isPremium: false
  },
  {
    id: 'classic-1',
    name: 'Classic Traditional',
    category: 'CLASSIC' as any,
    preview: '/templates/classic-1.png',
    structure: [
      { id: 'contact', type: 'CONTACT' as any, title: 'Contact Information', isRequired: true, isVisible: true, order: 1, content: {} },
      { id: 'summary', type: 'SUMMARY' as any, title: 'Objective', isRequired: false, isVisible: true, order: 2, content: {} },
      { id: 'education', type: 'EDUCATION' as any, title: 'Education', isRequired: true, isVisible: true, order: 3, content: {} },
      { id: 'experience', type: 'EXPERIENCE' as any, title: 'Work Experience', isRequired: true, isVisible: true, order: 4, content: {} },
      { id: 'skills', type: 'SKILLS' as any, title: 'Skills', isRequired: true, isVisible: true, order: 5, content: {} },
      { id: 'references', type: 'REFERENCES' as any, title: 'References', isRequired: false, isVisible: false, order: 6, content: {} },
    ],
    styles: {
      primaryColor: '#1f2937',
      secondaryColor: '#6b7280',
      fontFamily: 'Times New Roman',
      fontSize: 11,
      lineHeight: 1.3,
      margins: { top: 25, bottom: 25, left: 25, right: 25 },
      spacing: { section: 18, item: 6 }
    },
    isPremium: false
  },
  {
    id: 'technical-1',
    name: 'Technical Focus',
    category: 'TECHNICAL' as any,
    preview: '/templates/technical-1.png',
    structure: [
      { id: 'contact', type: 'CONTACT' as any, title: 'Contact', isRequired: true, isVisible: true, order: 1, content: {} },
      { id: 'summary', type: 'SUMMARY' as any, title: 'Technical Summary', isRequired: false, isVisible: true, order: 2, content: {} },
      { id: 'skills', type: 'SKILLS' as any, title: 'Technical Skills', isRequired: true, isVisible: true, order: 3, content: {} },
      { id: 'experience', type: 'EXPERIENCE' as any, title: 'Professional Experience', isRequired: true, isVisible: true, order: 4, content: {} },
      { id: 'projects', type: 'PROJECTS' as any, title: 'Key Projects', isRequired: false, isVisible: true, order: 5, content: {} },
      { id: 'certifications', type: 'CERTIFICATIONS' as any, title: 'Certifications', isRequired: false, isVisible: true, order: 6, content: {} },
      { id: 'education', type: 'EDUCATION' as any, title: 'Education', isRequired: true, isVisible: true, order: 7, content: {} },
    ],
    styles: {
      primaryColor: '#059669',
      secondaryColor: '#6b7280',
      fontFamily: 'JetBrains Mono',
      fontSize: 10,
      lineHeight: 1.5,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
      spacing: { section: 12, item: 6 }
    },
    isPremium: false
  },
  {
    id: 'creative-1',
    name: 'Creative Design',
    category: 'CREATIVE' as any,
    preview: '/templates/creative-1.png',
    structure: [
      { id: 'contact', type: 'CONTACT' as any, title: 'Contact', isRequired: true, isVisible: true, order: 1, content: {} },
      { id: 'summary', type: 'SUMMARY' as any, title: 'Creative Profile', isRequired: false, isVisible: true, order: 2, content: {} },
      { id: 'experience', type: 'EXPERIENCE' as any, title: 'Experience', isRequired: true, isVisible: true, order: 3, content: {} },
      { id: 'projects', type: 'PROJECTS' as any, title: 'Portfolio', isRequired: false, isVisible: true, order: 4, content: {} },
      { id: 'skills', type: 'SKILLS' as any, title: 'Skills & Tools', isRequired: true, isVisible: true, order: 5, content: {} },
      { id: 'education', type: 'EDUCATION' as any, title: 'Education', isRequired: true, isVisible: true, order: 6, content: {} },
      { id: 'awards', type: 'AWARDS' as any, title: 'Awards & Recognition', isRequired: false, isVisible: false, order: 7, content: {} },
    ],
    styles: {
      primaryColor: '#dc2626',
      secondaryColor: '#7c3aed',
      fontFamily: 'Poppins',
      fontSize: 11,
      lineHeight: 1.6,
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      spacing: { section: 20, item: 10 }
    },
    isPremium: true
  }
];

export default function ResumeBuilderPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // In real app, fetch from API:
        // const response = await fetch('/api/resume-templates');
        // const data = await response.json();
        
        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setTemplates(mockTemplates);
      } catch (error) {
        toast({
          title: 'Error loading templates',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [toast]);

  const handleSave = async (data: ResumeBuilderInput) => {
    try {
      // In real app, save to API:
      // const response = await fetch('/api/resumes/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ templateId: data.templateId, ...data })
      // });
      // 
      // if (!response.ok) throw new Error('Save failed');
      
      // For now, just log the data
      console.log('Saving resume data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Resume saved successfully',
        description: 'Your resume has been saved to your account.',
      });
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const handleExport = async (data: ResumeBuilderInput, format: 'PDF' | 'DOCX') => {
    try {
      // In real app, export via API:
      // const response = await fetch('/api/resumes/export', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ templateId: data.templateId, resumeData: data, format })
      // });
      // 
      // if (!response.ok) throw new Error('Export failed');
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${data.personalInfo.name || 'Resume'}.${format.toLowerCase()}`;
      // a.click();
      
      // For now, just simulate the export
      console.log('Exporting resume:', { data, format });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: `Resume exported as ${format}`,
        description: 'Your resume has been downloaded.',
      });
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading resume builder...</p>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No templates available</p>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <ResumeBuilder
        templates={templates}
        onSave={handleSave}
        onExport={handleExport}
      />
    </div>
  );
}
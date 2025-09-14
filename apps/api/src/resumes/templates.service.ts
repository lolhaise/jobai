import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@jobai/database';
import { ResumeTemplate, TemplateCategory, ResumeBuilderInput } from '@jobai/shared';

const prisma = new PrismaClient();

@Injectable()
export class TemplatesService {
  private defaultTemplates: ResumeTemplate[] = [
    {
      id: 'modern-1',
      name: 'Modern Professional',
      category: TemplateCategory.MODERN,
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
      category: TemplateCategory.CLASSIC,
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
      category: TemplateCategory.TECHNICAL,
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
      category: TemplateCategory.CREATIVE,
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

  async getTemplates(): Promise<ResumeTemplate[]> {
    return this.defaultTemplates;
  }

  async getTemplate(id: string): Promise<ResumeTemplate> {
    const template = this.defaultTemplates.find(t => t.id === id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async generateResume(userId: string, templateId: string, resumeData: ResumeBuilderInput): Promise<any> {
    const template = await this.getTemplate(templateId);
    
    // Create the resume data object without templateId for now (until schema is updated)
    const resumeDataForDb = {
      userId,
      title: resumeData.personalInfo.name + "'s Resume",
      originalFileName: `${resumeData.personalInfo.name}-Resume.pdf`,
      fileFormat: 'PDF' as const,
      originalFileUrl: '',
      summary: resumeData.summary || '',
      experience: resumeData.experience as any[],
      education: resumeData.education as any[],
      skills: resumeData.skills,
      certifications: resumeData.certifications?.map(cert => ({ name: cert.name })) || [],
      languages: resumeData.languages?.map(lang => ({ name: lang.language })) || [],
      keywords: resumeData.skills,
      isDefault: false,
      // Note: templateId and builderData will be added after schema migration
    };
    
    // Save the generated resume to database
    const resume = await prisma.resume.create({
      data: resumeDataForDb,
    });

    return {
      id: resume.id,
      title: resume.title,
      templateId,
      template: template.name,
      createdAt: resume.createdAt,
    };
  }

  async exportResume(userId: string, templateId: string, resumeData: ResumeBuilderInput, format: 'PDF' | 'DOCX', options?: any): Promise<any> {
    const template = await this.getTemplate(templateId);
    
    // This would integrate with PDF/DOCX generation libraries
    // For now, return metadata about the export
    return {
      templateId,
      template: template.name,
      format,
      fileName: `${resumeData.personalInfo.name}-Resume.${format.toLowerCase()}`,
      downloadUrl: `/api/resumes/download/${userId}/${templateId}`, // Placeholder URL
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }
}
'use client';

import React from 'react';
import { ResumeTemplate, ResumeBuilderInput } from '@jobai/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalInfoSection } from './sections/personal-info-section';
import { SummarySection } from './sections/summary-section';
import { ExperienceSection } from './sections/experience-section';
import { EducationSection } from './sections/education-section';
import { SkillsSection } from './sections/skills-section';
import { ProjectsSection } from './sections/projects-section';
import { CertificationsSection } from './sections/certifications-section';
import { LanguagesSection } from './sections/languages-section';

interface ResumeEditorProps {
  template: ResumeTemplate;
  data: ResumeBuilderInput;
  onChange: (data: Partial<ResumeBuilderInput>) => void;
}

export function ResumeEditor({ template, data, onChange }: ResumeEditorProps) {
  const handleSectionChange = (sectionKey: keyof ResumeBuilderInput, value: any) => {
    onChange({ [sectionKey]: value });
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Personal Information</span>
                  <span className="text-sm font-normal text-muted-foreground">(Required)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalInfoSection
                  data={data.personalInfo}
                  onChange={(personalInfo) => handleSectionChange('personalInfo', personalInfo)}
                />
              </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Professional Summary</span>
                  <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SummarySection
                  data={data.summary || ''}
                  onChange={(summary) => handleSectionChange('summary', summary)}
                />
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Work Experience</span>
                  <span className="text-sm font-normal text-muted-foreground">(Recommended)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExperienceSection
                  data={data.experience}
                  onChange={(experience) => handleSectionChange('experience', experience)}
                />
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Education</span>
                  <span className="text-sm font-normal text-muted-foreground">(Recommended)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EducationSection
                  data={data.education}
                  onChange={(education) => handleSectionChange('education', education)}
                />
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Skills</span>
                  <span className="text-sm font-normal text-muted-foreground">(Recommended)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillsSection
                  data={data.skills}
                  onChange={(skills) => handleSectionChange('skills', skills)}
                />
              </CardContent>
            </Card>

            {/* Projects */}
            {template.structure.some(s => s.type === 'PROJECTS') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Projects</span>
                    <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectsSection
                    data={data.projects}
                    onChange={(projects) => handleSectionChange('projects', projects)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Certifications</span>
                  <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CertificationsSection
                  data={data.certifications}
                  onChange={(certifications) => handleSectionChange('certifications', certifications)}
                />
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Languages</span>
                  <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LanguagesSection
                  data={data.languages}
                  onChange={(languages) => handleSectionChange('languages', languages)}
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
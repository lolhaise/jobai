'use client';

import React from 'react';
import { ResumeTemplate, ResumeBuilderInput } from '@jobai/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar } from 'lucide-react';

interface ResumePreviewProps {
  template: ResumeTemplate;
  data: ResumeBuilderInput;
}

export function ResumePreview({ template, data }: ResumePreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const formatDateRange = (startDate?: string, endDate?: string, current?: boolean) => {
    const start = startDate ? formatDate(startDate) : '';
    const end = current ? 'Present' : (endDate ? formatDate(endDate) : '');
    
    if (!start && !end) return '';
    if (!start) return end;
    if (!end) return start;
    
    return `${start} - ${end}`;
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <ScrollArea className="h-full">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Resume Container */}
          <div 
            className="bg-white dark:bg-gray-800 shadow-lg min-h-[11in] w-full max-w-[8.5in] mx-auto"
            style={{
              fontFamily: template.styles.fontFamily,
              fontSize: `${template.styles.fontSize}px`,
              lineHeight: template.styles.lineHeight,
              padding: `${template.styles.margins.top}px ${template.styles.margins.right}px ${template.styles.margins.bottom}px ${template.styles.margins.left}px`
            }}
          >
            {/* Header / Personal Info */}
            <header className="mb-6">
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ color: template.styles.primaryColor }}
              >
                {data.personalInfo.name || 'Your Name'}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-sm" style={{ color: template.styles.secondaryColor }}>
                {data.personalInfo.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{data.personalInfo.email}</span>
                  </div>
                )}
                {data.personalInfo.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{data.personalInfo.phone}</span>
                  </div>
                )}
                {data.personalInfo.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{data.personalInfo.location}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm mt-2">
                {data.personalInfo.linkedin && (
                  <div className="flex items-center gap-1" style={{ color: template.styles.secondaryColor }}>
                    <Linkedin className="h-4 w-4" />
                    <span className="break-all">{data.personalInfo.linkedin}</span>
                  </div>
                )}
                {data.personalInfo.github && (
                  <div className="flex items-center gap-1" style={{ color: template.styles.secondaryColor }}>
                    <Github className="h-4 w-4" />
                    <span className="break-all">{data.personalInfo.github}</span>
                  </div>
                )}
                {data.personalInfo.website && (
                  <div className="flex items-center gap-1" style={{ color: template.styles.secondaryColor }}>
                    <Globe className="h-4 w-4" />
                    <span className="break-all">{data.personalInfo.website}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Professional Summary */}
            {data.summary && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-3 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Professional Summary
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.summary}
                </p>
              </section>
            )}

            {/* Work Experience */}
            {data.experience.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-4 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Professional Experience
                </h2>
                <div className="space-y-4">
                  {data.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {exp.position}
                          </h3>
                          <p 
                            className="font-medium"
                            style={{ color: template.styles.primaryColor }}
                          >
                            {exp.company}
                          </p>
                          {exp.location && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exp.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateRange(exp.startDate, exp.endDate, exp.current)}</span>
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          {exp.description}
                        </p>
                      )}
                      {exp.achievements.length > 0 && (
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                          {exp.achievements.map((achievement, i) => (
                            <li key={i}>{achievement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {data.skills.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-3 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Technical Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: template.styles.secondaryColor }}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-4 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Key Projects
                </h2>
                <div className="space-y-4">
                  {data.projects.map((project, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {project.name}
                          </h3>
                          {project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {project.technologies.map((tech, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {(project.startDate || project.endDate) && (
                          <div className="text-right text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateRange(project.startDate, project.endDate)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2">
                        {project.description}
                      </p>
                      {project.achievements.length > 0 && (
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                          {project.achievements.map((achievement, i) => (
                            <li key={i}>{achievement}</li>
                          ))}
                        </ul>
                      )}
                      {(project.url || project.githubUrl) && (
                        <div className="flex gap-4 text-sm mt-2" style={{ color: template.styles.primaryColor }}>
                          {project.url && <span>Live: {project.url}</span>}
                          {project.githubUrl && <span>Code: {project.githubUrl}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-4 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Education
                </h2>
                <div className="space-y-3">
                  {data.education.map((edu, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {edu.degree} {edu.field && `in ${edu.field}`}
                        </h3>
                        <p style={{ color: template.styles.primaryColor }}>
                          {edu.institution}
                        </p>
                        {(edu.gpa || edu.honors) && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {edu.gpa && `GPA: ${edu.gpa}`}
                            {edu.gpa && edu.honors && ' | '}
                            {edu.honors}
                          </p>
                        )}
                      </div>
                      {(edu.startDate || edu.endDate) && (
                        <div className="text-right text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateRange(edu.startDate, edu.endDate)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-4 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Certifications
                </h2>
                <div className="space-y-2">
                  {data.certifications.map((cert, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {cert.name}
                        </h3>
                        <p style={{ color: template.styles.primaryColor }}>
                          {cert.issuer}
                        </p>
                        {cert.credentialId && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {cert.credentialId}
                          </p>
                        )}
                      </div>
                      {cert.date && (
                        <div className="text-right text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(cert.date)}</span>
                          {cert.expiryDate && (
                            <span> - {formatDate(cert.expiryDate)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
              <section className="mb-6">
                <h2 
                  className="text-lg font-semibold mb-3 pb-1 border-b-2"
                  style={{ 
                    color: template.styles.primaryColor,
                    borderColor: template.styles.primaryColor
                  }}
                >
                  Languages
                </h2>
                <div className="flex flex-wrap gap-3">
                  {data.languages.map((lang, index) => (
                    <div key={index} className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{lang.language}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        ({lang.proficiency.charAt(0) + lang.proficiency.slice(1).toLowerCase()})
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
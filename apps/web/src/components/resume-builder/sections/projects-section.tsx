'use client';

import React, { useState } from 'react';
import { ProjectInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ProjectsSectionProps {
  data: ProjectInput[];
  onChange: (data: ProjectInput[]) => void;
}

export function ProjectsSection({ data, onChange }: ProjectsSectionProps) {
  const addProject = () => {
    const newProject: ProjectInput = {
      id: uuidv4(),
      name: '',
      description: '',
      technologies: [],
      startDate: '',
      endDate: '',
      url: '',
      githubUrl: '',
      achievements: []
    };
    onChange([...data, newProject]);
  };

  const updateProject = (index: number, field: keyof ProjectInput, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeProject = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addTechnology = (projectIndex: number, tech: string) => {
    const trimmedTech = tech.trim();
    if (trimmedTech && !data[projectIndex].technologies.includes(trimmedTech)) {
      const updated = [...data];
      updated[projectIndex].technologies = [...updated[projectIndex].technologies, trimmedTech];
      onChange(updated);
    }
  };

  const removeTechnology = (projectIndex: number, techToRemove: string) => {
    const updated = [...data];
    updated[projectIndex].technologies = updated[projectIndex].technologies.filter(tech => tech !== techToRemove);
    onChange(updated);
  };

  const addAchievement = (projectIndex: number) => {
    const updated = [...data];
    updated[projectIndex].achievements = [...updated[projectIndex].achievements, ''];
    onChange(updated);
  };

  const updateAchievement = (projectIndex: number, achievementIndex: number, value: string) => {
    const updated = [...data];
    updated[projectIndex].achievements[achievementIndex] = value;
    onChange(updated);
  };

  const removeAchievement = (projectIndex: number, achievementIndex: number) => {
    const updated = [...data];
    updated[projectIndex].achievements = updated[projectIndex].achievements.filter((_, i) => i !== achievementIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {data.map((project, index) => (
        <ProjectCard
          key={project.id || index}
          project={project}
          index={index}
          onUpdate={updateProject}
          onRemove={removeProject}
          onAddTechnology={addTechnology}
          onRemoveTechnology={removeTechnology}
          onAddAchievement={addAchievement}
          onUpdateAchievement={updateAchievement}
          onRemoveAchievement={removeAchievement}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addProject}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Project
      </Button>
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No projects added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Showcase your key projects to demonstrate your skills and experience
          </p>
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectInput;
  index: number;
  onUpdate: (index: number, field: keyof ProjectInput, value: any) => void;
  onRemove: (index: number) => void;
  onAddTechnology: (index: number, tech: string) => void;
  onRemoveTechnology: (index: number, tech: string) => void;
  onAddAchievement: (index: number) => void;
  onUpdateAchievement: (index: number, achievementIndex: number, value: string) => void;
  onRemoveAchievement: (index: number, achievementIndex: number) => void;
}

function ProjectCard({ 
  project, 
  index, 
  onUpdate, 
  onRemove, 
  onAddTechnology, 
  onRemoveTechnology,
  onAddAchievement,
  onUpdateAchievement,
  onRemoveAchievement
}: ProjectCardProps) {
  const [techInput, setTechInput] = useState('');

  const handleAddTech = () => {
    if (techInput.trim()) {
      onAddTechnology(index, techInput.trim());
      setTechInput('');
    }
  };

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <span className="font-medium">Project {index + 1}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label htmlFor={`project-name-${index}`}>Project Name *</Label>
            <Input
              id={`project-name-${index}`}
              value={project.name}
              onChange={(e) => onUpdate(index, 'name', e.target.value)}
              placeholder="My Awesome Project"
              required
            />
          </div>
          
          <div>
            <Label htmlFor={`project-url-${index}`}>Live URL</Label>
            <Input
              id={`project-url-${index}`}
              value={project.url || ''}
              onChange={(e) => onUpdate(index, 'url', e.target.value)}
              placeholder="https://myproject.com"
            />
          </div>
          
          <div>
            <Label htmlFor={`project-github-${index}`}>GitHub URL</Label>
            <Input
              id={`project-github-${index}`}
              value={project.githubUrl || ''}
              onChange={(e) => onUpdate(index, 'githubUrl', e.target.value)}
              placeholder="https://github.com/user/project"
            />
          </div>
          
          <div>
            <Label htmlFor={`project-start-${index}`}>Start Date</Label>
            <Input
              id={`project-start-${index}`}
              type="month"
              value={project.startDate || ''}
              onChange={(e) => onUpdate(index, 'startDate', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor={`project-end-${index}`}>End Date</Label>
            <Input
              id={`project-end-${index}`}
              type="month"
              value={project.endDate || ''}
              onChange={(e) => onUpdate(index, 'endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor={`project-description-${index}`}>Description *</Label>
          <Textarea
            id={`project-description-${index}`}
            value={project.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            placeholder="Describe what this project does, your role, and the impact it had..."
            className="min-h-[80px] resize-none"
            required
          />
        </div>

        {/* Technologies */}
        <div className="mb-4">
          <Label>Technologies Used</Label>
          <div className="flex space-x-2 mt-2">
            <Input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
              placeholder="Add technology (e.g., React, Python)"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddTech}
              disabled={!techInput.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {project.technologies.map(tech => (
                <Badge key={tech} variant="outline" className="flex items-center gap-1">
                  {tech}
                  <button
                    type="button"
                    onClick={() => onRemoveTechnology(index, tech)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Key Achievements</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddAchievement(index)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Achievement
            </Button>
          </div>
          
          <div className="space-y-2">
            {project.achievements.map((achievement, achievementIndex) => (
              <div key={achievementIndex} className="flex items-center space-x-2">
                <Input
                  value={achievement}
                  onChange={(e) => onUpdateAchievement(index, achievementIndex, e.target.value)}
                  placeholder="• Achieved 99% uptime with automated deployment pipeline"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveAchievement(index, achievementIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState } from 'react';
import { ExperienceInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ExperienceSectionProps {
  data: ExperienceInput[];
  onChange: (data: ExperienceInput[]) => void;
}

export function ExperienceSection({ data, onChange }: ExperienceSectionProps) {
  const addExperience = () => {
    const newExperience: ExperienceInput = {
      id: uuidv4(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      location: '',
      description: '',
      achievements: []
    };
    onChange([...data, newExperience]);
  };

  const updateExperience = (index: number, field: keyof ExperienceInput, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeExperience = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addAchievement = (experienceIndex: number) => {
    const updated = [...data];
    updated[experienceIndex].achievements = [...updated[experienceIndex].achievements, ''];
    onChange(updated);
  };

  const updateAchievement = (experienceIndex: number, achievementIndex: number, value: string) => {
    const updated = [...data];
    updated[experienceIndex].achievements[achievementIndex] = value;
    onChange(updated);
  };

  const removeAchievement = (experienceIndex: number, achievementIndex: number) => {
    const updated = [...data];
    updated[experienceIndex].achievements = updated[experienceIndex].achievements.filter((_, i) => i !== achievementIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {data.map((experience, index) => (
        <Card key={experience.id || index} className="relative">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                <span className="font-medium">Experience {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeExperience(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`company-${index}`}>Company *</Label>
                <Input
                  id={`company-${index}`}
                  value={experience.company}
                  onChange={(e) => updateExperience(index, 'company', e.target.value)}
                  placeholder="Google Inc."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`position-${index}`}>Position *</Label>
                <Input
                  id={`position-${index}`}
                  value={experience.position}
                  onChange={(e) => updateExperience(index, 'position', e.target.value)}
                  placeholder="Software Engineer"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`location-${index}`}>Location</Label>
                <Input
                  id={`location-${index}`}
                  value={experience.location || ''}
                  onChange={(e) => updateExperience(index, 'location', e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
              
              <div>
                <Label htmlFor={`start-date-${index}`}>Start Date *</Label>
                <Input
                  id={`start-date-${index}`}
                  type="month"
                  value={experience.startDate}
                  onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                  required
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label htmlFor={`end-date-${index}`}>End Date</Label>
                  <Input
                    id={`end-date-${index}`}
                    type="month"
                    value={experience.endDate || ''}
                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                    disabled={experience.current}
                  />
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id={`current-${index}`}
                    checked={experience.current}
                    onCheckedChange={(checked) => {
                      updateExperience(index, 'current', checked);
                      if (checked) updateExperience(index, 'endDate', '');
                    }}
                  />
                  <Label htmlFor={`current-${index}`} className="text-sm">
                    Current
                  </Label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor={`description-${index}`}>Job Description</Label>
              <Textarea
                id={`description-${index}`}
                value={experience.description || ''}
                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                placeholder="Briefly describe your role and responsibilities..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Key Achievements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAchievement(index)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Achievement
                </Button>
              </div>
              
              <div className="space-y-2">
                {experience.achievements.map((achievement, achievementIndex) => (
                  <div key={achievementIndex} className="flex items-center space-x-2">
                    <Input
                      value={achievement}
                      onChange={(e) => updateAchievement(index, achievementIndex, e.target.value)}
                      placeholder="• Increased team productivity by 25% through process optimization"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAchievement(index, achievementIndex)}
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
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addExperience}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Work Experience
      </Button>
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No work experience added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your professional experience to showcase your career progression
          </p>
        </div>
      )}
    </div>
  );
}
'use client';

import React from 'react';
import { EducationInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface EducationSectionProps {
  data: EducationInput[];
  onChange: (data: EducationInput[]) => void;
}

export function EducationSection({ data, onChange }: EducationSectionProps) {
  const addEducation = () => {
    const newEducation: EducationInput = {
      id: uuidv4(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      honors: ''
    };
    onChange([...data, newEducation]);
  };

  const updateEducation = (index: number, field: keyof EducationInput, value: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEducation = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {data.map((education, index) => (
        <Card key={education.id || index} className="relative">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                <span className="font-medium">Education {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEducation(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor={`institution-${index}`}>Institution *</Label>
                <Input
                  id={`institution-${index}`}
                  value={education.institution}
                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                  placeholder="University of California, Berkeley"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`degree-${index}`}>Degree *</Label>
                <Input
                  id={`degree-${index}`}
                  value={education.degree}
                  onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  placeholder="Bachelor of Science"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`field-${index}`}>Field of Study</Label>
                <Input
                  id={`field-${index}`}
                  value={education.field || ''}
                  onChange={(e) => updateEducation(index, 'field', e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
              
              <div>
                <Label htmlFor={`start-date-${index}`}>Start Date</Label>
                <Input
                  id={`start-date-${index}`}
                  type="month"
                  value={education.startDate || ''}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`end-date-${index}`}>End Date</Label>
                <Input
                  id={`end-date-${index}`}
                  type="month"
                  value={education.endDate || ''}
                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`gpa-${index}`}>GPA</Label>
                <Input
                  id={`gpa-${index}`}
                  value={education.gpa || ''}
                  onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                  placeholder="3.8/4.0"
                />
              </div>
              
              <div>
                <Label htmlFor={`honors-${index}`}>Honors & Awards</Label>
                <Input
                  id={`honors-${index}`}
                  value={education.honors || ''}
                  onChange={(e) => updateEducation(index, 'honors', e.target.value)}
                  placeholder="Magna Cum Laude, Dean's List"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEducation}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Education
      </Button>
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No education added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your educational background to showcase your academic achievements
          </p>
        </div>
      )}
    </div>
  );
}
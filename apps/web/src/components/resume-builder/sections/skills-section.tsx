'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface SkillsSectionProps {
  data: string[];
  onChange: (data: string[]) => void;
}

const skillSuggestions = [
  // Technical Skills
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'Vue.js', 'Angular',
  'HTML/CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Linux',
  
  // Soft Skills
  'Leadership', 'Communication', 'Project Management', 'Problem Solving', 'Team Collaboration',
  'Critical Thinking', 'Time Management', 'Adaptability', 'Customer Service', 'Public Speaking',
  
  // Business Skills
  'Data Analysis', 'Digital Marketing', 'SEO', 'Content Writing', 'Financial Analysis',
  'Strategic Planning', 'Business Development', 'Sales', 'Marketing Strategy', 'Operations'
];

export function SkillsSection({ data, onChange }: SkillsSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !data.includes(trimmedSkill)) {
      onChange([...data, trimmedSkill]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(data.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = skillSuggestions.filter(skill => 
    !data.includes(skill) && 
    skill.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 8);

  const addPopularSkills = (category: 'technical' | 'soft' | 'business') => {
    const categorySkills = {
      technical: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git'],
      soft: ['Leadership', 'Communication', 'Problem Solving', 'Team Collaboration'],
      business: ['Project Management', 'Data Analysis', 'Strategic Planning']
    };
    
    const newSkills = categorySkills[category].filter(skill => !data.includes(skill));
    onChange([...data, ...newSkills]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="skill-input">Add Skills</Label>
        <div className="relative">
          <div className="flex space-x-2">
            <Input
              id="skill-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0)}
              placeholder="Type a skill and press Enter"
            />
            <Button
              type="button"
              onClick={() => addSkill(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-md z-10 max-h-40 overflow-y-auto">
              {filteredSuggestions.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                  onClick={() => addSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Quick Add:</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPopularSkills('technical')}
          >
            + Technical Skills
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPopularSkills('soft')}
          >
            + Soft Skills
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPopularSkills('business')}
          >
            + Business Skills
          </Button>
        </div>
      </div>

      {/* Skills Display */}
      {data.length > 0 && (
        <div className="space-y-2">
          <Label>Your Skills ({data.length})</Label>
          <div className="flex flex-wrap gap-2">
            {data.map(skill => (
              <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No skills added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add relevant skills to highlight your expertise
          </p>
        </div>
      )}
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> Include a mix of technical skills, soft skills, and industry-specific 
          knowledge. Focus on skills mentioned in job descriptions you're targeting.
        </p>
      </div>
    </div>
  );
}
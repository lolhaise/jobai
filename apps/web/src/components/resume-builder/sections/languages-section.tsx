'use client';

import React from 'react';
import { LanguageInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface LanguagesSectionProps {
  data: LanguageInput[];
  onChange: (data: LanguageInput[]) => void;
}

const proficiencyLevels = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'FLUENT', label: 'Fluent' },
  { value: 'NATIVE', label: 'Native' },
];

const commonLanguages = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Polish', 'Turkish', 'Hebrew', 'Thai'
];

export function LanguagesSection({ data, onChange }: LanguagesSectionProps) {
  const addLanguage = () => {
    const newLanguage: LanguageInput = {
      language: '',
      proficiency: 'INTERMEDIATE'
    };
    onChange([...data, newLanguage]);
  };

  const updateLanguage = (index: number, field: keyof LanguageInput, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addCommonLanguages = () => {
    const languagesToAdd = ['English', 'Spanish', 'French']
      .filter(lang => !data.some(d => d.language === lang))
      .map(lang => ({ language: lang, proficiency: 'INTERMEDIATE' as const }));
    
    onChange([...data, ...languagesToAdd]);
  };

  return (
    <div className="space-y-4">
      {data.map((language, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                <span className="font-medium">Language {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLanguage(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`language-${index}`}>Language *</Label>
                <Input
                  id={`language-${index}`}
                  value={language.language}
                  onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                  placeholder="English"
                  list={`languages-${index}`}
                  required
                />
                <datalist id={`languages-${index}`}>
                  {commonLanguages.map(lang => (
                    <option key={lang} value={lang} />
                  ))}
                </datalist>
              </div>
              
              <div>
                <Label htmlFor={`proficiency-${index}`}>Proficiency Level *</Label>
                <Select
                  value={language.proficiency}
                  onValueChange={(value: any) => updateLanguage(index, 'proficiency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={addLanguage}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
        
        {data.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={addCommonLanguages}
            className="flex-1"
          >
            + Add Common Languages
          </Button>
        )}
      </div>
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No languages added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add languages you speak to show your communication abilities
          </p>
        </div>
      )}
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Proficiency Levels:</strong>
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
          <li>• <strong>Beginner:</strong> Basic conversational ability</li>
          <li>• <strong>Intermediate:</strong> Can handle most conversations</li>
          <li>• <strong>Advanced:</strong> Professional working proficiency</li>
          <li>• <strong>Fluent:</strong> Near-native proficiency</li>
          <li>• <strong>Native:</strong> Mother tongue or equivalent</li>
        </ul>
      </div>
    </div>
  );
}
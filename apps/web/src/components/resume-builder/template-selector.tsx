'use client';

import React from 'react';
import { ResumeTemplate, TemplateCategory } from '@jobai/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Check } from 'lucide-react';

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  templates: ResumeTemplate[];
  selectedTemplate: ResumeTemplate;
  onSelectTemplate: (template: ResumeTemplate) => void;
}

export function TemplateSelector({
  open,
  onClose,
  templates,
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, ResumeTemplate[]>);

  const handleSelectTemplate = (template: ResumeTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const getCategoryLabel = (category: TemplateCategory) => {
    switch (category) {
      case TemplateCategory.MODERN:
        return 'Modern';
      case TemplateCategory.CLASSIC:
        return 'Classic';
      case TemplateCategory.CREATIVE:
        return 'Creative';
      case TemplateCategory.TECHNICAL:
        return 'Technical';
      case TemplateCategory.EXECUTIVE:
        return 'Executive';
      default:
        return category;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Resume Template</DialogTitle>
          <DialogDescription>
            Select a template that best fits your style and industry. You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={Object.keys(templatesByCategory)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.keys(templatesByCategory).map((category) => (
              <TabsTrigger key={category} value={category}>
                {getCategoryLabel(category as TemplateCategory)}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate.id === template.id}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: ResumeTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Template Preview */}
        <div className="relative mb-3">
          <div 
            className="w-full h-40 rounded-lg bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${template.styles.primaryColor}15 0%, ${template.styles.secondaryColor}15 100%)`
            }}
          >
            <div className="text-center p-4">
              <div 
                className="w-full h-2 rounded mb-2"
                style={{ backgroundColor: template.styles.primaryColor }}
              />
              <div className="space-y-1">
                <div className="w-3/4 h-1 bg-gray-400 dark:bg-gray-600 rounded mx-auto" />
                <div className="w-1/2 h-1 bg-gray-400 dark:bg-gray-600 rounded mx-auto" />
              </div>
              <div className="mt-3 space-y-1">
                <div className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="w-4/5 h-1 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
          
          {template.isPremium && (
            <div className="absolute top-2 right-2">
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
          )}
          
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{template.name}</h4>
            {template.isPremium && (
              <Badge variant="secondary" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {getCategoryLabel(template.category)} • {template.styles.fontFamily}
          </div>
          
          <div className="flex items-center space-x-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: template.styles.primaryColor }}
            />
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: template.styles.secondaryColor }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCategoryLabel(category: TemplateCategory) {
  switch (category) {
    case TemplateCategory.MODERN:
      return 'Modern';
    case TemplateCategory.CLASSIC:
      return 'Classic';
    case TemplateCategory.CREATIVE:
      return 'Creative';
    case TemplateCategory.TECHNICAL:
      return 'Technical';
    case TemplateCategory.EXECUTIVE:
      return 'Executive';
    default:
      return category;
  }
}
'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface SummarySectionProps {
  data: string;
  onChange: (data: string) => void;
}

const sampleSummaries = [
  "Results-driven software engineer with 5+ years of experience developing scalable web applications. Proficient in React, Node.js, and cloud technologies. Passionate about creating efficient, user-friendly solutions and leading cross-functional teams to deliver high-quality products.",
  "Marketing professional with expertise in digital campaigns, content strategy, and data analytics. Proven track record of increasing brand awareness by 40% and driving revenue growth through innovative marketing initiatives. Strong background in SEO, social media, and email marketing.",
  "Financial analyst with strong analytical skills and attention to detail. Experience in financial modeling, forecasting, and investment analysis. Skilled in Excel, SQL, and financial software. Committed to providing accurate insights to support strategic business decisions."
];

export function SummarySection({ data, onChange }: SummarySectionProps) {
  const handleGenerateSample = () => {
    const randomSummary = sampleSummaries[Math.floor(Math.random() * sampleSummaries.length)];
    onChange(randomSummary);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="summary">
          Professional Summary
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateSample}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Generate Sample
        </Button>
      </div>
      
      <Textarea
        id="summary"
        value={data}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a compelling summary that highlights your key strengths, experience, and career objectives. Keep it concise and tailored to your target role."
        className="min-h-[120px] resize-none"
        maxLength={500}
      />
      
      <div className="text-right text-sm text-muted-foreground">
        {data.length}/500 characters
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> A great summary should be 2-4 sentences that highlight your most relevant experience, 
          key skills, and what you bring to the role. Focus on achievements and measurable results when possible.
        </p>
      </div>
    </div>
  );
}
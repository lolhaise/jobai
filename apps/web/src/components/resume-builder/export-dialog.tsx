'use client';

import React, { useState } from 'react';
import { ResumeBuilderInput } from '@jobai/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Settings } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: 'PDF' | 'DOCX') => Promise<void>;
  resumeData: ResumeBuilderInput;
}

interface ExportOptions {
  format: 'PDF' | 'DOCX';
  includePhoto: boolean;
  colorMode: 'color' | 'grayscale' | 'blackwhite';
  paperSize: 'A4' | 'Letter';
  margins: 'normal' | 'narrow' | 'wide';
}

export function ExportDialog({ open, onClose, onExport, resumeData }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'PDF',
    includePhoto: false,
    colorMode: 'color',
    paperSize: 'A4',
    margins: 'normal',
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(options.format);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Resume
          </DialogTitle>
          <DialogDescription>
            Choose your export format and preferences. Your resume will be downloaded to your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={options.format}
              onValueChange={(value: 'PDF' | 'DOCX') => updateOption('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div>PDF Document</div>
                      <div className="text-xs text-muted-foreground">Best for sharing and printing</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="DOCX">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div>Word Document</div>
                      <div className="text-xs text-muted-foreground">Easy to edit and customize</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Export Options
            </Label>
            
            {/* Color Mode */}
            <div className="space-y-2">
              <Label className="text-sm">Color Mode</Label>
              <Select
                value={options.colorMode}
                onValueChange={(value: any) => updateOption('colorMode', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Full Color</SelectItem>
                  <SelectItem value="grayscale">Grayscale</SelectItem>
                  <SelectItem value="blackwhite">Black & White</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paper Size */}
            <div className="space-y-2">
              <Label className="text-sm">Paper Size</Label>
              <Select
                value={options.paperSize}
                onValueChange={(value: any) => updateOption('paperSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Margins */}
            <div className="space-y-2">
              <Label className="text-sm">Margins</Label>
              <Select
                value={options.margins}
                onValueChange={(value: any) => updateOption('margins', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow (0.5")</SelectItem>
                  <SelectItem value="normal">Normal (1")</SelectItem>
                  <SelectItem value="wide">Wide (1.5")</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Photo */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePhoto"
                checked={options.includePhoto}
                onCheckedChange={(checked) => updateOption('includePhoto', !!checked)}
              />
              <Label htmlFor="includePhoto" className="text-sm">
                Include profile photo (if available)
              </Label>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>File name:</strong> {resumeData.personalInfo.name || 'Resume'}-Resume.{options.format.toLowerCase()}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Your resume will be optimized for {options.colorMode} printing on {options.paperSize} paper.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {options.format}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Loader2, Sparkles, CheckCircle, AlertCircle, TrendingUp, FileText, Target } from 'lucide-react';

interface TailoringResult {
  tailoredResume: any;
  optimizations: {
    keywordsAdded: string[];
    bulletPointsReordered: number;
    skillsHighlighted: string[];
    sectionsReordered: string[];
  };
  atsScore: {
    before: number;
    after: number;
    improvement: number;
  };
  suggestions: string[];
  confidence: number;
}

interface ResumeTailoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  resumeName: string;
}

export default function ResumeTailoringModal({
  isOpen,
  onClose,
  resumeId,
  resumeName,
}: ResumeTailoringModalProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input');
  const [jobAnalysis, setJobAnalysis] = useState<any>(null);
  const [tailoringResult, setTailoringResult] = useState<TailoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analyze job description
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setStep('analyzing');

    try {
      // Call API to analyze job
      const response = await fetch('/api/ai/analyze-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ jobDescription }),
      });

      const data = await response.json();
      
      if (data.success) {
        setJobAnalysis(data.data);
        // Automatically start tailoring after analysis
        handleTailor(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze job description');
      setStep('input');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Tailor resume
  const handleTailor = async (analysis?: any) => {
    setIsTailoring(true);

    try {
      // Call API to tailor resume
      const response = await fetch('/api/ai/tailor-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          resumeId,
          jobDescription,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTailoringResult(data.data);
        setStep('results');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to tailor resume');
      setStep('input');
    } finally {
      setIsTailoring(false);
    }
  };

  // Apply tailored resume
  const handleApply = async () => {
    // Save the tailored version
    console.log('Applying tailored resume...');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Resume Tailoring
          </DialogTitle>
          <DialogDescription>
            Optimize "{resumeName}" for a specific job position
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Paste the Job Description
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze & Tailor
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 text-center space-y-4"
            >
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500 mx-auto" />
                <Sparkles className="h-8 w-8 text-yellow-500 absolute top-0 right-1/3 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {isAnalyzing ? 'Analyzing Job Description...' : 'Tailoring Your Resume...'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isAnalyzing
                    ? 'Extracting requirements, keywords, and skills from the job posting'
                    : 'Optimizing your resume for ATS systems and keyword matching'}
                </p>
              </div>

              <Progress value={isAnalyzing ? 33 : 66} className="max-w-xs mx-auto" />
            </motion.div>
          )}

          {step === 'results' && tailoringResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* ATS Score Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>ATS Score Improvement</span>
                    <Badge variant="outline" className="text-green-600">
                      +{tailoringResult.atsScore.improvement} points
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Before</span>
                        <span className="font-medium">{tailoringResult.atsScore.before}%</span>
                      </div>
                      <Progress value={tailoringResult.atsScore.before} className="h-2" />
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>After</span>
                        <span className="font-medium text-green-600">
                          {tailoringResult.atsScore.after}%
                        </span>
                      </div>
                      <Progress value={tailoringResult.atsScore.after} className="h-2 bg-green-100" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Confidence: {tailoringResult.confidence}%
                  </div>
                </CardContent>
              </Card>

              {/* Optimizations Made */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimizations Applied</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {tailoringResult.optimizations.keywordsAdded.length} keywords added
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {tailoringResult.optimizations.bulletPointsReordered} bullets reordered
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {tailoringResult.optimizations.skillsHighlighted.length} skills highlighted
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {tailoringResult.optimizations.sectionsReordered.length} sections optimized
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Added */}
                  {tailoringResult.optimizations.keywordsAdded.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Keywords Added:</p>
                      <div className="flex flex-wrap gap-2">
                        {tailoringResult.optimizations.keywordsAdded.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggestions */}
              {tailoringResult.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Suggestions for Further Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tailoringResult.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleApply}>
                  <FileText className="mr-2 h-4 w-4" />
                  Apply Tailored Resume
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
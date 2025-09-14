'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FileText,
  Target,
  TrendingUp,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResumeTailoringModal from '@/components/resume-tailoring/ResumeTailoringModal';
import JobMatchCard from '@/components/resume-tailoring/JobMatchCard';

// Sample data for demonstration
const sampleResumes = [
  { id: '1', name: 'Software Engineer Resume', type: 'Technical' },
  { id: '2', name: 'Marketing Manager Resume', type: 'Marketing' },
  { id: '3', name: 'Data Scientist Resume', type: 'Technical' },
];

const sampleJobs = [
  {
    id: '1',
    title: 'Senior Full Stack Developer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    salary: { min: 150000, max: 200000 },
    type: 'full-time' as const,
    posted: '2 days ago',
    matchScore: 85,
    matchedSkills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
    missingSkills: ['Kubernetes', 'GraphQL'],
    url: '#',
  },
  {
    id: '2',
    title: 'Frontend Engineer',
    company: 'StartupXYZ',
    location: 'Remote',
    salary: { min: 120000, max: 160000 },
    type: 'remote' as const,
    posted: '1 week ago',
    matchScore: 72,
    matchedSkills: ['React', 'JavaScript', 'CSS', 'HTML'],
    missingSkills: ['Vue.js', 'Angular', 'Redux'],
    url: '#',
  },
  {
    id: '3',
    title: 'Backend Developer',
    company: 'DataCo',
    location: 'New York, NY',
    salary: { min: 130000, max: 170000 },
    type: 'full-time' as const,
    posted: '3 days ago',
    matchScore: 68,
    matchedSkills: ['Python', 'Django', 'PostgreSQL'],
    missingSkills: ['Go', 'Microservices', 'Docker'],
    url: '#',
  },
];

export default function ResumeTailoringPage() {
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);

  const handleTailorJob = (jobId: string) => {
    // For demo, just open the modal
    setSelectedResume('1');
    setIsTailoringModalOpen(true);
  };

  const handleApplyJob = (jobId: string) => {
    console.log('Applying to job:', jobId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Sparkles className="h-16 w-16 text-purple-500" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 h-16 w-16 border-4 border-purple-200 border-t-purple-500 rounded-full"
            />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">
          AI-Powered Resume Tailoring
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Optimize your resume for each job application with our intelligent AI that analyzes job descriptions 
          and tailors your resume for maximum ATS compatibility and keyword matching.
        </p>
      </motion.div>

      {/* How It Works */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              icon: FileText,
              title: 'Select Resume',
              description: 'Choose your base resume to optimize',
            },
            {
              icon: Target,
              title: 'Add Job Description',
              description: 'Paste the job posting you want to apply for',
            },
            {
              icon: Brain,
              title: 'AI Analysis',
              description: 'Our AI extracts keywords and requirements',
            },
            {
              icon: TrendingUp,
              title: 'Get Optimized Resume',
              description: 'Download your tailored, ATS-optimized resume',
            },
          ].map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <step.icon className="h-10 w-10 mx-auto text-purple-500 mb-2" />
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Smart Keyword Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Identifies critical ATS keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Naturally incorporates missing terms</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Maintains authentic voice</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Experience Reordering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Prioritizes relevant experience</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Reorders bullet points by impact</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Highlights matching achievements</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              ATS Score Boost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Average 25+ point improvement</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Real-time scoring feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Format optimization included</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Job Matches Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Your Job Matches</h2>
            <p className="text-muted-foreground">
              Based on your profile, these jobs are good matches
            </p>
          </div>
          <Button>
            Search More Jobs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleJobs.map((job) => (
            <JobMatchCard
              key={job.id}
              job={job}
              onTailor={handleTailorJob}
              onApply={handleApplyJob}
            />
          ))}
        </div>
      </div>

      {/* Quick Start CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <Card className="max-w-2xl mx-auto border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle>Ready to Optimize Your Resume?</CardTitle>
            <CardDescription>
              Start tailoring your resume for your dream job in seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={() => {
                setSelectedResume('1');
                setIsTailoringModalOpen(true);
              }}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Tailoring Now
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tailoring Modal */}
      {selectedResume && (
        <ResumeTailoringModal
          isOpen={isTailoringModalOpen}
          onClose={() => setIsTailoringModalOpen(false)}
          resumeId={selectedResume}
          resumeName={sampleResumes.find(r => r.id === selectedResume)?.name || ''}
        />
      )}
    </div>
  );
}
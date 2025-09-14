'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Building,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  Target,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: {
    min: number;
    max: number;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  posted: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  url: string;
}

interface JobMatchCardProps {
  job: JobMatch;
  onTailor: (jobId: string) => void;
  onApply: (jobId: string) => void;
}

export default function JobMatchCard({ job, onTailor, onApply }: JobMatchCardProps) {
  // Get color based on match score
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get match label
  const getMatchLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Match Score Badge */}
            <div className="text-center">
              <div className={`rounded-full px-3 py-1 ${getMatchColor(job.matchScore)}`}>
                <div className="text-2xl font-bold">{job.matchScore}%</div>
                <div className="text-xs">{getMatchLabel(job.matchScore)}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Match Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <Target className="h-4 w-4" />
                Match Score
              </span>
              <span className="text-sm text-muted-foreground">
                {job.matchedSkills.length} of {job.matchedSkills.length + job.missingSkills.length} skills
              </span>
            </div>
            <Progress value={job.matchScore} className="h-2" />
          </div>

          {/* Matched Skills */}
          {job.matchedSkills.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Matched Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {job.matchedSkills.slice(0, 5).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {job.matchedSkills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{job.matchedSkills.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {job.missingSkills.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                Missing Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {job.missingSkills.slice(0, 3).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs opacity-60">
                    {skill}
                  </Badge>
                ))}
                {job.missingSkills.length > 3 && (
                  <Badge variant="secondary" className="text-xs opacity-60">
                    +{job.missingSkills.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Job Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Posted {job.posted}
            </span>
            <Badge variant="outline" className="text-xs">
              {job.type}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onTailor(job.id)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Tailor Resume
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApply(job.id)}
            >
              Apply Now
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
'use client'

import { useState } from 'react'
import { JobSearchBar } from '@/components/search/JobSearchBar'
import { JobFilterSidebar } from '@/components/search/JobFilterSidebar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  MapPinIcon,
  BriefcaseIcon,
  DollarSignIcon,
  ClockIcon,
  BuildingIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  SparklesIcon,
  FilterIcon
} from 'lucide-react'

// Mock job data for demonstration
const mockJobs = [
  {
    id: '1',
    title: 'Senior Full Stack Developer',
    company: 'TechCorp Solutions',
    location: 'San Francisco, CA',
    salary: '$150k - $200k',
    type: 'Full-time',
    remote: true,
    posted: '2 days ago',
    description: 'We are looking for an experienced Full Stack Developer to join our team...',
    matchScore: 92,
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    source: 'RemoteOK'
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'StartupHub',
    location: 'New York, NY',
    salary: '$120k - $160k',
    type: 'Full-time',
    remote: false,
    posted: '3 days ago',
    description: 'Join our product team to lead the development of innovative solutions...',
    matchScore: 85,
    skills: ['Product Strategy', 'Agile', 'Data Analysis', 'User Research'],
    source: 'The Muse'
  },
  {
    id: '3',
    title: 'Data Scientist',
    company: 'AI Innovations',
    location: 'Remote',
    salary: '$130k - $170k',
    type: 'Full-time',
    remote: true,
    posted: '1 day ago',
    description: 'Work with cutting-edge ML models and big data technologies...',
    matchScore: 88,
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    source: 'Remotive'
  },
  {
    id: '4',
    title: 'UX Designer',
    company: 'Design Studio Pro',
    location: 'Los Angeles, CA',
    salary: '$100k - $130k',
    type: 'Full-time',
    remote: true,
    posted: '4 days ago',
    description: 'Create beautiful and intuitive user experiences for our clients...',
    matchScore: 79,
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    source: 'RemoteOK'
  }
]

export default function JobSearchPage() {
  const [showFilters, setShowFilters] = useState(true)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [savedJobs, setSavedJobs] = useState<string[]>([])

  // Toggle job selection for bulk actions
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  // Save/unsave job
  const toggleSaveJob = (jobId: string) => {
    setSavedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with search bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <JobSearchBar />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <FilterIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Results summary and bulk actions */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold">342 jobs</span> matching your criteria
            </p>
            {selectedJobs.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Tailor Resume ({selectedJobs.length})
                </Button>
                <Button size="sm" variant="outline">
                  Save Selected
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <JobFilterSidebar />
            </div>
          )}

          {/* Job listings */}
          <div className="flex-1">
            <div className="space-y-4">
              {mockJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className={`hover:shadow-lg transition-shadow ${
                    selectedJobs.includes(job.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Job title and company */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedJobs.includes(job.id)}
                            onChange={() => toggleJobSelection(job.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold hover:text-blue-600">
                              <Link href={`/jobs/${job.id}`}>
                                {job.title}
                              </Link>
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <BuildingIcon className="h-4 w-4" />
                                {job.company}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="h-4 w-4" />
                                {job.location}
                              </span>
                              {job.remote && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  Remote
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Match score and save button */}
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            job.matchScore >= 90 ? 'text-green-600' :
                            job.matchScore >= 80 ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {job.matchScore}%
                          </div>
                          <p className="text-xs text-gray-500">match</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSaveJob(job.id)}
                        >
                          <BookmarkIcon 
                            className={`h-5 w-5 ${
                              savedJobs.includes(job.id) ? 'fill-current' : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Job description preview */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {job.description}
                    </p>
                    
                    {/* Job details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <DollarSignIcon className="h-4 w-4" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="h-4 w-4" />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {job.posted}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        via {job.source}
                      </Badge>
                    </div>
                    
                    {/* Required skills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm">
                          View Details
                          <ExternalLinkIcon className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline">
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Tailor Resume
                      </Button>
                      <Button size="sm" variant="outline">
                        Quick Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button variant="outline" size="sm">Previous</Button>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="bg-blue-50">1</Button>
                <Button variant="ghost" size="sm">2</Button>
                <Button variant="ghost" size="sm">3</Button>
                <span className="px-2 py-1">...</span>
                <Button variant="ghost" size="sm">18</Button>
              </div>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
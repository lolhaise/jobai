'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Calendar, Check, Edit, Trash2, Star } from 'lucide-react';
import ResumeUploadModal from '@/components/resumes/resume-upload-modal';
import ResumeEditModal from '@/components/resumes/resume-edit-modal';

interface Resume {
  id: string;
  title: string;
  fileName: string;
  fileFormat: string;
  isDefault: boolean;
  summary?: string;
  skillsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch resumes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchResumes();
    toast({
      title: 'Success',
      description: 'Resume uploaded and parsed successfully',
    });
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedResume(null);
    fetchResumes();
    toast({
      title: 'Success',
      description: 'Resume updated successfully',
    });
  };

  const handleSetActive = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/activate`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        fetchResumes();
        toast({
          title: 'Success',
          description: 'Active resume updated',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update active resume',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchResumes();
        toast({
          title: 'Success',
          description: 'Resume deleted successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete resume',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (fileFormat: string) => {
    if (fileFormat === 'PDF') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (fileFormat === 'DOCX') {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Resumes</h1>
          <p className="text-gray-600 mt-2">
            Manage your resume versions and keep them optimized for different applications
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : resumes.length === 0 ? (
        <Card className="p-12 text-center">
          <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No resumes uploaded yet</h2>
          <p className="text-gray-600 mb-6">
            Upload your first resume to get started with AI-powered optimization
          </p>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Your First Resume
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card key={resume.id} className="p-6 relative">
              {resume.isDefault && (
                <Badge className="absolute top-4 right-4" variant="default">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              
              <div className="flex items-center mb-4">
                {getFileIcon(resume.fileFormat)}
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold truncate">{resume.title}</h3>
                  <p className="text-sm text-gray-600">{resume.fileName}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Uploaded {formatDate(resume.createdAt)}
                </div>
                {resume.skillsCount > 0 && (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    {resume.skillsCount} skills identified
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!resume.isDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetActive(resume.id)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedResume(resume.id);
                    setEditModalOpen(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(resume.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ResumeUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {selectedResume && (
        <ResumeEditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedResume(null);
          }}
          onSuccess={handleEditSuccess}
          resumeId={selectedResume}
        />
      )}
    </div>
  );
}
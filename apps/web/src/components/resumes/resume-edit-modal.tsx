'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Experience {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  responsibilities: string[];
}

interface Education {
  degree?: string;
  field?: string;
  institution?: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
}

interface ParsedData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: string[];
}

interface ResumeEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resumeId: string;
}

export default function ResumeEditModal({ open, onClose, onSuccess, resumeId }: ResumeEditModalProps) {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'experience' | 'education' | 'skills'>('personal');
  const { toast } = useToast();

  useEffect(() => {
    if (open && resumeId) {
      fetchResumeData();
    }
  }, [open, resumeId]);

  const fetchResumeData = async () => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}`);
      if (response.ok) {
        const resume = await response.json();
        // Convert resume data to parsed format for editing
        const parsedData: ParsedData = {
          fullName: resume.title || '',
          email: '', // Will need to fetch from user profile
          phone: '', // Will need to fetch from user profile
          location: '', // Will need to fetch from user profile
          summary: resume.summary || '',
          experience: resume.experience || [],
          education: resume.education || [],
          skills: resume.skills || [],
          certifications: resume.certifications?.map((cert: any) => cert.name || cert) || [],
          languages: resume.languages?.map((lang: any) => lang.name || lang) || [],
        };
        setData(parsedData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch resume data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/parsed-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onSuccess();
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev!,
      experience: [...(prev?.experience || []), { responsibilities: [] }],
    }));
  };

  const removeExperience = (index: number) => {
    setData(prev => ({
      ...prev!,
      experience: prev!.experience.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev!,
      education: [...(prev?.education || []), {}],
    }));
  };

  const removeEducation = (index: number) => {
    setData(prev => ({
      ...prev!,
      education: prev!.education.filter((_, i) => i !== index),
    }));
  };

  const addSkill = () => {
    const skill = prompt('Enter a skill:');
    if (skill) {
      setData(prev => ({
        ...prev!,
        skills: [...(prev?.skills || []), skill],
      }));
    }
  };

  const removeSkill = (index: number) => {
    setData(prev => ({
      ...prev!,
      skills: prev!.skills.filter((_, i) => i !== index),
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Resume Data</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="border-b">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`py-3 border-b-2 ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                >
                  Personal Info
                </button>
                <button
                  onClick={() => setActiveTab('experience')}
                  className={`py-3 border-b-2 ${activeTab === 'experience' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                >
                  Experience
                </button>
                <button
                  onClick={() => setActiveTab('education')}
                  className={`py-3 border-b-2 ${activeTab === 'education' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                >
                  Education
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={`py-3 border-b-2 ${activeTab === 'skills' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                >
                  Skills
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {activeTab === 'personal' && data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={data.fullName || ''}
                        onChange={e => setData({ ...data, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={data.email || ''}
                        onChange={e => setData({ ...data, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={data.phone || ''}
                        onChange={e => setData({ ...data, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={data.location || ''}
                        onChange={e => setData({ ...data, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Professional Summary</Label>
                    <Textarea
                      value={data.summary || ''}
                      onChange={e => setData({ ...data, summary: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'experience' && data && (
                <div className="space-y-4">
                  {data.experience.map((exp, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-3">
                        <h4 className="font-medium">Experience {index + 1}</h4>
                        <button
                          onClick={() => removeExperience(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Job Title"
                          value={exp.title || ''}
                          onChange={e => {
                            const newExp = [...data.experience];
                            newExp[index] = { ...newExp[index], title: e.target.value };
                            setData({ ...data, experience: newExp });
                          }}
                        />
                        <Input
                          placeholder="Company"
                          value={exp.company || ''}
                          onChange={e => {
                            const newExp = [...data.experience];
                            newExp[index] = { ...newExp[index], company: e.target.value };
                            setData({ ...data, experience: newExp });
                          }}
                        />
                        <Input
                          placeholder="Start Date"
                          value={exp.startDate || ''}
                          onChange={e => {
                            const newExp = [...data.experience];
                            newExp[index] = { ...newExp[index], startDate: e.target.value };
                            setData({ ...data, experience: newExp });
                          }}
                        />
                        <Input
                          placeholder="End Date"
                          value={exp.endDate || ''}
                          onChange={e => {
                            const newExp = [...data.experience];
                            newExp[index] = { ...newExp[index], endDate: e.target.value };
                            setData({ ...data, experience: newExp });
                          }}
                        />
                      </div>
                      <Textarea
                        placeholder="Description"
                        className="mt-3"
                        value={exp.description || ''}
                        onChange={e => {
                          const newExp = [...data.experience];
                          newExp[index] = { ...newExp[index], description: e.target.value };
                          setData({ ...data, experience: newExp });
                        }}
                      />
                    </div>
                  ))}
                  <Button onClick={addExperience} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
              )}

              {activeTab === 'education' && data && (
                <div className="space-y-4">
                  {data.education.map((edu, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-3">
                        <h4 className="font-medium">Education {index + 1}</h4>
                        <button
                          onClick={() => removeEducation(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Degree"
                          value={edu.degree || ''}
                          onChange={e => {
                            const newEdu = [...data.education];
                            newEdu[index] = { ...newEdu[index], degree: e.target.value };
                            setData({ ...data, education: newEdu });
                          }}
                        />
                        <Input
                          placeholder="Field of Study"
                          value={edu.field || ''}
                          onChange={e => {
                            const newEdu = [...data.education];
                            newEdu[index] = { ...newEdu[index], field: e.target.value };
                            setData({ ...data, education: newEdu });
                          }}
                        />
                        <Input
                          placeholder="Institution"
                          value={edu.institution || ''}
                          onChange={e => {
                            const newEdu = [...data.education];
                            newEdu[index] = { ...newEdu[index], institution: e.target.value };
                            setData({ ...data, education: newEdu });
                          }}
                        />
                        <Input
                          placeholder="Graduation Date"
                          value={edu.graduationDate || ''}
                          onChange={e => {
                            const newEdu = [...data.education];
                            newEdu[index] = { ...newEdu[index], graduationDate: e.target.value };
                            setData({ ...data, education: newEdu });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addEducation} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education
                  </Button>
                </div>
              )}

              {activeTab === 'skills' && data && (
                <div className="space-y-4">
                  <div>
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.skills.map((skill, index) => (
                        <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                          <span className="text-sm">{skill}</span>
                          <button
                            onClick={() => removeSkill(index)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <Button onClick={addSkill} variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Skill
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
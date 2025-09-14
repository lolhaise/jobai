'use client';

import React from 'react';
import { CertificationInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CertificationsSectionProps {
  data: CertificationInput[];
  onChange: (data: CertificationInput[]) => void;
}

export function CertificationsSection({ data, onChange }: CertificationsSectionProps) {
  const addCertification = () => {
    const newCertification: CertificationInput = {
      id: uuidv4(),
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      credentialId: '',
      url: ''
    };
    onChange([...data, newCertification]);
  };

  const updateCertification = (index: number, field: keyof CertificationInput, value: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCertification = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {data.map((certification, index) => (
        <Card key={certification.id || index} className="relative">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                <span className="font-medium">Certification {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCertification(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor={`cert-name-${index}`}>Certification Name *</Label>
                <Input
                  id={`cert-name-${index}`}
                  value={certification.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                  placeholder="AWS Certified Solutions Architect"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`cert-issuer-${index}`}>Issuing Organization *</Label>
                <Input
                  id={`cert-issuer-${index}`}
                  value={certification.issuer}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                  placeholder="Amazon Web Services"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`cert-credential-${index}`}>Credential ID</Label>
                <Input
                  id={`cert-credential-${index}`}
                  value={certification.credentialId || ''}
                  onChange={(e) => updateCertification(index, 'credentialId', e.target.value)}
                  placeholder="ABC123XYZ789"
                />
              </div>
              
              <div>
                <Label htmlFor={`cert-date-${index}`}>Issue Date</Label>
                <Input
                  id={`cert-date-${index}`}
                  type="month"
                  value={certification.date || ''}
                  onChange={(e) => updateCertification(index, 'date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`cert-expiry-${index}`}>Expiry Date</Label>
                <Input
                  id={`cert-expiry-${index}`}
                  type="month"
                  value={certification.expiryDate || ''}
                  onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                  placeholder="Leave empty if no expiry"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor={`cert-url-${index}`}>Credential URL</Label>
                <Input
                  id={`cert-url-${index}`}
                  value={certification.url || ''}
                  onChange={(e) => updateCertification(index, 'url', e.target.value)}
                  placeholder="https://credentials.example.com/verify/abc123"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addCertification}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Certification
      </Button>
      
      {data.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground mb-2">No certifications added yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add professional certifications to validate your expertise
          </p>
        </div>
      )}
    </div>
  );
}
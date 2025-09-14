'use client';

import React from 'react';
import { ContactInfoInput } from '@jobai/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';

interface PersonalInfoSectionProps {
  data: ContactInfoInput;
  onChange: (data: ContactInfoInput) => void;
}

export function PersonalInfoSection({ data, onChange }: PersonalInfoSectionProps) {
  const handleChange = (field: keyof ContactInfoInput, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="john@example.com"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Phone Number
        </Label>
        <Input
          id="phone"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Input
          id="location"
          value={data.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="San Francisco, CA"
        />
      </div>
      
      <div>
        <Label htmlFor="linkedin" className="flex items-center gap-2">
          <Linkedin className="h-4 w-4" />
          LinkedIn Profile
        </Label>
        <Input
          id="linkedin"
          value={data.linkedin || ''}
          onChange={(e) => handleChange('linkedin', e.target.value)}
          placeholder="https://linkedin.com/in/johndoe"
        />
      </div>
      
      <div>
        <Label htmlFor="github" className="flex items-center gap-2">
          <Github className="h-4 w-4" />
          GitHub Profile
        </Label>
        <Input
          id="github"
          value={data.github || ''}
          onChange={(e) => handleChange('github', e.target.value)}
          placeholder="https://github.com/johndoe"
        />
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="website" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Website/Portfolio
        </Label>
        <Input
          id="website"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://johndoe.com"
        />
      </div>
    </div>
  );
}
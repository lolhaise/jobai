export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resume {
  id: string;
  userId: string;
  name: string;
  content: string;
  parsedData?: ParsedResume;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedResume {
  contactInfo: ContactInfo;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications?: Certification[];
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
}

// Resume Builder Types
export interface ResumeTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  preview: string;
  structure: ResumeSection[];
  styles: TemplateStyles;
  isPremium: boolean;
}

export enum TemplateCategory {
  MODERN = 'MODERN',
  CLASSIC = 'CLASSIC',
  CREATIVE = 'CREATIVE',
  TECHNICAL = 'TECHNICAL',
  EXECUTIVE = 'EXECUTIVE'
}

export interface TemplateStyles {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  spacing: {
    section: number;
    item: number;
  };
}

export interface ResumeSection {
  id: string;
  type: SectionType;
  title: string;
  isRequired: boolean;
  isVisible: boolean;
  order: number;
  content: any;
}

export enum SectionType {
  CONTACT = 'CONTACT',
  SUMMARY = 'SUMMARY',
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  SKILLS = 'SKILLS',
  PROJECTS = 'PROJECTS',
  CERTIFICATIONS = 'CERTIFICATIONS',
  LANGUAGES = 'LANGUAGES',
  VOLUNTEER = 'VOLUNTEER',
  AWARDS = 'AWARDS',
  INTERESTS = 'INTERESTS',
  REFERENCES = 'REFERENCES',
  CUSTOM = 'CUSTOM'
}

export interface ProjectSection {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  githubUrl?: string;
  achievements: string[];
}

export interface LanguageSection {
  language: string;
  proficiency: LanguageProficiency;
}

export enum LanguageProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  FLUENT = 'FLUENT',
  NATIVE = 'NATIVE'
}

export interface VolunteerSection {
  organization: string;
  role: string;
  startDate?: string;
  endDate?: string;
  description: string;
  achievements: string[];
}

export interface AwardSection {
  title: string;
  issuer: string;
  date?: string;
  description?: string;
}

export interface ResumeBuilderData {
  id?: string;
  templateId: string;
  personalInfo: ContactInfo;
  sections: ResumeSection[];
  customSections: CustomSection[];
}

export interface CustomSection {
  id: string;
  title: string;
  content: any[];
  type: 'list' | 'paragraph' | 'table';
}

export interface Job {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: SalaryRange;
  type: JobType;
  remote: boolean;
  url: string;
  postedAt: Date;
  expiresAt?: Date;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
  period: 'hour' | 'year';
}

export enum JobSource {
  USAJOBS = 'USAJOBS',
  REMOTEOK = 'REMOTEOK',
  REMOTIVE = 'REMOTIVE',
  THE_MUSE = 'THE_MUSE',
  ADZUNA = 'ADZUNA',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  TEMPORARY = 'TEMPORARY',
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  status: ApplicationStatus;
  appliedAt: Date;
  notes?: string;
  tailoredResume?: string;
  coverLetter?: string;
}

export enum ApplicationStatus {
  SAVED = 'SAVED',
  APPLIED = 'APPLIED',
  INTERVIEW = 'INTERVIEW',
  REJECTED = 'REJECTED',
  OFFER = 'OFFER',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

// Export formats for resume
export enum ExportFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  HTML = 'HTML',
  TXT = 'TXT'
}

export interface ExportOptions {
  format: ExportFormat;
  includePhoto?: boolean;
  colorMode?: 'color' | 'grayscale' | 'blackwhite';
  paperSize?: 'A4' | 'Letter';
  margins?: 'normal' | 'narrow' | 'wide';
}
import { ResumeOptimizer } from '../src/services/resumeOptimizer';
import { ResumeParser } from '../src/utils/resumeParser';
import { JobDetails } from '../src/types/job';

describe('Resume Optimization Tests', () => {
  let optimizer: ResumeOptimizer;
  let parser: ResumeParser;

  beforeEach(() => {
    optimizer = new ResumeOptimizer();
    parser = new ResumeParser();
  });

  describe('ResumeOptimizer', () => {
    test('analyzes resume and calculates ATS score', () => {
      const sampleResume = `
        John Doe
        john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with 5+ years developing scalable web applications.
        
        EXPERIENCE
        Senior Software Engineer | Tech Company | 2020-Present
        - Developed and maintained React applications
        - Implemented REST APIs using Node.js
        - Managed team of 3 junior developers
        
        Software Engineer | StartUp Inc | 2018-2020
        - Created microservices architecture
        - Improved application performance by 40%
        
        EDUCATION
        Bachelor of Science in Computer Science
        State University | 2018
        
        SKILLS
        JavaScript, React, Node.js, Python, SQL, AWS, Docker, Git
      `;

      const analysis = optimizer.analyzeResume(sampleResume);

      expect(analysis.atsScore).toBeGreaterThan(60);
      expect(analysis.sections.hasContact).toBe(true);
      expect(analysis.sections.hasExperience).toBe(true);
      expect(analysis.sections.hasEducation).toBe(true);
      expect(analysis.sections.hasSkills).toBe(true);
      expect(analysis.sections.hasSummary).toBe(true);
      expect(analysis.keywords.found.length).toBeGreaterThan(0);
    });

    test('generates optimization suggestions', () => {
      const weakResume = `
        John Doe
        
        Work History:
        Worked at company for 3 years doing stuff
        
        School:
        Got degree
      `;

      const analysis = optimizer.analyzeResume(weakResume);

      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.suggestions.some(s => s.includes('contact'))).toBe(true);
      expect(analysis.suggestions.some(s => s.includes('skills'))).toBe(true);
      expect(analysis.atsScore).toBeLessThan(50);
    });

    test('calculates job match score', () => {
      const resume = `
        SKILLS
        JavaScript, React, Node.js, Python, AWS
        
        EXPERIENCE
        5 years as Software Engineer
      `;

      const jobDetails: JobDetails = {
        id: '1',
        title: 'Full Stack Developer',
        company: 'Tech Corp',
        description: 'Looking for JavaScript developer with React experience',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB']
      };

      const analysis = optimizer.analyzeResume(resume, jobDetails);

      expect(analysis.matchScore).toBeGreaterThan(0);
      expect(analysis.matchScore).toBeLessThanOrEqual(100);
    });

    test('identifies missing keywords from job description', () => {
      const resume = `
        SKILLS
        JavaScript, React, Python
      `;

      const jobDetails: JobDetails = {
        id: '1',
        title: 'Backend Developer',
        company: 'Tech Corp',
        description: 'Need experience with Node.js, MongoDB, and Docker',
        skills: ['Node.js', 'MongoDB', 'Docker', 'JavaScript']
      };

      const analysis = optimizer.analyzeResume(resume, jobDetails);

      expect(analysis.keywords.missing).toContain('Node.js');
      expect(analysis.keywords.missing).toContain('MongoDB');
      expect(analysis.keywords.missing).toContain('Docker');
      expect(analysis.keywords.found).toContain('JavaScript');
    });

    test('optimizes resume for specific job', () => {
      const resume = `
        EXPERIENCE
        Software Developer with 3 years experience
        
        SKILLS
        Python, Django, PostgreSQL
      `;

      const jobDetails: JobDetails = {
        id: '1',
        title: 'Python Developer',
        company: 'Tech Corp',
        description: 'Looking for Python developer with REST API experience',
        skills: ['Python', 'REST API', 'Docker', 'AWS']
      };

      const result = optimizer.optimizeForJob(resume, jobDetails);

      expect(result.optimizedResume).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.newScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ResumeParser', () => {
    test('parses resume sections correctly', () => {
      const resume = `
        Jane Smith
        jane@email.com
        
        SUMMARY
        Experienced developer
        
        EXPERIENCE
        Software Engineer at Company
        - Built applications
        - Led team projects
        
        EDUCATION
        Bachelor's in Computer Science
        University Name
        
        SKILLS
        JavaScript, Python, React
      `;

      const parsed = parser.parseResume(resume);

      expect(parsed.sections.contact).toContain('jane@email.com');
      expect(parsed.sections.summary).toContain('Experienced developer');
      expect(parsed.sections.experience).toBeDefined();
      expect(parsed.sections.education).toBeDefined();
      expect(parsed.sections.skills).toBeDefined();
      expect(parsed.metadata.hasEmail).toBe(true);
    });

    test('extracts contact information', () => {
      const resume = `
        John Doe
        john.doe@gmail.com
        (555) 123-4567
        linkedin.com/in/johndoe
        github.com/johndoe
      `;

      const contact = parser.extractContactInfo(resume);

      expect(contact.email).toBe('john.doe@gmail.com');
      expect(contact.phone).toContain('555');
      expect(contact.linkedIn).toContain('linkedin.com/in/johndoe');
      expect(contact.github).toContain('github.com/johndoe');
    });

    test('calculates years of experience', () => {
      const resume = `
        EXPERIENCE
        Senior Developer | 2018 - Present
        Junior Developer | 2016 - 2018
      `;

      const years = parser.extractExperienceYears(resume);

      expect(years).toBeGreaterThanOrEqual(5);
    });

    test('extracts detailed skills', () => {
      const resume = `
        TECHNICAL SKILLS
        Languages: JavaScript, Python, Java
        Frameworks: React, Django, Spring
        Tools: Git, Docker, Jenkins
        
        SOFT SKILLS
        Leadership, Communication, Problem Solving
      `;

      const skills = parser.extractSkillsDetailed(resume);

      expect(skills.languages).toContain('javascript');
      expect(skills.languages).toContain('python');
      expect(skills.frameworks).toContain('react');
      expect(skills.frameworks).toContain('django');
      expect(skills.tools).toContain('git');
      expect(skills.tools).toContain('docker');
      expect(skills.soft).toContain('leadership');
    });

    test('handles various resume formats', () => {
      const bulletResume = `
        • 5+ years experience
        • Skilled in React and Node.js
        • Led teams of 10+ developers
      `;

      const parsed = parser.parseResume(bulletResume);

      expect(parsed.metadata.wordCount).toBeGreaterThan(0);
      expect(parsed.fullText).toContain('React');
    });
  });

  describe('Integration Tests', () => {
    test('complete resume optimization workflow', () => {
      const resume = `
        John Developer
        john@dev.com | 555-0123
        
        EXPERIENCE
        Full Stack Developer | 2019-Present
        - Developed web applications using React and Node.js
        - Implemented CI/CD pipelines
        
        EDUCATION
        BS Computer Science | 2019
        
        SKILLS
        JavaScript, React, Node.js, MongoDB, Docker
      `;

      const jobDetails: JobDetails = {
        id: '1',
        title: 'Senior Full Stack Developer',
        company: 'Big Tech Co',
        description: 'Looking for senior developer with React, Node.js, and AWS experience',
        skills: ['React', 'Node.js', 'AWS', 'TypeScript', 'PostgreSQL']
      };

      // Parse resume
      const parsed = parser.parseResume(resume);
      expect(parsed.sections.experience).toBeDefined();

      // Analyze resume
      const analysis = optimizer.analyzeResume(resume, jobDetails);
      expect(analysis.atsScore).toBeGreaterThan(50);
      expect(analysis.matchScore).toBeGreaterThan(40);

      // Generate report
      const report = optimizer.generateOptimizationReport(analysis);
      expect(report).toContain('ATS Score');
      expect(report).toContain('RECOMMENDATIONS');

      // Optimize for job
      const optimized = optimizer.optimizeForJob(resume, jobDetails);
      expect(optimized.changes.length).toBeGreaterThan(0);
    });
  });
});
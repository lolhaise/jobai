import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'USER',
      profile: {
        create: {
          phone: '+1-555-123-4567',
          location: 'San Francisco, CA',
          timezone: 'America/Los_Angeles',
          desiredJobTitles: ['Software Engineer', 'Full Stack Developer', 'Senior Developer'],
          desiredSalaryMin: 120000,
          desiredSalaryMax: 180000,
          desiredLocations: ['San Francisco, CA', 'Remote', 'New York, NY'],
          openToRemote: true,
          openToHybrid: true,
          openToOnsite: false,
          workAuthorization: 'CITIZEN',
          requiresSponsorship: false,
          securityClearance: 'NONE',
          veteranStatus: 'NOT_VETERAN',
          disabilityStatus: 'NO',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          githubUrl: 'https://github.com/johndoe',
          portfolioUrl: 'https://johndoe.dev',
          jobSearchStatus: 'ACTIVE',
        },
      },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'PREMIUM',
      profile: {
        create: {
          phone: '+1-555-987-6543',
          location: 'Austin, TX',
          timezone: 'America/Chicago',
          desiredJobTitles: ['Product Manager', 'Senior PM', 'Director of Product'],
          desiredSalaryMin: 140000,
          desiredSalaryMax: 200000,
          desiredLocations: ['Austin, TX', 'Remote'],
          openToRemote: true,
          openToHybrid: true,
          openToOnsite: true,
          workAuthorization: 'CITIZEN',
          requiresSponsorship: false,
          jobSearchStatus: 'PASSIVE',
        },
      },
    },
  });

  // Create sample resumes
  const resume1 = await prisma.resume.create({
    data: {
      userId: user1.id,
      title: 'Software Engineer Resume',
      isDefault: true,
      version: 1,
      summary: 'Experienced full-stack developer with 5+ years building scalable web applications',
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          startDate: '2020-01-01',
          endDate: null,
          current: true,
          description: [
            'Led development of microservices architecture serving 1M+ users',
            'Reduced API response time by 40% through optimization',
            'Mentored junior developers and conducted code reviews',
          ],
        },
        {
          title: 'Software Engineer',
          company: 'StartupXYZ',
          location: 'Palo Alto, CA',
          startDate: '2018-06-01',
          endDate: '2019-12-31',
          current: false,
          description: [
            'Built RESTful APIs using Node.js and Express',
            'Implemented CI/CD pipelines reducing deployment time by 60%',
            'Developed React components for customer-facing dashboard',
          ],
        },
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          school: 'UC Berkeley',
          location: 'Berkeley, CA',
          graduationDate: '2018-05-01',
          gpa: 3.8,
        },
      ],
      skills: [
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'Python',
        'PostgreSQL',
        'AWS',
        'Docker',
        'Kubernetes',
        'Git',
      ],
      keywords: ['full-stack', 'react', 'node.js', 'microservices', 'aws'],
      atsScore: 85,
    },
  });

  const resume2 = await prisma.resume.create({
    data: {
      userId: user2.id,
      title: 'Product Manager Resume',
      isDefault: true,
      version: 1,
      summary: 'Strategic product manager with track record of launching successful B2B SaaS products',
      experience: [
        {
          title: 'Senior Product Manager',
          company: 'Enterprise Solutions Inc',
          location: 'Austin, TX',
          startDate: '2019-03-01',
          endDate: null,
          current: true,
          description: [
            'Increased product adoption by 150% through user research and feature prioritization',
            'Managed product roadmap for $10M ARR product line',
            'Led cross-functional team of 15 engineers and designers',
          ],
        },
      ],
      education: [
        {
          degree: 'MBA',
          school: 'University of Texas',
          location: 'Austin, TX',
          graduationDate: '2019-05-01',
        },
      ],
      skills: ['Product Strategy', 'Agile', 'JIRA', 'Analytics', 'SQL', 'Figma', 'A/B Testing'],
      keywords: ['product management', 'saas', 'b2b', 'agile', 'analytics'],
      atsScore: 82,
    },
  });

  // Create sample jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'Senior Software Engineer',
        company: 'TechGiant Corp',
        location: 'San Francisco, CA',
        remoteType: 'HYBRID',
        description:
          'We are looking for a Senior Software Engineer to join our team and help build the next generation of our platform.',
        requirements: [
          '5+ years of software development experience',
          'Strong experience with React and Node.js',
          'Experience with cloud platforms (AWS/GCP)',
          'Excellent problem-solving skills',
        ],
        responsibilities: [
          'Design and implement scalable backend services',
          'Collaborate with product managers and designers',
          'Mentor junior engineers',
          'Participate in code reviews',
        ],
        salaryMin: 150000,
        salaryMax: 200000,
        salaryCurrency: 'USD',
        salaryPeriod: 'YEARLY',
        sourceApi: 'manual',
        sourceId: 'manual-1',
        sourceUrl: 'https://example.com/jobs/1',
        category: 'Engineering',
        level: 'SENIOR',
        employmentType: 'FULL_TIME',
        postedAt: new Date('2024-01-15'),
        isActive: true,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Product Manager',
        company: 'Innovation Labs',
        location: 'Austin, TX',
        remoteType: 'REMOTE',
        description: 'Join our product team to drive the vision and strategy for our B2B SaaS platform.',
        requirements: [
          '3+ years of product management experience',
          'Experience with B2B SaaS products',
          'Strong analytical skills',
          'Excellent communication skills',
        ],
        responsibilities: [
          'Define product vision and roadmap',
          'Work closely with engineering and design teams',
          'Conduct user research and gather feedback',
          'Analyze metrics and make data-driven decisions',
        ],
        salaryMin: 130000,
        salaryMax: 170000,
        salaryCurrency: 'USD',
        salaryPeriod: 'YEARLY',
        sourceApi: 'manual',
        sourceId: 'manual-2',
        sourceUrl: 'https://example.com/jobs/2',
        category: 'Product',
        level: 'MID',
        employmentType: 'FULL_TIME',
        postedAt: new Date('2024-01-20'),
        isActive: true,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Junior Frontend Developer',
        company: 'StartupHub',
        location: 'New York, NY',
        remoteType: 'ONSITE',
        description: 'Great opportunity for a junior developer to grow with our fast-paced startup.',
        requirements: [
          '1+ years of web development experience',
          'Knowledge of React and modern JavaScript',
          'Familiarity with Git and version control',
          'Eager to learn and grow',
        ],
        responsibilities: [
          'Build responsive web applications',
          'Work with senior developers on feature implementation',
          'Write clean, maintainable code',
          'Participate in agile ceremonies',
        ],
        salaryMin: 70000,
        salaryMax: 90000,
        salaryCurrency: 'USD',
        salaryPeriod: 'YEARLY',
        sourceApi: 'manual',
        sourceId: 'manual-3',
        sourceUrl: 'https://example.com/jobs/3',
        category: 'Engineering',
        level: 'ENTRY',
        employmentType: 'FULL_TIME',
        postedAt: new Date('2024-01-25'),
        isActive: true,
      },
    }),
  ]);

  // Create sample applications
  const application1 = await prisma.application.create({
    data: {
      userId: user1.id,
      jobId: jobs[0].id,
      resumeId: resume1.id,
      status: 'APPLIED',
      stage: 'SCREENING',
      appliedAt: new Date('2024-01-20'),
      applicationUrl: 'https://example.com/application/123',
      notes: 'Applied through company website. Expecting to hear back within a week.',
    },
  });

  const application2 = await prisma.application.create({
    data: {
      userId: user2.id,
      jobId: jobs[1].id,
      resumeId: resume2.id,
      status: 'IN_PROGRESS',
      stage: 'PHONE_SCREEN',
      appliedAt: new Date('2024-01-22'),
      notes: 'Had initial recruiter call. Phone screen scheduled for next week.',
    },
  });

  // Create sample saved searches
  const savedSearch1 = await prisma.savedSearch.create({
    data: {
      userId: user1.id,
      name: 'Remote Senior Engineering Roles',
      keywords: 'senior software engineer',
      jobTitles: ['Senior Software Engineer', 'Staff Engineer', 'Principal Engineer'],
      locations: ['Remote', 'San Francisco, CA'],
      remoteOnly: false,
      salaryMin: 150000,
      categories: ['Engineering', 'Technology'],
      experienceLevels: ['SENIOR', 'LEAD'],
      isActive: true,
      emailAlerts: true,
    },
  });

  // Create sample activities
  await prisma.activity.createMany({
    data: [
      {
        userId: user1.id,
        applicationId: application1.id,
        type: 'APPLICATION_SUBMITTED',
        description: 'Applied to Senior Software Engineer at TechGiant Corp',
      },
      {
        userId: user2.id,
        applicationId: application2.id,
        type: 'APPLICATION_SUBMITTED',
        description: 'Applied to Product Manager at Innovation Labs',
      },
      {
        userId: user1.id,
        type: 'RESUME_UPLOADED',
        description: 'Uploaded Software Engineer Resume',
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log(`  - Created 2 users`);
  console.log(`  - Created 2 resumes`);
  console.log(`  - Created ${jobs.length} jobs`);
  console.log(`  - Created 2 applications`);
  console.log(`  - Created 1 saved search`);
  console.log(`  - Created 3 activity logs`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
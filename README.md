# JobAI - Job Application Automation Platform

An AI-powered platform that automates job searching and application processes, featuring intelligent resume tailoring and application tracking.

## Features

- **Job Aggregation**: Search across multiple job boards (USAJOBS, RemoteOK, Remotive, The Muse)
- **AI Resume Tailoring**: Automatically optimize resumes for each job application
- **Application Tracking**: Manage all your applications in one place
- **Smart Matching**: AI-powered job recommendations based on your profile
- **Cover Letter Generation**: Create tailored cover letters for each application

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL, Redis
- **AI**: OpenAI API, Anthropic Claude API
- **Monorepo**: Turborepo, pnpm workspaces

## Project Structure

```
jobai/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema and client
│   ├── shared/       # Shared types and utilities
│   ├── ui/           # Shared UI components
│   └── job-apis/     # Job board API integrations
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/jobai.git
cd jobai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Start local services:
```bash
docker-compose up -d
```

5. Set up the database:
```bash
cd packages/database
pnpm prisma migrate dev
pnpm prisma generate
```

6. Start the development servers:
```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api
- pgAdmin: http://localhost:5050

## Development

### Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run ESLint across the workspace
- `pnpm test` - Run tests across the workspace
- `pnpm type-check` - Run TypeScript type checking

### Working with the Database

```bash
# Generate Prisma client
cd packages/database
pnpm prisma generate

# Create a new migration
pnpm prisma migrate dev --name your-migration-name

# Open Prisma Studio
pnpm prisma studio
```

### Adding New Packages

1. Create a new package directory:
```bash
mkdir packages/your-package
cd packages/your-package
pnpm init
```

2. Add it to the workspace in `pnpm-workspace.yaml`

3. Install dependencies:
```bash
pnpm add your-dependency --filter @jobai/your-package
```

## API Documentation

The API documentation is available at http://localhost:4000/api when running the backend in development mode.

### Key API Endpoints

- **Authentication**
  - `POST /auth/signup` - Register new user
  - `POST /auth/login` - User login
  - `GET /auth/me` - Get current user

- **Jobs**
  - `GET /jobs/search` - Search for jobs
  - `GET /jobs/:id` - Get job details

- **Resumes**
  - `POST /resumes` - Upload resume
  - `POST /resumes/tailor` - Tailor resume for job

- **Applications**
  - `GET /applications` - List applications
  - `POST /applications` - Create application

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key for AI features
- Job API keys for various job boards

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@jobai.com or open an issue in the GitHub repository.
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE: '/users/update',
  },
  RESUMES: {
    LIST: '/resumes',
    CREATE: '/resumes',
    GET: (id: string) => `/resumes/${id}`,
    UPDATE: (id: string) => `/resumes/${id}`,
    DELETE: (id: string) => `/resumes/${id}`,
    PARSE: '/resumes/parse',
    TAILOR: '/resumes/tailor',
  },
  JOBS: {
    SEARCH: '/jobs/search',
    GET: (id: string) => `/jobs/${id}`,
    SAVE: (id: string) => `/jobs/${id}/save`,
  },
  APPLICATIONS: {
    LIST: '/applications',
    CREATE: '/applications',
    GET: (id: string) => `/applications/${id}`,
    UPDATE: (id: string) => `/applications/${id}`,
    DELETE: (id: string) => `/applications/${id}`,
  },
};

export const JOB_SOURCES = {
  USAJOBS: {
    name: 'USAJobs',
    baseUrl: 'https://data.usajobs.gov/api/',
    rateLimit: 1000, // requests per hour
  },
  REMOTEOK: {
    name: 'RemoteOK',
    baseUrl: 'https://remoteok.io/api',
    rateLimit: 100,
  },
  REMOTIVE: {
    name: 'Remotive',
    baseUrl: 'https://remotive.io/api/',
    rateLimit: 100,
  },
  THE_MUSE: {
    name: 'The Muse',
    baseUrl: 'https://www.themuse.com/api/public/',
    rateLimit: 500,
  },
};

export const FILE_SIZE_LIMITS = {
  RESUME: 5 * 1024 * 1024, // 5MB
  PROFILE_IMAGE: 2 * 1024 * 1024, // 2MB
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};
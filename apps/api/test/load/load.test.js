import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],               // Custom error rate below 10%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'Test123!@#',
  name: 'Load Test User',
};

// Setup function - run once before tests
export function setup() {
  // Create test user for authentication
  const signupRes = http.post(
    `${BASE_URL}/auth/signup`,
    JSON.stringify(TEST_USER),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (signupRes.status === 201 || signupRes.status === 409) {
    // User created or already exists, now signin
    const signinRes = http.post(
      `${BASE_URL}/auth/signin`,
      JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (signinRes.status === 200) {
      const data = JSON.parse(signinRes.body);
      return { token: data.access_token };
    }
  }

  throw new Error('Failed to setup test user');
}

// Main test scenarios
export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Scenario 1: Get user profile (most common)
  const profileRes = http.get(`${BASE_URL}/auth/me`, { headers });
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => JSON.parse(r.body).email !== undefined,
  });
  errorRate.add(profileRes.status !== 200);

  sleep(1);

  // Scenario 2: Search jobs
  const searchRes = http.get(`${BASE_URL}/jobs/search?q=developer&limit=10`, {
    headers,
  });
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => JSON.parse(r.body).data !== undefined,
  });
  errorRate.add(searchRes.status !== 200);

  sleep(1);

  // Scenario 3: Get user resumes
  const resumesRes = http.get(`${BASE_URL}/resumes`, { headers });
  check(resumesRes, {
    'resumes status is 200': (r) => r.status === 200,
    'resumes returns array': (r) => Array.isArray(JSON.parse(r.body).data),
  });
  errorRate.add(resumesRes.status !== 200);

  sleep(1);

  // Scenario 4: Get applications
  const applicationsRes = http.get(`${BASE_URL}/applications`, { headers });
  check(applicationsRes, {
    'applications status is 200': (r) => r.status === 200,
    'applications returns data': (r) => JSON.parse(r.body).data !== undefined,
  });
  errorRate.add(applicationsRes.status !== 200);

  sleep(2);
}

// Teardown function - run once after tests
export function teardown(data) {
  // Optional: Clean up test data
  console.log('Load test completed');
}

/**
 * Additional test scenarios for specific endpoints
 */

// Test job aggregation performance
export function testJobAggregation() {
  const token = setup().token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const scenarios = [
    { location: 'Remote', salary_min: 50000 },
    { location: 'New York', jobType: 'FULL_TIME' },
    { experienceLevel: 'SENIOR', skills: 'JavaScript,React' },
    { company: 'Google', posted_after: '2024-01-01' },
  ];

  scenarios.forEach((params) => {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const res = http.get(`${BASE_URL}/jobs/search?${queryString}`, { headers });
    
    check(res, {
      'aggregation status is 200': (r) => r.status === 200,
      'aggregation response time < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

// Test resume upload performance
export function testResumeUpload() {
  const token = setup().token;
  
  // Create a mock PDF file
  const file = open('./test-resume.pdf', 'b');
  
  const formData = {
    file: http.file(file, 'test-resume.pdf', 'application/pdf'),
  };

  const res = http.post(`${BASE_URL}/resumes/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(res, {
    'upload status is 201': (r) => r.status === 201,
    'upload returns resume data': (r) => JSON.parse(r.body).id !== undefined,
    'upload response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}

// Test concurrent user sessions
export function testConcurrentSessions() {
  const VUs = 50; // Virtual users
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    const email = `loadtest-${__VU}-${i}@example.com`;
    
    // Create user
    const signupRes = http.post(
      `${BASE_URL}/auth/signup`,
      JSON.stringify({
        email,
        password: 'Test123!@#',
        name: `Load Test User ${__VU}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (signupRes.status === 201) {
      const data = JSON.parse(signupRes.body);
      const token = data.access_token;

      // Perform authenticated operations
      const operations = [
        () => http.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        () => http.get(`${BASE_URL}/jobs/search?q=test`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        () => http.get(`${BASE_URL}/resumes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ];

      // Execute random operation
      const op = operations[Math.floor(Math.random() * operations.length)];
      const res = op();
      
      check(res, {
        'concurrent operation successful': (r) => r.status === 200,
      });
    }

    sleep(0.5);
  }
}

// Test rate limiting
export function testRateLimiting() {
  const token = setup().token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Make rapid requests to test rate limiting
  const requests = [];
  for (let i = 0; i < 100; i++) {
    requests.push(
      http.get(`${BASE_URL}/jobs/search?q=test&page=${i}`, {
        headers,
        tags: { name: 'RateLimitTest' },
      })
    );
  }

  // Check that rate limiting is working
  const rateLimited = requests.filter((r) => r.status === 429);
  check(rateLimited, {
    'rate limiting enforced': () => rateLimited.length > 0,
    'rate limit headers present': (responses) =>
      responses.length > 0 &&
      responses[0].headers['X-RateLimit-Limit'] !== undefined,
  });
}
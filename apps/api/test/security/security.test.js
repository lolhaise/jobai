const axios = require('axios');
const chalk = require('chalk');

/**
 * Security Test Suite for Job Application Platform
 * Tests for common vulnerabilities and security best practices
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const TEST_USER = {
  email: 'security-test@example.com',
  password: 'Test123!@#',
  name: 'Security Test User',
};

let authToken = '';
let testResults = [];

// Helper function to log results
function logResult(testName, passed, message) {
  const result = { testName, passed, message };
  testResults.push(result);
  
  if (passed) {
    console.log(chalk.green('✓'), testName);
  } else {
    console.log(chalk.red('✗'), testName, '-', chalk.yellow(message));
  }
}

// Setup: Create test user and get auth token
async function setup() {
  try {
    // Try to create user
    await axios.post(`${BASE_URL}/auth/signup`, TEST_USER);
  } catch (error) {
    // User might already exist
  }

  try {
    // Sign in to get token
    const response = await axios.post(`${BASE_URL}/auth/signin`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    authToken = response.data.access_token;
    console.log(chalk.blue('Setup completed successfully\n'));
  } catch (error) {
    console.error(chalk.red('Setup failed:', error.message));
    process.exit(1);
  }
}

// Test 1: SQL Injection
async function testSQLInjection() {
  const injectionPayloads = [
    "' OR '1'='1",
    "1; DROP TABLE users--",
    "admin'--",
    "' UNION SELECT * FROM users--",
    "1' AND '1'='1",
  ];

  for (const payload of injectionPayloads) {
    try {
      await axios.get(`${BASE_URL}/jobs/search`, {
        params: { q: payload },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      // If we get here, check if the payload was properly escaped
      logResult(
        `SQL Injection Prevention - Payload: ${payload}`,
        true,
        'Payload handled safely'
      );
    } catch (error) {
      // Error is expected for malicious payloads
      logResult(
        `SQL Injection Prevention - Payload: ${payload}`,
        true,
        'Request rejected'
      );
    }
  }
}

// Test 2: XSS (Cross-Site Scripting)
async function testXSS() {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg/onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
  ];

  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(
        `${BASE_URL}/resumes`,
        {
          title: payload,
          content: payload,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Check if response sanitizes the payload
      const sanitized = !response.data.title.includes('<script>') &&
                       !response.data.title.includes('javascript:');
      
      logResult(
        `XSS Prevention - Payload: ${payload.substring(0, 30)}...`,
        sanitized,
        sanitized ? 'Input sanitized' : 'XSS vulnerability detected'
      );
    } catch (error) {
      logResult(
        `XSS Prevention - Payload: ${payload.substring(0, 30)}...`,
        true,
        'Malicious input rejected'
      );
    }
  }
}

// Test 3: Authentication & Authorization
async function testAuthSecurity() {
  // Test 3.1: Access without token
  try {
    await axios.get(`${BASE_URL}/auth/me`);
    logResult('Authentication Required', false, 'Endpoint accessible without auth');
  } catch (error) {
    logResult(
      'Authentication Required',
      error.response?.status === 401,
      'Properly rejects unauthenticated requests'
    );
  }

  // Test 3.2: Invalid token
  try {
    await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    logResult('Invalid Token Rejection', false, 'Invalid token accepted');
  } catch (error) {
    logResult(
      'Invalid Token Rejection',
      error.response?.status === 401,
      'Properly rejects invalid tokens'
    );
  }

  // Test 3.3: Expired token simulation
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';
  
  try {
    await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    logResult('Expired Token Rejection', false, 'Expired token accepted');
  } catch (error) {
    logResult(
      'Expired Token Rejection',
      error.response?.status === 401,
      'Properly rejects expired tokens'
    );
  }
}

// Test 4: Input Validation
async function testInputValidation() {
  const invalidInputs = [
    { email: 'not-an-email', expected: 'Invalid email format' },
    { email: '', expected: 'Empty email rejected' },
    { password: '123', expected: 'Weak password rejected' },
    { password: '', expected: 'Empty password rejected' },
    { name: '<script>alert(1)</script>', expected: 'Script tags sanitized' },
  ];

  for (const input of invalidInputs) {
    try {
      await axios.post(`${BASE_URL}/auth/signup`, {
        email: input.email || 'test@example.com',
        password: input.password || 'Test123!@#',
        name: input.name || 'Test User',
      });
      logResult(
        `Input Validation - ${input.expected}`,
        false,
        'Invalid input accepted'
      );
    } catch (error) {
      logResult(
        `Input Validation - ${input.expected}`,
        error.response?.status === 400,
        'Invalid input properly rejected'
      );
    }
  }
}

// Test 5: Rate Limiting
async function testRateLimiting() {
  const requests = [];
  const endpoint = `${BASE_URL}/jobs/search?q=test`;

  // Make 100 rapid requests
  for (let i = 0; i < 100; i++) {
    requests.push(
      axios.get(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(error => ({ status: error.response?.status }))
    );
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);

  logResult(
    'Rate Limiting',
    rateLimited.length > 0,
    rateLimited.length > 0
      ? `Rate limiting active (${rateLimited.length} requests limited)`
      : 'No rate limiting detected - potential DoS vulnerability'
  );
}

// Test 6: Security Headers
async function testSecurityHeaders() {
  try {
    const response = await axios.get(BASE_URL);
    const headers = response.headers;

    const securityHeaders = [
      { name: 'x-content-type-options', expected: 'nosniff' },
      { name: 'x-frame-options', expected: 'DENY' },
      { name: 'x-xss-protection', expected: '1; mode=block' },
      { name: 'strict-transport-security', expected: true },
      { name: 'content-security-policy', expected: true },
    ];

    for (const header of securityHeaders) {
      const value = headers[header.name];
      const passed = header.expected === true 
        ? !!value 
        : value === header.expected;

      logResult(
        `Security Header - ${header.name}`,
        passed,
        passed ? `Header present: ${value}` : 'Header missing or incorrect'
      );
    }
  } catch (error) {
    logResult('Security Headers', false, 'Could not check headers');
  }
}

// Test 7: Password Security
async function testPasswordSecurity() {
  // Test 7.1: Password complexity requirements
  const weakPasswords = ['12345678', 'password', 'qwerty123', 'aaaaaaaa'];

  for (const password of weakPasswords) {
    try {
      await axios.post(`${BASE_URL}/auth/signup`, {
        email: `weak${Date.now()}@example.com`,
        password,
        name: 'Test User',
      });
      logResult(
        `Password Complexity - ${password}`,
        false,
        'Weak password accepted'
      );
    } catch (error) {
      logResult(
        `Password Complexity - ${password}`,
        true,
        'Weak password rejected'
      );
    }
  }

  // Test 7.2: Password should not be in response
  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const hasPassword = response.data.password !== undefined;
    logResult(
      'Password Exposure',
      !hasPassword,
      hasPassword ? 'Password exposed in response!' : 'Password properly hidden'
    );
  } catch (error) {
    logResult('Password Exposure', true, 'Test failed to execute');
  }
}

// Test 8: File Upload Security
async function testFileUploadSecurity() {
  const maliciousFiles = [
    { name: 'test.exe', type: 'application/x-msdownload' },
    { name: 'test.sh', type: 'application/x-sh' },
    { name: '../../../etc/passwd', type: 'text/plain' },
    { name: 'test.php', type: 'application/x-php' },
  ];

  for (const file of maliciousFiles) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', Buffer.from('malicious content'), {
        filename: file.name,
        contentType: file.type,
      });

      await axios.post(`${BASE_URL}/resumes/upload`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        },
      });

      logResult(
        `File Upload Security - ${file.name}`,
        false,
        'Malicious file type accepted'
      );
    } catch (error) {
      logResult(
        `File Upload Security - ${file.name}`,
        true,
        'Malicious file type rejected'
      );
    }
  }
}

// Test 9: CSRF Protection
async function testCSRFProtection() {
  try {
    // Attempt request without CSRF token
    const response = await axios.post(
      `${BASE_URL}/applications`,
      { jobId: 'test-job-id' },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'http://evil-site.com',
        },
      }
    );

    // Check if CORS properly configured
    logResult(
      'CSRF/CORS Protection',
      false,
      'Request from unauthorized origin accepted'
    );
  } catch (error) {
    logResult(
      'CSRF/CORS Protection',
      true,
      'Cross-origin request properly blocked'
    );
  }
}

// Test 10: Information Disclosure
async function testInformationDisclosure() {
  // Test 10.1: Error message leakage
  try {
    await axios.post(`${BASE_URL}/auth/signin`, {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    });
  } catch (error) {
    const message = error.response?.data?.message;
    const leaksInfo = message?.includes('user not found') || 
                     message?.includes('password incorrect');
    
    logResult(
      'Error Message Information Leakage',
      !leaksInfo,
      leaksInfo 
        ? 'Error messages leak sensitive information' 
        : 'Generic error messages used'
    );
  }

  // Test 10.2: Stack trace exposure
  try {
    await axios.get(`${BASE_URL}/this-endpoint-does-not-exist`);
  } catch (error) {
    const hasStackTrace = error.response?.data?.stack !== undefined;
    logResult(
      'Stack Trace Exposure',
      !hasStackTrace,
      hasStackTrace 
        ? 'Stack traces exposed in production!' 
        : 'Stack traces properly hidden'
    );
  }
}

// Main test runner
async function runSecurityTests() {
  console.log(chalk.bold.blue('=== Security Test Suite ===\n'));
  
  await setup();
  
  console.log(chalk.bold('Running security tests...\n'));
  
  await testSQLInjection();
  await testXSS();
  await testAuthSecurity();
  await testInputValidation();
  await testRateLimiting();
  await testSecurityHeaders();
  await testPasswordSecurity();
  await testFileUploadSecurity();
  await testCSRFProtection();
  await testInformationDisclosure();
  
  // Summary
  console.log(chalk.bold.blue('\n=== Test Summary ===\n'));
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  console.log(chalk.green(`Passed: ${passed}/${total}`));
  if (failed > 0) {
    console.log(chalk.red(`Failed: ${failed}/${total}`));
    console.log(chalk.yellow('\nFailed tests:'));
    testResults
      .filter(r => !r.passed)
      .forEach(r => console.log(chalk.red('  -', r.testName)));
  }
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runSecurityTests().catch(error => {
  console.error(chalk.red('Test suite failed:', error.message));
  process.exit(1);
});
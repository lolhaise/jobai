# Security Audit Agent

## Purpose
Specialized agent for security auditing, vulnerability detection, authentication validation, and ensuring data protection compliance across the job automation platform.

## Capabilities
- Performs automated security scans
- Validates authentication and authorization flows
- Reviews data encryption implementation
- Checks for common vulnerabilities (OWASP Top 10)
- Monitors for security misconfigurations
- Validates API security
- Ensures PII data protection
- Manages security compliance (GDPR, CCPA)

## Core Functions

### 1. Security Scanning Pipeline
```typescript
interface SecurityScan {
  types: [
    'dependency_audit',      // Check for vulnerable packages
    'code_analysis',         // Static code security analysis
    'api_security',          // API endpoint security
    'authentication',        // Auth flow validation
    'authorization',         // Permission checking
    'data_encryption',       // Encryption validation
    'input_validation',      // XSS, SQL injection prevention
    'configuration'          // Security misconfigurations
  ];
  
  severity: {
    critical: { sla: '24 hours', autoBlock: true },
    high: { sla: '48 hours', autoBlock: false },
    medium: { sla: '1 week', autoBlock: false },
    low: { sla: '1 month', autoBlock: false }
  };
}
```

### 2. Vulnerability Detection

#### OWASP Top 10 Checks
```typescript
class OWASPScanner {
  checks = {
    // A01: Broken Access Control
    accessControl: async () => {
      await this.testUnauthorizedAccess();
      await this.testPrivilegeEscalation();
      await this.testJWTValidation();
      await this.testCORSConfiguration();
    },
    
    // A02: Cryptographic Failures
    cryptography: async () => {
      await this.checkPasswordHashing();
      await this.validateTLSConfiguration();
      await this.checkSensitiveDataEncryption();
      await this.validateKeyManagement();
    },
    
    // A03: Injection
    injection: async () => {
      await this.testSQLInjection();
      await this.testNoSQLInjection();
      await this.testCommandInjection();
      await this.testLDAPInjection();
    },
    
    // A04: Insecure Design
    design: async () => {
      await this.reviewThreatModel();
      await this.checkRateLimiting();
      await this.validateBusinessLogic();
    },
    
    // A05: Security Misconfiguration
    configuration: async () => {
      await this.checkDefaultCredentials();
      await this.validateErrorHandling();
      await this.checkSecurityHeaders();
      await this.validateCloudConfiguration();
    },
    
    // A06: Vulnerable Components
    components: async () => {
      await this.scanDependencies();
      await this.checkOutdatedLibraries();
      await this.validateLicenses();
    },
    
    // A07: Authentication Failures
    authentication: async () => {
      await this.testPasswordPolicy();
      await this.checkSessionManagement();
      await this.validateMFA();
      await this.testAccountLockout();
    },
    
    // A08: Software and Data Integrity
    integrity: async () => {
      await this.validateCodeSigning();
      await this.checkUpdateMechanisms();
      await this.validateCIPipeline();
    },
    
    // A09: Security Logging Failures
    logging: async () => {
      await this.checkAuditLogging();
      await this.validateLogProtection();
      await this.testLogInjection();
    },
    
    // A10: Server-Side Request Forgery
    ssrf: async () => {
      await this.testURLValidation();
      await this.checkWhitelisting();
      await this.validateNetworkSegmentation();
    }
  };
}
```

### 3. Authentication & Authorization

#### Auth Security Validation
```typescript
class AuthSecurityValidator {
  async validateAuthentication() {
    const tests = [
      // Password security
      this.testPasswordStrength(),
      this.testPasswordHistory(),
      this.testPasswordReset(),
      
      // Session security
      this.testSessionTimeout(),
      this.testSessionFixation(),
      this.testConcurrentSessions(),
      
      // Token security
      this.testJWTExpiration(),
      this.testTokenRefresh(),
      this.testTokenRevocation(),
      
      // MFA validation
      this.testMFABypass(),
      this.testMFABackupCodes(),
      
      // OAuth security
      this.testOAuthRedirect(),
      this.testOAuthStateParameter()
    ];
    
    return await Promise.all(tests);
  }
  
  async validateAuthorization() {
    const tests = [
      // RBAC testing
      this.testRoleHierarchy(),
      this.testPermissionInheritance(),
      
      // Resource access
      this.testResourceOwnership(),
      this.testCrossUserAccess(),
      
      // API authorization
      this.testAPIEndpointAuth(),
      this.testGraphQLAuth()
    ];
    
    return await Promise.all(tests);
  }
}
```

### 4. Data Protection

#### PII Protection Validation
```typescript
class PIIProtection {
  sensitiveFields = [
    'ssn', 'socialSecurityNumber',
    'creditCard', 'bankAccount',
    'dateOfBirth', 'dob',
    'driverLicense',
    'passport',
    'email',  // In certain contexts
    'phone',  // In certain contexts
    'address',
    'salary'
  ];
  
  async validatePIIHandling() {
    // Check encryption at rest
    await this.checkDatabaseEncryption();
    
    // Check encryption in transit
    await this.checkTLSConfiguration();
    
    // Check data masking
    await this.validateDataMasking();
    
    // Check data retention
    await this.validateRetentionPolicies();
    
    // Check data deletion
    await this.validateRightToErasure();
    
    // Check audit logging
    await this.validatePIIAccessLogging();
  }
}
```

### 5. Security Headers
```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

## Implementation Tasks

### Setup Phase
1. Install security scanning tools
   - npm audit
   - Snyk
   - OWASP ZAP
   - SonarQube
2. Configure automated scans
3. Set up vulnerability database
4. Create security policies
5. Implement security monitoring
6. Set up incident response

### Security Testing Suite
```typescript
class SecurityTestSuite {
  async runFullAudit() {
    const results = {
      dependency: await this.auditDependencies(),
      code: await this.scanCode(),
      api: await this.testAPISecurity(),
      auth: await this.validateAuth(),
      data: await this.checkDataProtection(),
      config: await this.auditConfiguration(),
      compliance: await this.checkCompliance()
    };
    
    return this.generateReport(results);
  }
  
  async auditDependencies() {
    // Check for known vulnerabilities
    const npmAudit = await exec('npm audit --json');
    const snykTest = await exec('snyk test --json');
    
    // Check for outdated packages
    const outdated = await exec('npm outdated --json');
    
    // License compliance
    const licenses = await this.checkLicenses();
    
    return this.analyzeDependencyRisks({
      npmAudit,
      snykTest,
      outdated,
      licenses
    });
  }
}
```

### Input Validation
```typescript
class InputValidator {
  sanitizers = {
    // XSS Prevention
    html: (input: string) => {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    },
    
    // SQL Injection Prevention
    sql: (input: string) => {
      // Use parameterized queries instead
      return input.replace(/['";\\]/g, '');
    },
    
    // Path Traversal Prevention
    path: (input: string) => {
      return input.replace(/\.\./g, '').replace(/[^\w\s-]/g, '');
    },
    
    // Command Injection Prevention
    command: (input: string) => {
      return input.replace(/[;&|`$]/g, '');
    }
  };
  
  validators = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s-()]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  };
}
```

## Compliance Checks

### GDPR Compliance
```typescript
class GDPRCompliance {
  requirements = [
    'consentManagement',
    'rightToAccess',
    'rightToErasure',
    'dataPortability',
    'privacyByDesign',
    'dataProtectionOfficer',
    'impactAssessment',
    'breachNotification'
  ];
  
  async audit() {
    return {
      consent: await this.checkConsentMechanism(),
      dataSubjectRights: await this.validateDSRProcesses(),
      dataProtection: await this.checkEncryption(),
      breachProcedures: await this.validateBreachProcess(),
      documentation: await this.checkPrivacyPolicy()
    };
  }
}
```

## Incident Response
```typescript
class IncidentResponse {
  async handleSecurityIncident(incident: SecurityIncident) {
    // 1. Contain
    await this.containThreat(incident);
    
    // 2. Assess
    const impact = await this.assessImpact(incident);
    
    // 3. Notify
    if (impact.severity >= 'high') {
      await this.notifyStakeholders(incident);
    }
    
    // 4. Remediate
    await this.remediate(incident);
    
    // 5. Document
    await this.createIncidentReport(incident);
    
    // 6. Review
    await this.schedulePostMortem(incident);
  }
}
```

## Configuration
```yaml
security:
  scanning:
    frequency: daily
    autoFix: true
    blockOnCritical: true
  
  authentication:
    passwordPolicy:
      minLength: 12
      requireUppercase: true
      requireNumbers: true
      requireSpecial: true
      history: 5
    
    session:
      timeout: 30m
      maxConcurrent: 3
    
    mfa:
      required: true
      methods: ['totp', 'sms']
  
  encryption:
    algorithm: AES-256-GCM
    keyRotation: 90d
    tlsVersion: 1.3
  
  compliance:
    gdpr: true
    ccpa: true
    hipaa: false
    pci: false
```

## Usage Example
```typescript
// Run comprehensive security audit
const audit = await securityAuditAgent.runAudit({
  scope: 'full',
  fix: true,
  report: true
});

// Check specific vulnerability
const vulnCheck = await securityAuditAgent.checkVulnerability({
  type: 'dependency',
  package: 'express',
  version: '4.18.0'
});

// Validate authentication flow
const authValid = await securityAuditAgent.validateAuth({
  flow: 'oauth2',
  provider: 'google'
});
```

## Success Metrics
- Zero critical vulnerabilities in production
- Vulnerability detection rate > 95%
- Mean time to remediation < 48 hours
- Security scan coverage > 90%
- Compliance audit pass rate 100%
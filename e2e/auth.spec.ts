import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should display landing page with signup CTA', async ({ page }) => {
    // Check landing page elements
    await expect(page.locator('h1')).toContainText('Find Your Dream Job');
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    // Click on Get Started button
    await page.getByRole('link', { name: /Get Started/i }).click();
    
    // Should redirect to signup page
    await expect(page).toHaveURL('/auth/signup');
    await expect(page.locator('h2')).toContainText('Create your account');
    
    // Check form fields
    await expect(page.getByLabel(/Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test('should signup a new user', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Fill in the signup form
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await page.getByLabel(/Name/i).fill('Test User');
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/Password/i).fill('Test123!@#');
    
    // Submit the form
    await page.getByRole('button', { name: /Sign Up/i }).click();
    
    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Submit empty form
    await page.getByRole('button', { name: /Sign Up/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/Name is required/i)).toBeVisible();
    await expect(page.getByText(/Email is required/i)).toBeVisible();
    await expect(page.getByText(/Password is required/i)).toBeVisible();
    
    // Test invalid email
    await page.getByLabel(/Email/i).fill('invalid-email');
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await expect(page.getByText(/Invalid email address/i)).toBeVisible();
    
    // Test weak password
    await page.getByLabel(/Password/i).fill('123');
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
  });

  test('should signin existing user', async ({ page }) => {
    // First create a user
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'Test123!@#';
    
    // Signup first
    await page.goto('/auth/signup');
    await page.getByLabel(/Name/i).fill('Test User');
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/Password/i).fill(testPassword);
    await page.getByRole('button', { name: /Sign Up/i }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.getByRole('button', { name: /User Menu/i }).click();
    await page.getByRole('menuitem', { name: /Logout/i }).click();
    
    // Should redirect to homepage
    await expect(page).toHaveURL('/');
    
    // Navigate to signin page
    await page.getByRole('link', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/auth/signin');
    
    // Fill in signin form
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/Password/i).fill(testPassword);
    
    // Submit the form
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin');
    
    // Fill in invalid credentials
    await page.getByLabel(/Email/i).fill('nonexistent@example.com');
    await page.getByLabel(/Password/i).fill('WrongPassword');
    
    // Submit the form
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    // Should show error message
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  });

  test('should protect dashboard route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to signin page
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should handle password reset flow', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin');
    
    // Click on forgot password link
    await page.getByRole('link', { name: /Forgot password/i }).click();
    
    // Should navigate to reset password page
    await expect(page).toHaveURL('/auth/reset-password');
    await expect(page.locator('h2')).toContainText('Reset your password');
    
    // Enter email
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByRole('button', { name: /Send reset link/i }).click();
    
    // Should show success message
    await expect(page.getByText(/Password reset link sent/i)).toBeVisible();
  });
});

test.describe('Authenticated User Flow', () => {
  // Helper function to login before tests
  test.use({
    storageState: 'playwright/.auth/user.json',
  });

  test.beforeAll(async ({ browser }) => {
    // Create a new authenticated session
    const page = await browser.newPage();
    
    // Create a test user and login
    const timestamp = Date.now();
    const testEmail = `auth-test${timestamp}@example.com`;
    
    await page.goto('/auth/signup');
    await page.getByLabel(/Name/i).fill('Auth Test User');
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/Password/i).fill('Test123!@#');
    await page.getByRole('button', { name: /Sign Up/i }).click();
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Save authentication state
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
    await page.close();
  });

  test('should access dashboard when authenticated', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('/dashboard');
    
    // Should stay on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
    
    // Check dashboard elements
    await expect(page.getByText(/Total Applications/i)).toBeVisible();
    await expect(page.getByText(/Interview Rate/i)).toBeVisible();
    await expect(page.getByText(/Response Time/i)).toBeVisible();
  });

  test('should navigate to job search', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click on job search link
    await page.getByRole('link', { name: /Find Jobs/i }).click();
    
    // Should navigate to job search page
    await expect(page).toHaveURL('/jobs/search');
    await expect(page.locator('h1')).toContainText('Job Search');
    
    // Check search components
    await expect(page.getByPlaceholder(/Search for jobs/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible();
  });

  test('should navigate to resume manager', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click on resumes link
    await page.getByRole('link', { name: /Resumes/i }).click();
    
    // Should navigate to resume management page
    await expect(page).toHaveURL('/resumes');
    await expect(page.locator('h1')).toContainText('Resume');
    
    // Check resume upload button
    await expect(page.getByRole('button', { name: /Upload Resume/i })).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open user menu
    await page.getByRole('button', { name: /User Menu/i }).click();
    
    // Click on settings
    await page.getByRole('menuitem', { name: /Settings/i }).click();
    
    // Should navigate to settings page
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Check settings tabs
    await expect(page.getByRole('tab', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Account/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Notifications/i })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open user menu
    await page.getByRole('button', { name: /User Menu/i }).click();
    
    // Click logout
    await page.getByRole('menuitem', { name: /Logout/i }).click();
    
    // Should redirect to homepage
    await expect(page).toHaveURL('/');
    
    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect to signin
    await expect(page).toHaveURL('/auth/signin');
  });
});
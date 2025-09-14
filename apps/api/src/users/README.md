# User Management Module

## Overview
This comprehensive user management module provides full CRUD operations, profile management, session handling, and role-based access control for the JobAI platform.

## Features

### 1. User CRUD Operations
- **Create User**: Admin-only endpoint to create new users
- **Get Users**: Admin-only paginated list with search and filters
- **Get User**: Retrieve individual user details
- **Update User**: Update basic user information
- **Delete User**: Admin-only user deletion

### 2. Profile Management
- **Get Profile**: View detailed user profiles
- **Update Profile**: Update extended profile information including:
  - Contact information (phone, location, timezone)
  - Job preferences (desired titles, salary, locations)
  - Work authorization and security clearance
  - Professional links (LinkedIn, GitHub, portfolio)
  - Job search status and availability

### 3. Session Management
- **Get Sessions**: View active user sessions
- **Session Activity**: View session activity logs
- **Refresh Session**: Generate new access tokens
- **Revoke Session**: Revoke specific sessions
- **Revoke All Sessions**: Revoke all user sessions

### 4. Role-Based Access Control
- **Roles**: USER, PREMIUM, ADMIN
- **Guards**: RolesGuard for method-level protection
- **Decorators**: @Roles decorator for endpoint protection

### 5. Admin Features
- **User Statistics**: View user count breakdowns by role
- **Bulk Operations**: Bulk update multiple users
- **User Search**: Find users by email
- **Advanced Management**: Full user lifecycle management

## API Endpoints

### User Endpoints (`/users`)
```
GET    /users/me                    - Get current user profile
PATCH  /users/me                    - Update current user
GET    /users/me/profile           - Get detailed current user profile
PATCH  /users/me/profile           - Update current user profile
GET    /users/:id                  - Get user by ID
PATCH  /users/:id                  - Update user (admin only)
DELETE /users/:id                  - Delete user (admin only)
GET    /users/:id/profile          - Get user profile
PATCH  /users/:id/profile          - Update user profile (admin only)
```

### Admin Endpoints (`/admin/users`)
```
GET    /admin/users/stats          - Get user statistics
POST   /admin/users                - Create new user
GET    /admin/users                - Get all users (paginated)
GET    /admin/users/:id            - Get user by ID
PATCH  /admin/users/:id            - Update user
DELETE /admin/users/:id            - Delete user
GET    /admin/users/search/by-email - Find user by email
POST   /admin/users/bulk-update    - Bulk update users
```

### Session Endpoints (`/users/:userId/sessions`)
```
GET    /users/:userId/sessions              - Get user sessions
GET    /users/:userId/sessions/activity     - Get session activity
POST   /users/:userId/sessions/refresh      - Refresh session
DELETE /users/:userId/sessions/:sessionId   - Revoke specific session
DELETE /users/:userId/sessions              - Revoke all sessions
```

## Data Transfer Objects (DTOs)

### CreateUserDto
- `email`: User's email address (required)
- `password`: User's password (required, min 6 chars)
- `name`: User's full name (required)
- `role`: User role (optional, defaults to USER)
- `image`: Profile image URL (optional)

### UpdateUserDto
- `name`: User's full name (optional)
- `email`: User's email address (optional)
- `role`: User role (optional, admin only)
- `image`: Profile image URL (optional)

### UpdateProfileDto
Comprehensive profile update with 30+ fields including:
- Contact information
- Job preferences and salary expectations
- Work authorization and security clearance
- Professional links and portfolio
- Job search status and availability

### QueryUsersDto
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in name/email
- `role`: Filter by role
- `name`: Filter by name
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort direction (default: desc)

## Security Features

### Authentication
- JWT token-based authentication
- Automatic token validation via AuthGuard
- Public endpoint decorator for non-authenticated routes

### Authorization
- Role-based access control with RolesGuard
- Method-level role checking
- User permission validation for self-service endpoints

### Data Protection
- Password hashing with bcrypt
- Password exclusion from API responses
- Input validation and sanitization
- Rate limiting and DDoS protection ready

## Database Integration

### Models Used
- **User**: Core user information and authentication
- **Profile**: Extended user profile and preferences
- **Session**: User session tracking (simulated)

### Relationships
- User → Profile (one-to-one)
- User → Sessions (one-to-many, simulated)

## Error Handling
- Comprehensive error handling with appropriate HTTP status codes
- Custom exception messages
- Validation error handling
- Not found and forbidden exceptions

## Usage Examples

### Creating a User (Admin)
```typescript
POST /admin/users
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER"
}
```

### Updating Profile
```typescript
PATCH /users/me/profile
{
  "phone": "+1-555-0123",
  "location": "San Francisco, CA",
  "desiredJobTitles": ["Software Engineer", "Full Stack Developer"],
  "desiredSalaryMin": 100000,
  "desiredSalaryMax": 150000,
  "openToRemote": true,
  "linkedinUrl": "https://linkedin.com/in/johndoe"
}
```

### Querying Users (Admin)
```typescript
GET /admin/users?page=1&limit=10&search=john&role=USER&sortBy=createdAt&sortOrder=desc
```

This module provides a complete foundation for user management in the JobAI platform with security, scalability, and maintainability as core principles.
# FileDrop Architecture

## Current Architecture (Phase 1)

### Backend (server.js)
- **Framework**: Express.js
- **File Upload**: Multer middleware with disk storage
- **Storage**: Local filesystem in `uploads/` directory
- **Security**: Path sanitization to prevent directory traversal attacks

### API Endpoints
- `GET /api/files?path={path}` - List files and folders
- `POST /api/upload` - Upload files with multipart/form-data
- `GET /api/download/{path}` - Download a file
- `POST /api/folder` - Create a new folder
- `DELETE /api/delete/{path}` - Delete file or folder
- `GET /api/health` - Health check

### Frontend (public/)
- **Style**: Vanilla JavaScript (no frameworks)
- **Files**:
  - `index.html` - Main structure
  - `styles.css` - Modern, clean UI with CSS variables
  - `app.js` - Client-side logic for API calls and UI updates

### Data Flow
1. User interacts with UI
2. JavaScript makes API calls to Express backend
3. Backend performs file operations via Node.js fs module
4. Response sent back to frontend
5. UI updates based on response

## Planned Architecture (Phase 2)

### Authentication System
```
┌─────────────────────────────────────────┐
│           Authentication Layer          │
│  - JWT tokens                           │
│  - Session management                   │
│  - User registration/login              │
└─────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│         Authorization Middleware         │
│  - Public routes (read-only)            │
│  - Protected routes (user-scoped)       │
└─────────────────────────────────────────┘
```

### Storage Structure
```
uploads/
├── public/              # Publicly accessible (read-only)
│   ├── file1.pdf
│   └── folder1/
└── users/               # User-scoped storage
    ├── user1_id/
    │   ├── documents/
    │   └── photos/
    └── user2_id/
        └── files/
```

### Proposed Technology Additions

#### Backend
- **Authentication**:
  - Passport.js or custom JWT implementation
  - bcrypt for password hashing
  - express-session for session management

- **Database**:
  - SQLite or PostgreSQL for user data
  - Schema:
    ```sql
    users (id, username, email, password_hash, created_at)
    files (id, user_id, path, name, size, public, created_at)
    shares (id, file_id, share_token, expires_at)
    ```

- **Configuration**:
  - Environment-based config (dev/prod)
  - dotenv for environment variables

#### Frontend
- Consider light framework for state management
- Options: Alpine.js, Preact, or continue with vanilla JS
- Add user dashboard
- File sharing interface

### Security Enhancements for Phase 2

1. **Authentication**
   - Secure password requirements
   - Rate limiting on login attempts
   - Password reset functionality
   - Email verification

2. **Authorization**
   - User-scoped file access
   - Public vs private file distinction
   - Shared link generation with expiration

3. **File Security**
   - Virus scanning (optional)
   - File type restrictions per user/plan
   - Storage quota enforcement
   - Audit logs

4. **API Security**
   - CSRF protection
   - Rate limiting per user
   - Input validation and sanitization
   - HTTPS enforcement in production

### Migration Path (Phase 1 → Phase 2)

1. **Database Setup**
   - Add database schema
   - Create migration scripts
   - Seed initial admin user

2. **Authentication Implementation**
   - Add auth endpoints
   - Implement JWT middleware
   - Add login/register UI

3. **Storage Restructuring**
   - Migrate existing files to public folder
   - Create user directories on signup
   - Update file paths in database

4. **API Updates**
   - Add auth middleware to protected routes
   - Keep public routes for read-only access
   - Add user context to file operations

5. **Frontend Updates**
   - Add login/register pages
   - Add user dashboard
   - Update file operations with auth tokens
   - Add sharing interface

### Deployment Considerations

#### Phase 1 (Current)
- Simple Docker deployment
- No database required
- Volume for file persistence
- Suitable for internal/home network

#### Phase 2 (Future)
- Multi-container setup (app + database)
- Reverse proxy (nginx) for HTTPS
- Persistent volumes for both files and database
- Backup strategy for user data
- SSL certificates (Let's Encrypt)
- Optional: CDN for public files

### Scalability Options (Future)

1. **Horizontal Scaling**
   - Multiple app instances behind load balancer
   - Shared storage (NFS, S3, MinIO)
   - Redis for session storage

2. **Storage Options**
   - S3-compatible object storage
   - Local filesystem with backup
   - Hybrid: hot/cold storage tiers

3. **Performance**
   - Redis cache for file metadata
   - CDN for public files
   - Image optimization/thumbnails
   - Background job processing (uploads, scans)

## Code Organization (Phase 2)

```
filedrop/
├── server/
│   ├── config/
│   │   ├── database.js
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── File.js
│   │   └── Share.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── files.js
│   │   └── public.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── storage.js
│   │   └── validation.js
│   └── server.js
├── public/
│   ├── auth/
│   │   ├── login.html
│   │   └── register.html
│   ├── dashboard/
│   │   └── index.html
│   └── public/
│       └── index.html
└── database/
    └── migrations/
```

## Monitoring and Logging (Future)

- Winston for structured logging
- Prometheus metrics
- Health check endpoints
- Error tracking (Sentry)
- Usage analytics (file uploads/downloads)

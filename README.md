# FileDrop

A simple, lightweight file drop web server for easy file uploading, downloading, and folder management.

## Features

### Phase 1 (Current)
- Upload files (drag-and-drop or file picker)
- Download files
- Create folders
- Delete files and folders
- Navigate through folder structure
- No authentication (public access)
- Docker support

### Phase 2 (Planned)
- User authentication
- User-scoped file storage
- Public view (read-only, unauthenticated)
- User view (full access, authenticated)

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Local filesystem
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js 18+ (for local development)
- Docker and Docker Compose (for containerized deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application:
```
http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

### Docker Deployment

1. Build and start the container:
```bash
docker-compose up -d
```

2. Access the application:
```
http://localhost:3000
```

3. Stop the container:
```bash
docker-compose down
```

### Docker Commands

```bash
# Build the image
docker-compose build

# View logs
docker-compose logs -f

# Restart the service
docker-compose restart

# Remove everything including volumes
docker-compose down -v
```

## Configuration

Environment variables (can be set in `.env` or `docker-compose.yml`):

- `PORT`: Server port (default: 3000)
- `UPLOAD_DIR`: Directory for uploaded files (default: ./uploads)

## File Storage

Files are stored in the `uploads/` directory by default. This directory is:
- Automatically created on server startup
- Ignored by git (see `.gitignore`)
- Mounted as a Docker volume for persistence

## API Endpoints

### List Files
```
GET /api/files?path={folder_path}
```

### Upload Files
```
POST /api/upload
Content-Type: multipart/form-data
Body: files[], folder
```

### Download File
```
GET /api/download/{file_path}
```

### Create Folder
```
POST /api/folder
Content-Type: application/json
Body: { "path": "{parent_path}", "name": "{folder_name}" }
```

### Delete File/Folder
```
DELETE /api/delete/{item_path}
```

### Health Check
```
GET /api/health
```

## Security Considerations

### Phase 1 (No Authentication)
- Anyone with network access can upload, download, or delete files
- No file type restrictions
- 100MB file size limit
- Path traversal protection implemented
- Suitable for trusted networks only (e.g., home network, internal network)

### Recommendations
- Use behind a firewall or VPN for production
- Consider implementing rate limiting for public deployments
- Monitor disk space usage
- Regular backups recommended

## Project Structure

```
filedrop/
├── server.js           # Express server and API endpoints
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose configuration
├── .dockerignore       # Docker build exclusions
├── .gitignore          # Git exclusions
├── README.md           # Documentation
├── public/             # Frontend files
│   ├── index.html      # Main HTML
│   ├── styles.css      # Styles
│   └── app.js          # Frontend JavaScript
└── uploads/            # File storage (created automatically)
```

## Future Enhancements (Phase 2)

- User authentication system
- User-specific storage quotas
- File sharing links with expiration
- File preview for images and documents
- Search functionality
- File versioning
- Trash/recycle bin
- Admin dashboard
- Activity logs
- Mobile app

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT
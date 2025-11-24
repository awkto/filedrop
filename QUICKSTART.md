# FileDrop Quick Start Guide

## Running Locally (Fastest)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open your browser
# Go to: http://localhost:3000
```

That's it! You can now:
- Upload files by clicking "Upload Files" button
- Create folders by clicking "New Folder" button
- Download files by clicking the "Download" button
- Delete files/folders by clicking the "Delete" button
- Navigate folders by clicking on them

## Running with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access at: http://localhost:3000

## Testing It Works

Try these commands:

```bash
# Check health
curl http://localhost:3000/api/health

# List files
curl http://localhost:3000/api/files

# Create a folder
curl -X POST http://localhost:3000/api/folder \
  -H "Content-Type: application/json" \
  -d '{"path": "", "name": "my-folder"}'

# Upload a file
echo "Hello World" > test.txt
curl -X POST -F "files=@test.txt" -F "folder=" \
  http://localhost:3000/api/upload
```

## File Storage

All uploaded files are stored in the `uploads/` directory. This directory:
- Is automatically created when you start the server
- Persists between restarts (or as a Docker volume)
- Is ignored by git

## Need Help?

See [README.md](README.md) for full documentation.

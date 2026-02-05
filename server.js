const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');
const archiver = require('archiver');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE
  ? parseInt(process.env.MAX_FILE_SIZE) * 1024 * 1024
  : 4 * 1024 * 1024 * 1024; // Default 4GB, or MAX_FILE_SIZE in MB

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads directory exists
if (!fsSync.existsSync(UPLOAD_DIR)) {
  fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = req.body.folder || '';
    const uploadPath = path.join(UPLOAD_DIR, folder);

    // Create directory if it doesn't exist
    if (!fsSync.existsSync(uploadPath)) {
      await fs.mkdir(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Preserve original filename
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Helper function to sanitize paths and prevent directory traversal
function sanitizePath(userPath) {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalized;
}

// Helper function to get full server path
function getFullPath(relativePath) {
  const sanitized = sanitizePath(relativePath || '');
  return path.join(UPLOAD_DIR, sanitized);
}

// API Routes

// List files and folders in a directory
app.get('/api/files', async (req, res) => {
  try {
    const folder = req.query.path || '';
    const fullPath = getFullPath(folder);

    // Check if directory exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const fileList = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const stats = await fs.stat(itemPath);
        const relativePath = path.join(folder, item.name);

        return {
          name: item.name,
          path: relativePath.replace(/\\/g, '/'),
          type: item.isDirectory() ? 'folder' : 'file',
          size: item.isDirectory() ? null : stats.size,
          modified: stats.mtime
        };
      })
    );

    res.json({
      currentPath: folder.replace(/\\/g, '/'),
      items: fileList.sort((a, b) => {
        // Folders first, then alphabetically
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Upload file(s)
app.post('/api/upload', (req, res, next) => {
  // Disable timeout for large file uploads
  req.setTimeout(0);
  res.setTimeout(0);
  next();
}, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      size: file.size,
      path: path.relative(UPLOAD_DIR, file.path).replace(/\\/g, '/')
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Download file
app.get('/api/download/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = getFullPath(filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        return res.status(400).json({ error: 'Cannot download a directory. Use /api/download-zip/ instead.' });
      }
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(fullPath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Download folder as zip
app.get('/api/download-zip/*', async (req, res) => {
  try {
    const folderPath = req.params[0];
    const fullPath = getFullPath(folderPath);

    // Check if folder exists
    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);

      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' });
      }
    } catch {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Set response headers
    const folderName = path.basename(fullPath) || 'download';
    res.attachment(`${folderName}.zip`);
    res.setHeader('Content-Type', 'application/zip');

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add directory to archive
    archive.directory(fullPath, false);

    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading folder:', error);
    res.status(500).json({ error: 'Failed to download folder' });
  }
});

// Create folder
app.post('/api/folder', async (req, res) => {
  try {
    const { path: folderPath, name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const fullPath = getFullPath(path.join(folderPath || '', name));

    // Check if folder already exists
    if (fsSync.existsSync(fullPath)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }

    await fs.mkdir(fullPath, { recursive: true });

    res.json({
      message: 'Folder created successfully',
      path: path.relative(UPLOAD_DIR, fullPath).replace(/\\/g, '/')
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete file or folder
app.delete('/api/delete/*', async (req, res) => {
  try {
    const itemPath = req.params[0];
    const fullPath = getFullPath(itemPath);

    // Check if item exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version endpoint
app.get('/api/version', async (req, res) => {
  try {
    const versionPath = path.join(__dirname, 'version.txt');
    const version = await fs.readFile(versionPath, 'utf-8');
    res.json({ version: version.trim() });
  } catch (error) {
    res.json({ version: 'unknown' });
  }
});

// Disk space endpoint
app.get('/api/disk-space', async (req, res) => {
  try {
    const uploadPath = path.resolve(UPLOAD_DIR);
    const stats = await fs.statfs(uploadPath);

    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    const used = total - free;

    res.json({
      total,
      free,
      used,
      percentUsed: Math.round((used / total) * 100)
    });
  } catch (error) {
    console.error('Error getting disk space:', error);
    res.status(500).json({ error: 'Failed to get disk space information' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`FileDrop server running on port ${PORT}`);
  console.log(`Upload directory: ${path.resolve(UPLOAD_DIR)}`);
  console.log(`Max file size: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
  console.log(`Access the web interface at http://localhost:${PORT}`);
});

// Increase server timeout for large file uploads (10 minutes)
server.timeout = 600000;
server.keepAliveTimeout = 610000;
server.headersTimeout = 620000;

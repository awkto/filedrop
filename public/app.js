// State
let currentPath = '';
let dragCounter = 0;

// DOM Elements
const fileList = document.getElementById('file-list');
const fileInput = document.getElementById('file-input');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const breadcrumbTrail = document.getElementById('breadcrumb-trail');
const folderModal = document.getElementById('folder-modal');
const folderNameInput = document.getElementById('folder-name');
const dropOverlay = document.getElementById('drop-overlay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFiles();
  setupEventListeners();
  setupDragAndDrop();
});

// Event Listeners
function setupEventListeners() {
  // Upload files
  fileInput.addEventListener('change', handleFileUpload);

  // New folder button
  document.getElementById('new-folder-btn').addEventListener('click', () => {
    folderNameInput.value = '';
    folderModal.style.display = 'flex';
    folderNameInput.focus();
  });

  // Create folder
  document.getElementById('create-folder-btn').addEventListener('click', createFolder);

  // Cancel folder creation
  document.getElementById('cancel-folder-btn').addEventListener('click', () => {
    folderModal.style.display = 'none';
  });

  // Enter key in folder name input
  folderNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createFolder();
    }
  });

  // Close modal on background click
  folderModal.addEventListener('click', (e) => {
    if (e.target === folderModal) {
      folderModal.style.display = 'none';
    }
  });

  // Breadcrumb home click
  document.querySelector('.breadcrumb-item[data-path]').addEventListener('click', (e) => {
    navigateToPath(e.target.dataset.path);
  });
}

// Load files from server
async function loadFiles(path = '') {
  try {
    currentPath = path;
    fileList.innerHTML = '<div class="loading">Loading files...</div>';

    const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error('Failed to load files');
    }

    const data = await response.json();
    renderFileList(data.items);
    updateBreadcrumb(path);
  } catch (error) {
    console.error('Error loading files:', error);
    fileList.innerHTML = '<div class="empty-state">Failed to load files. Please try again.</div>';
  }
}

// Render file list
function renderFileList(items) {
  if (items.length === 0) {
    fileList.innerHTML = `
      <div class="empty-state">
        <span class="icon">📂</span>
        <p>This folder is empty</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">Upload files or create a new folder to get started</p>
      </div>
    `;
    return;
  }

  fileList.innerHTML = items.map(item => {
    const icon = item.type === 'folder' ? '📁' : '📄';
    const sizeText = item.type === 'file' ? formatBytes(item.size) : '';
    const dateText = new Date(item.modified).toLocaleString();

    return `
      <div class="file-item ${item.type}" data-path="${item.path}" data-type="${item.type}">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(item.name)}</div>
          <div class="file-meta">${sizeText ? sizeText + ' • ' : ''}${dateText}</div>
        </div>
        <div class="file-actions">
          ${item.type === 'file' ? `<button class="btn btn-download" onclick="downloadFile('${item.path}')">Download</button>` : ''}
          <button class="btn btn-danger" onclick="deleteItem('${item.path}', '${item.type}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for folders
  document.querySelectorAll('.file-item.folder').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.file-actions')) {
        navigateToPath(item.dataset.path);
      }
    });
  });
}

// Update breadcrumb navigation
function updateBreadcrumb(path) {
  if (!path) {
    breadcrumbTrail.innerHTML = '';
    return;
  }

  const parts = path.split('/').filter(p => p);
  let currentPath = '';

  breadcrumbTrail.innerHTML = parts.map((part, index) => {
    currentPath += (index > 0 ? '/' : '') + part;
    const pathValue = currentPath;
    return `
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item" data-path="${pathValue}">${escapeHtml(part)}</span>
    `;
  }).join('');

  // Add click handlers to breadcrumb items
  breadcrumbTrail.querySelectorAll('.breadcrumb-item').forEach(item => {
    item.addEventListener('click', (e) => {
      navigateToPath(e.target.dataset.path);
    });
  });
}

// Navigate to path
function navigateToPath(path) {
  loadFiles(path);
}

// Handle file upload
async function handleFileUpload() {
  const files = fileInput.files;

  if (files.length === 0) {
    return;
  }

  const formData = new FormData();

  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  formData.append('folder', currentPath);

  try {
    // Show progress
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percentComplete + '%';
        progressText.textContent = percentComplete + '%';
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        // Upload successful
        setTimeout(() => {
          uploadProgress.style.display = 'none';
          fileInput.value = ''; // Reset input
          loadFiles(currentPath); // Reload file list
        }, 500);
      } else {
        alert('Upload failed. Please try again.');
        uploadProgress.style.display = 'none';
      }
    });

    xhr.addEventListener('error', () => {
      alert('Upload failed. Please try again.');
      uploadProgress.style.display = 'none';
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  } catch (error) {
    console.error('Error uploading files:', error);
    alert('Failed to upload files. Please try again.');
    uploadProgress.style.display = 'none';
  }
}

// Create new folder
async function createFolder() {
  const folderName = folderNameInput.value.trim();

  if (!folderName) {
    alert('Please enter a folder name');
    return;
  }

  try {
    const response = await fetch('/api/folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: currentPath,
        name: folderName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create folder');
    }

    folderModal.style.display = 'none';
    loadFiles(currentPath);
  } catch (error) {
    console.error('Error creating folder:', error);
    alert(error.message);
  }
}

// Download file
function downloadFile(path) {
  window.location.href = `/api/download/${path}`;
}

// Delete file or folder
async function deleteItem(path, type) {
  const itemType = type === 'folder' ? 'folder' : 'file';
  const confirmMessage = `Are you sure you want to delete this ${itemType}?${type === 'folder' ? ' All contents will be deleted.' : ''}`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/delete/${path}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete');
    }

    loadFiles(currentPath);
  } catch (error) {
    console.error('Error deleting item:', error);
    alert('Failed to delete. Please try again.');
  }
}

// Drag and Drop functionality
function setupDragAndDrop() {
  // Prevent default drag behaviors on the whole document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Handle drag enter
  document.body.addEventListener('dragenter', (e) => {
    dragCounter++;
    if (dragCounter === 1) {
      dropOverlay.style.display = 'flex';
      fileList.classList.add('drag-over');
    }
  });

  // Handle drag leave
  document.body.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0) {
      dropOverlay.style.display = 'none';
      fileList.classList.remove('drag-over');
    }
  });

  // Handle drop
  document.body.addEventListener('drop', (e) => {
    dragCounter = 0;
    dropOverlay.style.display = 'none';
    fileList.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleDroppedFiles(files);
    }
  });

  // Handle dragover for visual feedback
  document.body.addEventListener('dragover', (e) => {
    e.dataTransfer.dropEffect = 'copy';
  });
}

// Handle dropped files
function handleDroppedFiles(files) {
  // Create a FileList-like object for upload
  const dataTransfer = new DataTransfer();

  for (let i = 0; i < files.length; i++) {
    dataTransfer.items.add(files[i]);
  }

  // Set the files to the file input and trigger upload
  fileInput.files = dataTransfer.files;
  handleFileUpload();
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

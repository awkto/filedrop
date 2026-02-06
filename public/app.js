// State
let currentPath = '';
let dragCounter = 0;
let currentView = 'grid'; // 'grid' or 'table'
let currentSort = 'name-asc';
let cachedItems = [];
let selectedItems = new Set(); // Paths of selected items
let settings = {
  confirmDelete: true
};

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
const viewToggleBtn = document.getElementById('view-toggle-btn');
const sortSelect = document.getElementById('sort-select');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const confirmDeleteToggle = document.getElementById('confirm-delete-toggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  loadSettings();
  loadFiles();
  setupEventListeners();
  setupDragAndDrop();
  loadVersion();
  loadDiskSpace();
  // Refresh disk space every 30 seconds
  setInterval(loadDiskSpace, 30000);
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

  // View toggle
  viewToggleBtn.addEventListener('click', toggleView);

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderFileList(cachedItems);
  });

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Settings
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  document.getElementById('close-settings-btn').addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  confirmDeleteToggle.addEventListener('change', (e) => {
    settings.confirmDelete = e.target.checked;
    saveSettings();
  });

  // Multi-select
  document.getElementById('select-all-btn').addEventListener('click', toggleSelectAll);
  document.getElementById('clear-selection-btn').addEventListener('click', clearSelection);
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelected);
}

// Load files from server
async function loadFiles(path = '') {
  try {
    currentPath = path;
    fileList.innerHTML = '<div class="loading">Loading files...</div>';

    // Clear selection when navigating
    clearSelection();

    const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error('Failed to load files');
    }

    const data = await response.json();
    cachedItems = data.items;
    renderFileList(cachedItems);
    updateBreadcrumb(path);
    updateFileCount();
  } catch (error) {
    console.error('Error loading files:', error);
    fileList.innerHTML = '<div class="empty-state">Failed to load files. Please try again.</div>';
  }
}

// Toggle view
function toggleView() {
  currentView = currentView === 'grid' ? 'table' : 'grid';
  viewToggleBtn.querySelector('.icon').textContent = currentView === 'grid' ? '📋' : '📊';
  renderFileList(cachedItems);
}

// Sort items
function sortItems(items) {
  const sorted = [...items];
  const [field, order] = currentSort.split('-');

  sorted.sort((a, b) => {
    // Always put folders first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    let comparison = 0;

    if (field === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (field === 'size') {
      comparison = (a.size || 0) - (b.size || 0);
    } else if (field === 'date') {
      comparison = new Date(a.modified) - new Date(b.modified);
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
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

  const sortedItems = sortItems(items);

  if (currentView === 'table') {
    renderTableView(sortedItems);
  } else {
    renderGridView(sortedItems);
  }
}

// Render grid view
function renderGridView(items) {
  fileList.classList.remove('table-view');
  fileList.innerHTML = items.map(item => {
    const icon = item.type === 'folder' ? '📁' : '📄';
    const sizeText = item.type === 'file' ? formatBytes(item.size) : '';
    const dateText = new Date(item.modified).toLocaleString();
    const isSelected = selectedItems.has(item.path);

    return `
      <div class="file-item ${item.type} ${isSelected ? 'selected' : ''}" data-path="${escapeHtml(item.path)}" data-type="${item.type}">
        <input type="checkbox" class="file-item-checkbox" ${isSelected ? 'checked' : ''} data-path="${escapeHtml(item.path)}">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(item.name)}</div>
          <div class="file-meta">${sizeText ? sizeText + ' • ' : ''}${dateText}</div>
        </div>
        <div class="file-actions">
          ${item.type === 'file'
            ? `<button class="btn btn-download" onclick="downloadFile('${escapeHtml(item.path)}')">Download</button>`
            : `<button class="btn btn-download" onclick="downloadFolder('${escapeHtml(item.path)}')">Download Zip</button>`}
          <button class="btn btn-danger" onclick="deleteItem('${escapeHtml(item.path)}', '${item.type}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add checkbox handlers
  document.querySelectorAll('.file-item-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      toggleItemSelection(checkbox.dataset.path, e);
    });
  });

  // Add click handlers for folders
  document.querySelectorAll('.file-item.folder').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.file-actions') && !e.target.classList.contains('file-item-checkbox')) {
        navigateToPath(item.dataset.path);
      }
    });
  });
}

// Render table view
function renderTableView(items) {
  fileList.classList.add('table-view');
  fileList.innerHTML = `
    <table class="file-table">
      <thead>
        <tr>
          <th class="file-checkbox-cell"></th>
          <th class="file-icon-cell"></th>
          <th class="file-name-cell">Name</th>
          <th class="file-size-cell">Size</th>
          <th class="file-date-cell">Modified</th>
          <th class="file-actions-cell">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const icon = item.type === 'folder' ? '📁' : '📄';
          const sizeText = item.type === 'file' ? formatBytes(item.size) : '—';
          const dateText = new Date(item.modified).toLocaleString();
          const isSelected = selectedItems.has(item.path);

          return `
            <tr class="${item.type} ${isSelected ? 'selected' : ''}" data-path="${escapeHtml(item.path)}" data-type="${item.type}">
              <td class="file-checkbox-cell">
                <input type="checkbox" class="file-item-checkbox" ${isSelected ? 'checked' : ''} data-path="${escapeHtml(item.path)}">
              </td>
              <td class="file-icon-cell">${icon}</td>
              <td class="file-name-cell">${escapeHtml(item.name)}</td>
              <td class="file-size-cell">${sizeText}</td>
              <td class="file-date-cell">${dateText}</td>
              <td class="file-actions-cell">
                ${item.type === 'file'
                  ? `<button class="btn btn-download" onclick="downloadFile('${escapeHtml(item.path)}')">Download</button>`
                  : `<button class="btn btn-download" onclick="downloadFolder('${escapeHtml(item.path)}')">Download Zip</button>`}
                <button class="btn btn-danger" onclick="deleteItem('${escapeHtml(item.path)}', '${item.type}')">Delete</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Add checkbox handlers
  document.querySelectorAll('.file-item-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleItemSelection(checkbox.dataset.path, e);
    });
  });

  // Add click handlers for folders in table view
  document.querySelectorAll('.file-table tbody tr.folder').forEach(row => {
    row.addEventListener('click', (e) => {
      if (!e.target.closest('.file-actions-cell') && !e.target.classList.contains('file-item-checkbox')) {
        navigateToPath(row.dataset.path);
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

  // IMPORTANT: Append folder BEFORE files so multer can read it when determining destination
  formData.append('folder', currentPath);

  // Track file information for multi-file uploads
  const fileList = Array.from(files);
  const fileSizes = fileList.map(f => f.size);
  const totalFiles = fileList.length;
  const cumulativeSizes = [];
  let cumulative = 0;
  for (let i = 0; i < fileSizes.length; i++) {
    cumulativeSizes.push(cumulative);
    cumulative += fileSizes[i];
  }

  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  try {
    // Show progress
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    // Reset or show multi-file details
    const multiFileSection = document.getElementById('progress-multi-file');
    const progressTitle = document.getElementById('progress-title');

    if (totalFiles > 1) {
      multiFileSection.style.display = 'block';
      if (progressTitle) {
        progressTitle.textContent = `Uploading file 1 of ${totalFiles}`;
      }
    } else {
      multiFileSection.style.display = 'none';
      if (progressTitle) {
        progressTitle.textContent = 'Uploading...';
      }
    }

    const xhr = new XMLHttpRequest();

    // Set timeout to 40 minutes for large file uploads
    xhr.timeout = 2400000;

    // Variables for speed calculation
    let startTime = Date.now();
    let lastTime = startTime;
    let lastLoaded = 0;
    const speedSamples = [];
    const maxSamples = 10; // Number of samples for averaging

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // seconds
        const bytesDiff = e.loaded - lastLoaded;

        // Calculate current speed
        if (timeDiff > 0.1) { // Update every 100ms
          const currentSpeed = bytesDiff / timeDiff; // bytes per second

          // Add to samples for averaging
          speedSamples.push(currentSpeed);
          if (speedSamples.length > maxSamples) {
            speedSamples.shift(); // Remove oldest sample
          }

          // Calculate average speed
          const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;

          // Update progress
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = percentComplete + '%';
          progressText.textContent = percentComplete + '%';

          // Update size and speed display
          const progressSize = document.getElementById('progress-size');
          const progressSpeed = document.getElementById('progress-speed');

          if (progressSize) {
            progressSize.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;
          }

          if (progressSpeed) {
            progressSpeed.textContent = `${formatBytes(avgSpeed)}/s`;
          }

          // Update multi-file progress if uploading multiple files
          if (totalFiles > 1) {
            // Find current file being uploaded
            let currentFileIndex = 0;
            let filesCompleted = 0;

            for (let i = 0; i < cumulativeSizes.length; i++) {
              if (e.loaded >= cumulativeSizes[i] + fileSizes[i]) {
                filesCompleted = i + 1;
                currentFileIndex = Math.min(i + 1, totalFiles - 1);
              } else if (e.loaded >= cumulativeSizes[i]) {
                currentFileIndex = i;
                break;
              }
            }

            // Update current file name
            const currentFileName = document.getElementById('current-file-name');
            const filesCompletedEl = document.getElementById('files-completed');
            const progressTitle = document.getElementById('progress-title');

            if (currentFileName && fileList[currentFileIndex]) {
              currentFileName.textContent = fileList[currentFileIndex].name;
            }

            if (filesCompletedEl) {
              filesCompletedEl.textContent = `${filesCompleted} / ${totalFiles} files completed`;
            }

            if (progressTitle) {
              progressTitle.textContent = `Uploading file ${currentFileIndex + 1} of ${totalFiles}`;
            }
          }

          lastTime = currentTime;
          lastLoaded = e.loaded;
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        // Upload successful
        setTimeout(() => {
          uploadProgress.style.display = 'none';
          fileInput.value = ''; // Reset input
          loadFiles(currentPath); // Reload file list
          loadDiskSpace(); // Refresh disk space
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

    xhr.addEventListener('timeout', () => {
      alert('Upload timed out. The file may be too large or your connection too slow. Please try again.');
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

// Download folder as zip
function downloadFolder(path) {
  window.location.href = `/api/download-zip/${path}`;
}

// Multi-select functions
function toggleItemSelection(path, event) {
  event.stopPropagation();

  if (selectedItems.has(path)) {
    selectedItems.delete(path);
  } else {
    selectedItems.add(path);
  }

  updateSelectionUI();
}

function toggleSelectAll() {
  if (selectedItems.size === cachedItems.length && cachedItems.length > 0) {
    // Deselect all
    clearSelection();
  } else {
    // Select all
    selectedItems.clear();
    cachedItems.forEach(item => selectedItems.add(item.path));
    updateSelectionUI();
  }
}

function clearSelection() {
  selectedItems.clear();
  updateSelectionUI();
}

function updateSelectionUI() {
  const infoBar = document.getElementById('info-bar');
  const fileInfo = document.getElementById('file-info');
  const selectionInfo = document.getElementById('selection-info');
  const selectionActions = document.getElementById('selection-actions');
  const selectionCount = document.getElementById('selection-count');
  const selectAllBtn = document.getElementById('select-all-btn');

  // Update selection count and toggle between file info and selection info
  if (selectedItems.size > 0) {
    // Show selection state
    infoBar.classList.add('has-selection');
    fileInfo.style.display = 'none';
    selectionInfo.style.display = 'block';
    selectionActions.style.display = 'flex';
    selectionCount.textContent = `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`;
    selectAllBtn.style.display = 'block';

    // Update select all button icon
    const allSelected = selectedItems.size === cachedItems.length && cachedItems.length > 0;
    selectAllBtn.querySelector('.icon').textContent = allSelected ? '☐' : '☑️';
    selectAllBtn.title = allSelected ? 'Deselect all' : 'Select all';
  } else {
    // Show file info state
    infoBar.classList.remove('has-selection');
    fileInfo.style.display = 'block';
    selectionInfo.style.display = 'none';
    selectionActions.style.display = 'none';
    selectAllBtn.style.display = 'none';
  }

  // Update visual state of items
  renderFileList(cachedItems);
}

function updateFileCount() {
  const fileCount = document.getElementById('file-count');
  if (fileCount && cachedItems) {
    const folders = cachedItems.filter(item => item.type === 'folder').length;
    const files = cachedItems.filter(item => item.type === 'file').length;

    const parts = [];
    if (files > 0) parts.push(`${files} file${files !== 1 ? 's' : ''}`);
    if (folders > 0) parts.push(`${folders} folder${folders !== 1 ? 's' : ''}`);

    fileCount.textContent = parts.length > 0 ? parts.join(', ') : 'Empty folder';
  }
}

async function deleteSelected() {
  if (selectedItems.size === 0) return;

  // Check if delete confirmation is enabled in settings
  if (settings.confirmDelete) {
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) {
      return;
    }
  }

  try {
    // Delete all selected items
    const deletePromises = Array.from(selectedItems).map(path =>
      fetch(`/api/delete/${path}`, { method: 'DELETE' })
    );

    const results = await Promise.allSettled(deletePromises);

    // Check for failures
    const failures = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok));

    if (failures.length > 0) {
      alert(`Failed to delete ${failures.length} item${failures.length > 1 ? 's' : ''}. Please try again.`);
    }

    // Clear selection and reload
    clearSelection();
    loadFiles(currentPath);
    loadDiskSpace();
  } catch (error) {
    console.error('Error deleting items:', error);
    alert('Failed to delete items. Please try again.');
  }
}

// Delete file or folder
async function deleteItem(path, type) {
  // Check if delete confirmation is enabled in settings
  if (settings.confirmDelete) {
    const itemType = type === 'folder' ? 'folder' : 'file';
    const confirmMessage = `Are you sure you want to delete this ${itemType}?${type === 'folder' ? ' All contents will be deleted.' : ''}`;

    if (!confirm(confirmMessage)) {
      return;
    }
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

// Theme functionality
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

// Settings functionality
function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('filedrop-settings');
    if (savedSettings) {
      settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    // Update UI to reflect loaded settings
    if (confirmDeleteToggle) {
      confirmDeleteToggle.checked = settings.confirmDelete;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('filedrop-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
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

// Load version information
async function loadVersion() {
  try {
    const response = await fetch('/api/version');
    const data = await response.json();
    document.getElementById('version-text').textContent = `v${data.version}`;
  } catch (error) {
    console.error('Error loading version:', error);
    document.getElementById('version-text').textContent = 'v?';
  }
}

// Load disk space information
async function loadDiskSpace() {
  try {
    const response = await fetch('/api/disk-space');
    const data = await response.json();

    const diskSpaceFill = document.getElementById('disk-space-fill');
    const diskSpaceText = document.getElementById('disk-space-text');

    // Update progress bar
    diskSpaceFill.style.width = data.percentUsed + '%';

    // Update color based on usage
    diskSpaceFill.classList.remove('high-usage', 'critical-usage');
    if (data.percentUsed >= 90) {
      diskSpaceFill.classList.add('critical-usage');
    } else if (data.percentUsed >= 75) {
      diskSpaceFill.classList.add('high-usage');
    }

    // Format disk space text
    const totalGB = (data.total / (1024 ** 3)).toFixed(1);
    const freeGB = (data.free / (1024 ** 3)).toFixed(1);
    diskSpaceText.textContent = `${freeGB} GB free of ${totalGB} GB (${data.percentUsed}% used)`;
  } catch (error) {
    console.error('Error loading disk space:', error);
    document.getElementById('disk-space-text').textContent = 'Unable to load disk space';
  }
}

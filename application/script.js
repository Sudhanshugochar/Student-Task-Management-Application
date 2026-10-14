// Student Task Management Application - Frontend Client
// Communicates with Cloudflare Workers REST API & Workers KV backend

let tasks = [];
const API_BASE = '/api/tasks';

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskPriorityInput = document.getElementById('task-priority');
const taskStatusInput = document.getElementById('task-status');
const tasksTbody = document.getElementById('tasks-tbody');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');

// Stat Counters
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const statHigh = document.getElementById('stat-high');

// Modal Elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTaskId = document.getElementById('edit-task-id');
const editIdDisplay = document.getElementById('edit-id-display');
const editTaskTitle = document.getElementById('edit-task-title');
const editTaskPriority = document.getElementById('edit-task-priority');
const editTaskStatus = document.getElementById('edit-task-status');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const toastEl = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();
  setupEventListeners();
});

function setupEventListeners() {
  taskForm.addEventListener('submit', handleCreateTask);
  refreshBtn.addEventListener('click', fetchTasks);
  searchInput.addEventListener('input', renderTasks);
  filterPriority.addEventListener('change', renderTasks);
  filterStatus.addEventListener('change', renderTasks);

  // Quick Preset Chips
  document.querySelectorAll('.preset-chips .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      taskTitleInput.value = chip.dataset.preset;
      taskPriorityInput.value = chip.dataset.priority || 'Medium';
      taskTitleInput.focus();
    });
  });

  // Modal Close
  closeModalBtn.addEventListener('click', closeModal);
  cancelEditBtn.addEventListener('click', closeModal);
  editForm.addEventListener('submit', handleUpdateTask);
  window.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });
}

// Show Toast Notification
function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast show toast-${type}`;
  setTimeout(() => {
    toastEl.className = 'toast';
  }, 3500);
}

// Helper: Generate next sequential Task ID (T101, T102...)
function generateNextTaskId() {
  if (tasks.length === 0) return 'T101';
  const numericIds = tasks
    .map(t => {
      const match = (t.id || '').match(/^T(\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  if (numericIds.length === 0) return `T${101 + tasks.length}`;
  const maxId = Math.max(...numericIds);
  return `T${maxId + 1}`;
}

// GET /api/tasks - Fetch all tasks
async function fetchTasks() {
  tasksTbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-state">
        <div class="spinner"></div>
        <span>Fetching tasks from Workers KV...</span>
      </td>
    </tr>
  `;

  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    tasks = Array.isArray(data) ? data : (data.tasks || []);
    updateMetrics();
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks:', err);
    tasksTbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p style="color: #dc2626; font-weight: 600;">Failed to connect to Workers KV storage.</p>
          <small>${err.message}</small>
        </td>
      </tr>
    `;
    showToast('Failed to load tasks from Cloudflare KV', 'error');
  }
}

// POST /api/tasks - Create task
async function handleCreateTask(e) {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const id = taskIdInput.value.trim() || generateNextTaskId();
  const priority = taskPriorityInput.value;
  const status = taskStatusInput.value;

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Saving to KV...';

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, priority, status })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed with status ${res.status}`);
    }

    const newTask = await res.json();
    showToast(`Task ${newTask.id || id} created in Workers KV!`, 'success');
    taskForm.reset();
    fetchTasks();
  } catch (err) {
    console.error('Create error:', err);
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Add Task to Cloud Storage';
  }
}

// PUT /api/tasks/:id - Update task status quickly
async function toggleTaskStatus(id, currentStatus) {
  let nextStatus = 'Pending';
  if (currentStatus === 'Pending') nextStatus = 'In Progress';
  else if (currentStatus === 'In Progress') nextStatus = 'Completed';
  else if (currentStatus === 'Completed') nextStatus = 'Pending';

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) throw new Error('Status update failed');
    showToast(`Task ${id} status changed to ${nextStatus}`, 'success');
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open Edit Modal
function openEditModal(task) {
  editTaskId.value = task.id;
  editIdDisplay.value = task.id;
  editTaskTitle.value = task.title;
  editTaskPriority.value = task.priority;
  editTaskStatus.value = task.status;
  editModal.classList.add('active');
}

function closeModal() {
  editModal.classList.remove('active');
}

// PUT /api/tasks/:id - Save modal edits
async function handleUpdateTask(e) {
  e.preventDefault();
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  const priority = editTaskPriority.value;
  const status = editTaskStatus.value;

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status })
    });

    if (!res.ok) throw new Error('Failed to update task');
    showToast(`Task ${id} successfully updated in Workers KV`, 'success');
    closeModal();
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// DELETE /api/tasks/:id - Remove task
async function deleteTask(id, title) {
  if (!confirm(`Are you sure you want to delete task "${id}: ${title}" from Cloudflare Workers KV?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Delete operation failed');
    showToast(`Task ${id} deleted from Workers KV`, 'success');
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Update Metrics Counters
function updateMetrics() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status === 'Pending').length;
  statCompleted.textContent = tasks.filter(t => t.status === 'Completed').length;
  statHigh.textContent = tasks.filter(t => t.priority === 'High').length;
}

// Render Tasks with Search and Filter
function renderTasks() {
  const searchTerm = searchInput.value.toLowerCase();
  const priorityFilter = filterPriority.value;
  const statusFilter = filterStatus.value;

  const filtered = tasks.filter(task => {
    const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm) ||
                          (task.id || '').toLowerCase().includes(searchTerm);
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (filtered.length === 0) {
    tasksTbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No tasks found.</p>
          <small>Create a new academic task using the form on the left.</small>
        </td>
      </tr>
    `;
    return;
  }

  tasksTbody.innerHTML = filtered.map(task => {
    const priorityClass = `badge-${(task.priority || 'medium').toLowerCase()}`;
    const statusSlug = (task.status || 'pending').toLowerCase().replace(/\s+/g, '-');
    const statusClass = `badge-${statusSlug}`;
    const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '';

    return `
      <tr data-id="${task.id}">
        <td><span class="task-id-badge">${escapeHtml(task.id)}</span></td>
        <td>
          <div class="task-title-text">${escapeHtml(task.title)}</div>
          ${createdDate ? `<span class="task-date">Added: ${createdDate}</span>` : ''}
        </td>
        <td>
          <span class="badge ${priorityClass}">${escapeHtml(task.priority || 'Medium')}</span>
        </td>
        <td>
          <span class="badge badge-status ${statusClass}" title="Click to cycle status" onclick="toggleTaskStatus('${escapeHtml(task.id)}', '${escapeHtml(task.status)}')">
            ${escapeHtml(task.status || 'Pending')} ⟳
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-toggle-status" onclick="openEditModalById('${escapeHtml(task.id)}')">Edit</button>
            <button class="btn-action btn-delete" onclick="deleteTask('${escapeHtml(task.id)}', '${escapeHtml(task.title)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditModalById(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openEditModal(task);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Make functions accessible to inline onclick handlers
window.toggleTaskStatus = toggleTaskStatus;
window.openEditModalById = openEditModalById;
window.deleteTask = deleteTask;

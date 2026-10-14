/**
 * Cloudflare Worker: Student Task Management Application
 * Infrastructure as Code (IaC) - Provisioned via Terraform
 * 
 * Features:
 * - REST API with CRUD operations (/api/tasks)
 * - Persistent storage with Cloudflare Workers KV (env.TASKS_KV)
 * - Built-in Web UI serving (HTML, CSS, JS)
 * - Full CORS support for cross-origin requests
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return handleCors();
    }

    try {
      // 1. REST API Routing
      if (pathname.startsWith("/api/tasks")) {
        return await handleApi(request, env, pathname, method);
      }

      // 2. Static Web Interface Serving
      if (pathname === "/style.css") {
        return new Response(CSS_CONTENT, {
          headers: { "Content-Type": "text/css; charset=utf-8", ...corsHeaders() }
        });
      }

      if (pathname === "/script.js") {
        return new Response(JS_CONTENT, {
          headers: { "Content-Type": "application/javascript; charset=utf-8", ...corsHeaders() }
        });
      }

      // Default: Serve HTML for / or /index.html
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
      });
    } catch (err) {
      return jsonResponse({ error: "Internal Server Error", details: err.message }, 500);
    }
  }
};

/**
 * Handle REST API requests for /api/tasks
 */
async function handleApi(request, env, pathname, method) {
  // Check if KV is bound
  if (!env.TASKS_KV) {
    return jsonResponse({
      error: "Workers KV binding 'TASKS_KV' not found. Verify Terraform binding configuration."
    }, 500);
  }

  // Parse path: /api/tasks or /api/tasks/:id
  const parts = pathname.split("/").filter(Boolean); // ['api', 'tasks'] or ['api', 'tasks', 'T101']
  const taskId = parts.length > 2 ? decodeURIComponent(parts[2]) : null;

  // 1. GET /api/tasks - List all tasks
  if (method === "GET" && !taskId) {
    const listResult = await env.TASKS_KV.list({ prefix: "task:" });
    const tasks = [];

    for (const key of listResult.keys) {
      if (key.metadata) {
        tasks.push(key.metadata);
      } else {
        const item = await env.TASKS_KV.get(key.name, "json");
        if (item) tasks.push(item);
      }
    }

    // Sort by createdAt descending
    tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return jsonResponse(tasks);
  }

  // 2. GET /api/tasks/:id - Get individual task
  if (method === "GET" && taskId) {
    const key = `task:${taskId}`;
    const task = await env.TASKS_KV.get(key, "json");
    if (!task) {
      return jsonResponse({ error: `Task with ID '${taskId}' not found` }, 404);
    }
    return jsonResponse(task);
  }

  // 3. POST /api/tasks - Create new task
  if (method === "POST" && !taskId) {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON payload" }, 400);
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return jsonResponse({ error: "Task title is required" }, 400);
    }

    const id = (body.id && String(body.id).trim()) || `T${Date.now().toString().slice(-4)}`;
    const task = {
      id: id,
      title: body.title.trim(),
      priority: body.priority || "Medium",
      status: body.status || "Pending",
      createdAt: body.createdAt || new Date().toISOString()
    };

    const key = `task:${id}`;
    // Save with metadata for O(1) list queries
    await env.TASKS_KV.put(key, JSON.stringify(task), { metadata: task });

    return jsonResponse(task, 201);
  }

  // 4. PUT /api/tasks/:id - Update existing task
  if (method === "PUT" && taskId) {
    const key = `task:${taskId}`;
    const existing = await env.TASKS_KV.get(key, "json");
    if (!existing) {
      return jsonResponse({ error: `Task with ID '${taskId}' not found` }, 404);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON payload" }, 400);
    }

    const updatedTask = {
      ...existing,
      title: body.title !== undefined ? String(body.title).trim() : existing.title,
      priority: body.priority !== undefined ? body.priority : existing.priority,
      status: body.status !== undefined ? body.status : existing.status,
      updatedAt: new Date().toISOString()
    };

    await env.TASKS_KV.put(key, JSON.stringify(updatedTask), { metadata: updatedTask });
    return jsonResponse(updatedTask);
  }

  // 5. DELETE /api/tasks/:id - Delete task
  if (method === "DELETE" && taskId) {
    const key = `task:${taskId}`;
    const existing = await env.TASKS_KV.get(key, "json");
    if (!existing) {
      return jsonResponse({ error: `Task with ID '${taskId}' not found` }, 404);
    }

    await env.TASKS_KV.delete(key);
    return jsonResponse({ message: `Task '${taskId}' deleted successfully`, id: taskId });
  }

  return jsonResponse({ error: `Method ${method} not allowed on this path` }, 405);
}

// Helper: JSON response with CORS
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

// Embedded Static Assets
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Task Management System | Serverless IaC</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="title-section">
          <div class="logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 id="app-title">Student Task Management Application</h1>
            <p class="subtitle">Cloud-Based Serverless Academic Task Tracker</p>
          </div>
        </div>

        <div class="tech-pills">
          <span class="pill pill-iac"><span class="dot"></span> Terraform Managed</span>
          <span class="pill pill-worker"><span class="dot"></span> Cloudflare Worker</span>
          <span class="pill pill-kv"><span class="dot"></span> Workers KV Storage</span>
        </div>
      </div>
    </header>

    <div id="toast" class="toast"></div>

    <section class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon total-icon">📋</div>
        <div class="metric-info">
          <span class="metric-label">Total Tasks</span>
          <span class="metric-value" id="stat-total">0</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon pending-icon">⏳</div>
        <div class="metric-info">
          <span class="metric-label">Pending</span>
          <span class="metric-value" id="stat-pending">0</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon completed-icon">✅</div>
        <div class="metric-info">
          <span class="metric-label">Completed</span>
          <span class="metric-value" id="stat-completed">0</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon high-icon">🔥</div>
        <div class="metric-info">
          <span class="metric-label">High Priority</span>
          <span class="metric-value" id="stat-high">0</span>
        </div>
      </div>
    </section>

    <main class="main-layout">
      <section class="form-section card">
        <div class="card-header">
          <h2>Create Academic Task</h2>
          <span class="card-badge">REST POST</span>
        </div>

        <form id="task-form">
          <div class="form-group">
            <label for="task-id">Task ID (Optional)</label>
            <input type="text" id="task-id" placeholder="e.g. T101 (auto-generated if empty)">
            <small class="helper-text">Unique key identifier stored in Workers KV</small>
          </div>

          <div class="form-group">
            <label for="task-title">Task Title <span class="required">*</span></label>
            <input type="text" id="task-title" placeholder="e.g. Complete Cloud Computing Assignment" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="task-priority">Priority</label>
              <select id="task-priority">
                <option value="High">High</option>
                <option value="Medium" selected>Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div class="form-group">
              <label for="task-status">Status</label>
              <select id="task-status">
                <option value="Pending" selected>Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <button type="submit" id="submit-btn" class="btn btn-primary">
            <span class="btn-text">Add Task to Cloud Storage</span>
          </button>
        </form>

        <div class="quick-samples">
          <p class="quick-title">Quick Academic Presets:</p>
          <div class="preset-chips">
            <button class="chip" data-preset="Complete Cloud Computing Assignment" data-priority="High">Cloud Assignment</button>
            <button class="chip" data-preset="Prepare Final Year Project Presentation" data-priority="High">Project Presentation</button>
            <button class="chip" data-preset="Submit Final Year Project Report" data-priority="Medium">Project Report</button>
            <button class="chip" data-preset="Attend Project Viva" data-priority="High">Project Viva</button>
            <button class="chip" data-preset="Upload Laboratory Assignment" data-priority="Low">Lab Assignment</button>
          </div>
        </div>
      </section>

      <section class="list-section card">
        <div class="card-header">
          <div>
            <h2>Academic Task Registry</h2>
            <p class="section-subtext">Synced in real-time with Cloudflare Workers KV</p>
          </div>
          <button id="refresh-btn" class="btn btn-secondary btn-sm" title="Refresh task list">🔄 Refresh</button>
        </div>

        <div class="filter-bar">
          <div class="search-box">
            <input type="text" id="search-input" placeholder="Search tasks by title or ID...">
          </div>
          <div class="filter-dropdowns">
            <select id="filter-priority">
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select id="filter-status">
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="tasks-table">
            <thead>
              <tr>
                <th width="12%">ID</th>
                <th width="38%">Task Title</th>
                <th width="15%">Priority</th>
                <th width="15%">Status</th>
                <th width="20%">Actions</th>
              </tr>
            </thead>
            <tbody id="tasks-tbody">
              <tr>
                <td colspan="5" class="loading-state">
                  <div class="spinner"></div>
                  <span>Connecting to Cloudflare Workers KV...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <div id="edit-modal" class="modal">
      <div class="modal-content card">
        <div class="modal-header">
          <h3>Update Academic Task</h3>
          <button id="close-modal-btn" class="close-btn">&times;</button>
        </div>
        <form id="edit-form">
          <input type="hidden" id="edit-task-id">
          <div class="form-group">
            <label>Task ID</label>
            <input type="text" id="edit-id-display" disabled class="input-disabled">
          </div>
          <div class="form-group">
            <label for="edit-task-title">Task Title <span class="required">*</span></label>
            <input type="text" id="edit-task-title" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="edit-task-priority">Priority</label>
              <select id="edit-task-priority">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-task-status">Status</label>
              <select id="edit-task-status">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-edit-btn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <footer class="app-footer">
      <div class="footer-content">
        <p><strong>Infrastructure as Code (IaC) Mini Project</strong> &bull; Automated Deployment using Terraform</p>
        <p class="footer-sub">Cloud Platform: Cloudflare Workers &bull; Storage: Cloudflare Workers KV &bull; CI/CD: GitHub Actions</p>
      </div>
    </footer>
  </div>

  <script src="/script.js"></script>
</body>
</html>`;

const CSS_CONTENT = `:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #eff6ff;
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  
  --priority-high-bg: #fee2e2;
  --priority-high-text: #b91c1c;
  --priority-med-bg: #fef3c7;
  --priority-med-text: #b45309;
  --priority-low-bg: #dcfce7;
  --priority-low-text: #15803d;

  --status-pending-bg: #f1f5f9;
  --status-pending-text: #475569;
  --status-progress-bg: #e0e7ff;
  --status-progress-text: #4338ca;
  --status-completed-bg: #d1fae5;
  --status-completed-text: #065f46;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --radius: 10px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-primary);
  line-height: 1.5;
  padding: 24px;
}
.app-container { max-width: 1200px; margin: 0 auto; }
.app-header {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 28px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}
.header-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.title-section { display: flex; align-items: center; gap: 14px; }
.logo-badge {
  background: var(--primary-light);
  color: var(--primary);
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-header h1 { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.tech-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}
.dot { width: 6px; height: 6px; border-radius: 50%; }
.pill-iac { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
.pill-iac .dot { background: #7c3aed; }
.pill-worker { background: #fff7ed; color: #c2410c; border-color: #ffedd5; }
.pill-worker .dot { background: #ea580c; }
.pill-kv { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.pill-kv .dot { background: #16a34a; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}
.metric-card:hover { transform: translateY(-2px); }
.metric-icon {
  font-size: 1.8rem;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
}
.metric-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.metric-value { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }

.main-layout { display: grid; grid-template-columns: 380px 1fr; gap: 24px; }
@media (max-width: 900px) { .main-layout { grid-template-columns: 1fr; } }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-header h2 { font-size: 1.15rem; font-weight: 600; }
.card-badge {
  font-size: 0.7rem;
  font-family: monospace;
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.section-subtext { font-size: 0.8rem; color: var(--text-secondary); }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
.required { color: #dc2626; }
.helper-text { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }

input[type="text"], select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text-primary);
  background-color: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input[type="text"]:focus, select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.input-disabled { background-color: var(--bg-main) !important; color: var(--text-secondary) !important; cursor: not-allowed; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.btn {
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.15s ease, transform 0.05s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary { background-color: var(--primary); color: #fff; width: 100%; }
.btn-primary:hover { background-color: var(--primary-hover); }
.btn-secondary { background-color: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); }
.btn-secondary:hover { background-color: var(--border); }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }

.quick-samples { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.quick-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.preset-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }

.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; }
.filter-dropdowns { display: flex; gap: 8px; }
.filter-dropdowns select { width: auto; min-width: 130px; }

.table-responsive { overflow-x: auto; }
.tasks-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.tasks-table th {
  text-align: left;
  padding: 12px 14px;
  background-color: var(--bg-main);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}
.tasks-table td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tasks-table tr:hover { background-color: #fafbfc; }

.task-id-badge {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 6px;
  border-radius: 4px;
}
.task-title-text { font-weight: 500; }
.task-date { display: block; font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; }

.badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.badge-high { background: var(--priority-high-bg); color: var(--priority-high-text); }
.badge-medium { background: var(--priority-med-bg); color: var(--priority-med-text); }
.badge-low { background: var(--priority-low-bg); color: var(--priority-low-text); }

.badge-status { cursor: pointer; border: 1px solid transparent; user-select: none; }
.badge-pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.badge-in-progress { background: var(--status-progress-bg); color: var(--status-progress-text); }
.badge-completed { background: var(--status-completed-bg); color: var(--status-completed-text); }

.action-buttons { display: flex; gap: 6px; }
.btn-action {
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  transition: all 0.1s ease;
}
.btn-action:hover { background: var(--bg-main); }
.btn-delete:hover { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
.btn-toggle-status:hover { background: #e0f2fe; border-color: #7dd3fc; color: #0369a1; }

.empty-state, .loading-state { text-align: center; padding: 48px 16px; color: var(--text-secondary); }
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

.modal {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.modal.active { display: flex; }
.modal-content { width: 90%; max-width: 500px; animation: modalIn 0.2s ease-out; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.close-btn { background: none; border: none; font-size: 1.5rem; line-height: 1; color: var(--text-secondary); cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.toast {
  position: fixed;
  bottom: 24px; right: 24px;
  padding: 12px 20px;
  border-radius: 6px;
  background: #1e293b;
  color: #fff;
  font-size: 0.88rem;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 2000;
}
.toast.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
.toast.toast-success { background: #065f46; }
.toast.toast-error { background: #991b1b; }

.app-footer {
  text-align: center;
  margin-top: 40px;
  padding: 24px 0;
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.footer-sub { font-size: 0.78rem; margin-top: 4px; opacity: 0.85; }`;

const JS_CONTENT = `let tasks = [];
const API_BASE = '/api/tasks';

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

const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const statHigh = document.getElementById('stat-high');

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

  document.querySelectorAll('.preset-chips .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      taskTitleInput.value = chip.dataset.preset;
      taskPriorityInput.value = chip.dataset.priority || 'Medium';
      taskTitleInput.focus();
    });
  });

  closeModalBtn.addEventListener('click', closeModal);
  cancelEditBtn.addEventListener('click', closeModal);
  editForm.addEventListener('submit', handleUpdateTask);
  window.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });
}

function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = 'toast show toast-' + type;
  setTimeout(() => { toastEl.className = 'toast'; }, 3500);
}

function generateNextTaskId() {
  if (tasks.length === 0) return 'T101';
  const numericIds = tasks
    .map(t => {
      const match = (t.id || '').match(/^T(\\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  if (numericIds.length === 0) return 'T' + (101 + tasks.length);
  const maxId = Math.max(...numericIds);
  return 'T' + (maxId + 1);
}

async function fetchTasks() {
  tasksTbody.innerHTML = '<tr><td colspan="5" class="loading-state"><div class="spinner"></div><span>Fetching tasks from Workers KV...</span></td></tr>';
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('HTTP Error: ' + res.status);
    const data = await res.json();
    tasks = Array.isArray(data) ? data : (data.tasks || []);
    updateMetrics();
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks:', err);
    tasksTbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p style="color: #dc2626; font-weight: 600;">Failed to connect to Workers KV storage.</p><small>' + err.message + '</small></td></tr>';
    showToast('Failed to load tasks from Cloudflare KV', 'error');
  }
}

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
      throw new Error(errData.error || ('Failed with status ' + res.status));
    }

    const newTask = await res.json();
    showToast('Task ' + (newTask.id || id) + ' created in Workers KV!', 'success');
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

async function toggleTaskStatus(id, currentStatus) {
  let nextStatus = 'Pending';
  if (currentStatus === 'Pending') nextStatus = 'In Progress';
  else if (currentStatus === 'In Progress') nextStatus = 'Completed';
  else if (currentStatus === 'Completed') nextStatus = 'Pending';

  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) throw new Error('Status update failed');
    showToast('Task ' + id + ' status changed to ' + nextStatus, 'success');
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

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

async function handleUpdateTask(e) {
  e.preventDefault();
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  const priority = editTaskPriority.value;
  const status = editTaskStatus.value;

  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status })
    });

    if (!res.ok) throw new Error('Failed to update task');
    showToast('Task ' + id + ' successfully updated in Workers KV', 'success');
    closeModal();
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id, title) {
  if (!confirm('Are you sure you want to delete task "' + id + ': ' + title + '" from Cloudflare Workers KV?')) {
    return;
  }

  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Delete operation failed');
    showToast('Task ' + id + ' deleted from Workers KV', 'success');
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateMetrics() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status === 'Pending').length;
  statCompleted.textContent = tasks.filter(t => t.status === 'Completed').length;
  statHigh.textContent = tasks.filter(t => t.priority === 'High').length;
}

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
    tasksTbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No tasks found.</p><small>Create a new academic task using the form on the left.</small></td></tr>';
    return;
  }

  tasksTbody.innerHTML = filtered.map(task => {
    const priorityClass = 'badge-' + (task.priority || 'medium').toLowerCase();
    const statusSlug = (task.status || 'pending').toLowerCase().replace(/\\s+/g, '-');
    const statusClass = 'badge-' + statusSlug;
    const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '';

    return '<tr data-id="' + escapeHtml(task.id) + '">' +
      '<td><span class="task-id-badge">' + escapeHtml(task.id) + '</span></td>' +
      '<td><div class="task-title-text">' + escapeHtml(task.title) + '</div>' +
      (createdDate ? '<span class="task-date">Added: ' + createdDate + '</span>' : '') +
      '</td>' +
      '<td><span class="badge ' + priorityClass + '">' + escapeHtml(task.priority || 'Medium') + '</span></td>' +
      '<td><span class="badge badge-status ' + statusClass + '" title="Click to cycle status" onclick="toggleTaskStatus(\\'' + escapeHtml(task.id) + '\\', \\'' + escapeHtml(task.status) + '\\')">' +
        escapeHtml(task.status || 'Pending') + ' &#x21bb;</span></td>' +
      '<td><div class="action-buttons">' +
        '<button class="btn-action btn-toggle-status" onclick="openEditModalById(\\'' + escapeHtml(task.id) + '\\')">Edit</button>' +
        '<button class="btn-action btn-delete" onclick="deleteTask(\\'' + escapeHtml(task.id) + '\\', \\'' + escapeHtml(task.title) + '\\')">Delete</button>' +
      '</div></td>' +
    '</tr>';
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

window.toggleTaskStatus = toggleTaskStatus;
window.openEditModalById = openEditModalById;
window.deleteTask = deleteTask;`;

/**
 * Local Development & Testing Preview Server
 * Simulates Cloudflare Worker + Workers KV storage in memory
 * 
 * Usage:
 *   node local-preview.js
 * Open:
 *   http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const inMemoryKV = new Map();

// Pre-populate sample academic tasks
const initialTasks = [
  { id: 'T101', title: 'Complete Cloud Computing Assignment', priority: 'High', status: 'Pending', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'T102', title: 'Prepare Final Year Project Presentation', priority: 'High', status: 'In Progress', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'T103', title: 'Submit Final Year Project Report', priority: 'Medium', status: 'Completed', createdAt: new Date(Date.now() - 3600000 * 48).toISOString() }
];

initialTasks.forEach(t => inMemoryKV.set(`task:${t.id}`, JSON.stringify(t)));

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. REST API
  if (pathname.startsWith('/api/tasks')) {
    const parts = pathname.split('/').filter(Boolean);
    const taskId = parts.length > 2 ? decodeURIComponent(parts[2]) : null;

    // GET /api/tasks
    if (method === 'GET' && !taskId) {
      const tasks = Array.from(inMemoryKV.values()).map(v => JSON.parse(v));
      tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tasks));
      return;
    }

    // GET /api/tasks/:id
    if (method === 'GET' && taskId) {
      const data = inMemoryKV.get(`task:${taskId}`);
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Task '${taskId}' not found` }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
      return;
    }

    // POST /api/tasks
    if (method === 'POST' && !taskId) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!parsed.title || !parsed.title.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Task title is required' }));
            return;
          }
          const id = parsed.id && parsed.id.trim() ? parsed.id.trim() : `T${Date.now().toString().slice(-4)}`;
          const task = {
            id,
            title: parsed.title.trim(),
            priority: parsed.priority || 'Medium',
            status: parsed.status || 'Pending',
            createdAt: new Date().toISOString()
          };
          inMemoryKV.set(`task:${id}`, JSON.stringify(task));
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(task));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    // PUT /api/tasks/:id
    if (method === 'PUT' && taskId) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const raw = inMemoryKV.get(`task:${taskId}`);
        if (!raw) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Task '${taskId}' not found` }));
          return;
        }
        const existing = JSON.parse(raw);
        const parsed = JSON.parse(body || '{}');
        const updated = {
          ...existing,
          title: parsed.title !== undefined ? parsed.title.trim() : existing.title,
          priority: parsed.priority !== undefined ? parsed.priority : existing.priority,
          status: parsed.status !== undefined ? parsed.status : existing.status,
          updatedAt: new Date().toISOString()
        };
        inMemoryKV.set(`task:${taskId}`, JSON.stringify(updated));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
      });
      return;
    }

    // DELETE /api/tasks/:id
    if (method === 'DELETE' && taskId) {
      if (!inMemoryKV.has(`task:${taskId}`)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Task '${taskId}' not found` }));
        return;
      }
      inMemoryKV.delete(`task:${taskId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Task '${taskId}' deleted`, id: taskId }));
      return;
    }
  }

  // 2. Static Assets
  let filePath = path.join(__dirname, 'application', 'index.html');
  let contentType = 'text/html';

  if (pathname === '/style.css') {
    filePath = path.join(__dirname, 'application', 'style.css');
    contentType = 'text/css';
  } else if (pathname === '/script.js') {
    filePath = path.join(__dirname, 'application', 'script.js');
    contentType = 'application/javascript';
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Student Task Manager Preview Server is running!`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  REST API : http://localhost:${PORT}/api/tasks`);
  console.log(`======================================================\n`);
});

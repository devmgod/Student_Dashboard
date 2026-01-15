import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dbOps } from "./db.js";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const allowedOrigins = [
  "https://student-dashboard-1-6w26.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ====== CONFIG (set these in env) ======
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = "http://localhost:4000/auth/google/callback",
} = process.env;

// Minimal scope for listing courses:
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
];

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Set them in server/.env or your shell."
  );
}

// Simple in-memory token store (OK for testing only)
let tokenStore = { access_token: null, expires_at: 0 };

// Helper: build Google consent URL
function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

app.get("/auth/google", (req, res) => {
  const url = buildAuthUrl();
  console.log("AUTH URL:", url); // <-- add this
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) return res.status(400).send(`OAuth error: ${error}`);
  if (!code) return res.status(400).send("Missing code");

  // Exchange code -> token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    return res.status(400).json({ message: "Token exchange failed", tokenJson });
  }

  tokenStore.access_token = tokenJson.access_token;
  tokenStore.expires_at = Date.now() + (tokenJson.expires_in * 1000);

  // Redirect back to React UI
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";
  res.redirect(`${FRONTEND_URL}/?connected=1`);
});

app.get("/api/me", async (req, res) => {
  if (!tokenStore.access_token) return res.status(401).json({ error: "Not connected" });

  const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenStore.access_token}` },
  });

  const json = await r.json();
  res.status(r.status).json(json);
});


app.get("/api/courses", async (req, res) => {
  if (!tokenStore.access_token) return res.status(401).json({ error: "Not connected" });

  // Force active courses (most common requirement)
  const url =
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&courseStates=ARCHIVED&courseStates=PROVISIONED&pageSize=100";


  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenStore.access_token}` },
  });

  const json = await r.json();
  res.status(r.status).json(json);
});

app.get("/api/courses/:courseId/courseWork", async (req, res) => {
  if (!tokenStore.access_token) return res.status(401).json({ error: "Not connected" });

  const { courseId } = req.params;
  const url = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=100`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenStore.access_token}` },
  });

  const json = await r.json();
  res.status(r.status).json(json);
});


app.get("/api/courses/:courseId/courseWork/:workId/submissions", async (req, res) => {
  if (!tokenStore.access_token) return res.status(401).json({ error: "Not connected" });

  const { courseId, workId } = req.params;
  const url = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${workId}/studentSubmissions`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenStore.access_token}` },
  });

  const json = await r.json();
  res.status(r.status).json(json);
});

// ====== CUSTOM TASKS API ======

// Helper function to get user email (with fallback for mock/local mode)
async function getUserEmail() {
  if (tokenStore.access_token) {
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenStore.access_token}` },
      });
      const user = await userRes.json();
      if (userRes.ok && user.email) {
        return user.email;
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  }
  // Fallback for mock/local mode
  return "local_user@example.com";
}

// Get all custom tasks for a user
app.get("/api/custom-tasks", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const tasks = dbOps.getTasks(userEmail);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching custom tasks:", error);
    res.status(500).json({ error: "Failed to fetch custom tasks" });
  }
});

// Create a new custom task
app.post("/api/custom-tasks", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { title, courseId, courseName, dueDate, dueText, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const taskId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dbOps.createTask({
      id: taskId,
      userEmail: userEmail,
      title,
      courseId: courseId || 'custom',
      courseName: courseName || 'Custom',
      dueDate: dueDate || null,
      dueText: dueText || null,
      status: status || 'PENDING'
    });

    const task = dbOps.getTask(taskId);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating custom task:", error);
    res.status(500).json({ error: "Failed to create custom task" });
  }
});

// Update a custom task
app.put("/api/custom-tasks/:taskId", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { taskId } = req.params;
    const { title, courseId, courseName, dueDate, dueText, status } = req.body;

    const result = dbOps.updateTask(taskId, userEmail, {
      title,
      courseId,
      courseName,
      dueDate,
      dueText,
      status
    });

    if (result.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = dbOps.getTask(taskId);
    res.json(task);
  } catch (error) {
    console.error("Error updating custom task:", error);
    res.status(500).json({ error: "Failed to update custom task" });
  }
});

// Delete a custom task
app.delete("/api/custom-tasks/:taskId", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { taskId } = req.params;
    const result = dbOps.deleteTask(taskId, userEmail);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting custom task:", error);
    res.status(500).json({ error: "Failed to delete custom task" });
  }
});

// ====== SUBTASKS API ======

// Get all subtasks for a task
app.get("/api/tasks/:taskId/subtasks", async (req, res) => {
  try {
    const { taskId } = req.params;
    const subtasks = dbOps.getSubtasks(taskId);
    res.json(subtasks);
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    res.status(500).json({ error: "Failed to fetch subtasks" });
  }
});

// Create a new subtask
app.post("/api/tasks/:taskId/subtasks", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Subtask text is required" });
    }

    const subtaskId = `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dbOps.createSubtask({
      id: subtaskId,
      taskId,
      text: text.trim(),
      completed: false
    });

    const subtask = dbOps.getSubtask(subtaskId);
    res.status(201).json(subtask);
  } catch (error) {
    console.error("Error creating subtask:", error);
    res.status(500).json({ error: "Failed to create subtask" });
  }
});

// Update a subtask
app.put("/api/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { text, completed } = req.body;

    const result = dbOps.updateSubtask(subtaskId, taskId, {
      text: text?.trim(),
      completed: completed !== undefined ? completed : false
    });

    if (result.changes === 0) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    const subtask = dbOps.getSubtask(subtaskId);
    res.json(subtask);
  } catch (error) {
    console.error("Error updating subtask:", error);
    res.status(500).json({ error: "Failed to update subtask" });
  }
});

// Toggle subtask completion
app.patch("/api/tasks/:taskId/subtasks/:subtaskId/toggle", async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const result = dbOps.toggleSubtask(subtaskId, taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    const subtask = dbOps.getSubtask(subtaskId);
    res.json(subtask);
  } catch (error) {
    console.error("Error toggling subtask:", error);
    res.status(500).json({ error: "Failed to toggle subtask" });
  }
});

// Delete a subtask
app.delete("/api/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const result = dbOps.deleteSubtask(subtaskId, taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    res.status(500).json({ error: "Failed to delete subtask" });
  }
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
  console.log("Start OAuth: http://localhost:4000/auth/google");
});

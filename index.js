import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dbOps } from "./db.js";
import OpenAI from "openai";

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
  OPENAI_API_KEY,
} = process.env;

// Initialize OpenAI client
let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
} else {
  console.warn("Missing OPENAI_API_KEY. AI features will be disabled.");
}

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

// ====== AI SUBTASK GENERATION API ======

// Generate subtasks using AI
app.post("/api/tasks/:taskId/generate-subtasks", async (req, res) => {
  try {
    if (!openai) {
      return res.status(400).json({
        error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
      });
    }

    const { taskId } = req.params;
    const { title, description, courseName } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    // System prompt in Catalan with specific instructions
    const systemPrompt = `Ets un assistent que ajuda a descompondre tasques escolars en subtasques. 
SEMPRE respon en CATALÀ.
Utilitza frases CURTES i verbs d'acció (per exemple: "Llegir", "Escriure", "Fer l'esquema", "Revisar", "Completar").
Cada subtasca ha de ser una acció concreta i clara.
Respon només amb una llista de subtasques, una per línia, sense numeració ni punts.
Cada subtasca ha de començar amb un verb d'acció en infinitiu.`;

    // Build user prompt with task information
    let userPrompt = `Descompon aquesta tasca en subtasques:\n\nTítol: ${title}`;
    if (courseName) {
      userPrompt += `\nAssignatura: ${courseName}`;
    }
    if (description) {
      userPrompt += `\nDescripció: ${description}`;
    }
    userPrompt += `\n\nGenera entre 3 i 8 subtasques rellevants per completar aquesta tasca.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a cost-effective model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    
    if (!aiResponse.trim()) {
      return res.status(500).json({ error: "AI did not generate any subtasks" });
    }

    // Parse the AI response - split by newlines and filter empty lines
    const subtaskTexts = aiResponse
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+[\.\)]/)) // Remove numbered lists
      .map(line => line.replace(/^[-•*]\s*/, '')) // Remove bullet points
      .map(line => line.replace(/^\d+\.\s*/, '')) // Remove numbers at start
      .filter(line => line.length > 0)
      .slice(0, 10); // Limit to 10 subtasks max

    if (subtaskTexts.length === 0) {
      return res.status(500).json({ error: "Could not parse subtasks from AI response" });
    }

    // Create subtasks in database
    const createdSubtasks = [];
    for (const text of subtaskTexts) {
      const subtaskId = `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      dbOps.createSubtask({
        id: subtaskId,
        taskId,
        text: text.trim(),
        completed: false
      });
      const subtask = dbOps.getSubtask(subtaskId);
      createdSubtasks.push(subtask);
    }

    res.status(201).json({
      message: `Generated ${createdSubtasks.length} subtasks`,
      subtasks: createdSubtasks
    });
  } catch (error) {
    console.error("Error generating subtasks with AI:", error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({
        error: "Invalid OpenAI API key",
        details: error.message,
      });
    } else if (error.status === 429) {
      return res.status(429).json({
        error: "OpenAI API rate limit exceeded. Please try again later.",
        details: error.message,
      });
    } else {
      return res.status(500).json({
        error: "Failed to generate subtasks with AI",
        details: error.message,
      });
    }
  }
});

// ====== COURSE COLORS API ======

// Get all course colors for a user
app.get("/api/course-colors", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const colors = dbOps.getAllCourseColors(userEmail);
    res.json(colors);
  } catch (error) {
    console.error("Error fetching course colors:", error);
    res.status(500).json({ error: "Failed to fetch course colors" });
  }
});

// Get color for a specific course
app.get("/api/course-colors/:courseName", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { courseName } = req.params;
    const color = dbOps.getCourseColor(userEmail, decodeURIComponent(courseName));
    res.json({ courseName: decodeURIComponent(courseName), color });
  } catch (error) {
    console.error("Error fetching course color:", error);
    res.status(500).json({ error: "Failed to fetch course color" });
  }
});

// Set color for a specific course
app.put("/api/course-colors/:courseName", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { courseName } = req.params;
    const { color } = req.body;
    
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: "Valid hex color is required (e.g., #2563eb)" });
    }
    
    dbOps.setCourseColor(userEmail, decodeURIComponent(courseName), color);
    res.json({ courseName: decodeURIComponent(courseName), color });
  } catch (error) {
    console.error("Error setting course color:", error);
    res.status(500).json({ error: "Failed to set course color" });
  }
});

// Delete color for a specific course (reset to default)
app.delete("/api/course-colors/:courseName", async (req, res) => {
  try {
    const userEmail = await getUserEmail();
    const { courseName } = req.params;
    dbOps.deleteCourseColor(userEmail, decodeURIComponent(courseName));
    res.json({ message: "Course color reset to default" });
  } catch (error) {
    console.error("Error deleting course color:", error);
    res.status(500).json({ error: "Failed to delete course color" });
  }
});

// ====== OPENAI API KEY VALIDATION ======

// Test endpoint to verify OpenAI API key
app.get("/api/test-openai-key", async (req, res) => {
  try {
    if (!openai) {
      return res.status(400).json({
        valid: false,
        error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
      });
    }

    // Make a simple API call to verify the key
    // Using models.list() as it's a lightweight endpoint that validates the key
    const models = await openai.models.list();
    
    res.json({
      valid: true,
      message: "OpenAI API key is valid!",
      modelsCount: models.data.length,
      // Don't expose sensitive info, just confirm it works
    });
  } catch (error) {
    console.error("OpenAI API key validation error:", error);
    
    // Check for specific error types
    if (error.status === 401) {
      return res.status(401).json({
        valid: false,
        error: "Invalid API key. The key provided is not valid or has been revoked.",
        details: error.message,
      });
    } else if (error.status === 429) {
      return res.status(429).json({
        valid: true,
        warning: "API key is valid but rate limit exceeded. Please try again later.",
        details: error.message,
      });
    } else {
      return res.status(500).json({
        valid: false,
        error: "Error validating API key",
        details: error.message,
      });
    }
  }
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
  console.log("Start OAuth: http://localhost:4000/auth/google");
  if (openai) {
    console.log("OpenAI API key is configured. Test it at: http://localhost:4000/api/test-openai-key");
  }
});

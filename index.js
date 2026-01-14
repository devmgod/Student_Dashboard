import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

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
  FRONT_URL,
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
  const frontendUrl = FRONT_URL || "http://localhost:5174";
  res.redirect(`${frontendUrl}/?connected=1`);
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

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
  console.log("Start OAuth: http://localhost:4000/auth/google");
});

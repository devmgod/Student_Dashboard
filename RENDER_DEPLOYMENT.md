# Step-by-Step Guide: Deploying to Render.com

This guide will walk you through deploying your Student Dashboard application to Render.com. The application consists of a backend (Node.js/Express) and a frontend (React/Vite).

## Prerequisites

- A GitHub account
- A Render.com account (sign up at https://render.com)
- Google Cloud Console project with OAuth credentials
- OpenAI API key (optional, for AI features)

---

## Part 1: Prepare Your Repository

### Alternative: Using Render Blueprint (Optional)

If you prefer, you can use the `render.yaml` file included in this project to deploy both services at once. After pushing to GitHub:

1. In Render dashboard, click **"New +"** > **"Blueprint"**
2. Select your repository
3. Render will automatically detect `render.yaml` and configure both services
4. You'll still need to add environment variables manually in the dashboard

**Note**: The manual steps below give you more control and understanding of the process.

### Step 1.1: Push Your Code to GitHub

1. If you haven't already, initialize a git repository in your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub (e.g., `student-dashboard`)

3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Deploy Backend Service

### Step 2.1: Create a Web Service on Render

1. Log in to your Render.com dashboard
2. Click **"New +"** button in the top right
3. Select **"Web Service"**
4. Connect your GitHub account if you haven't already
5. Select the repository containing your project

### Step 2.2: Configure Backend Service Settings

Fill in the following configuration:

- **Name**: `student-dashboard-backend` (or your preferred name)
- **Region**: Choose the closest region to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (or set to `.` if needed)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Instance Type**: Choose based on your needs:
  - **Free**: 512 MB RAM (suitable for testing)
  - **Starter**: $7/month (1 GB RAM, better for production)

### Step 2.3: Set Environment Variables

Click on **"Advanced"** and add the following environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_BACKEND_URL.onrender.com/auth/google/callback` | **Update after deployment** |
| `OPENAI_API_KEY` | Your OpenAI API Key | Optional, for AI features |
| `FRONTEND_URL` | `https://YOUR_FRONTEND_URL.onrender.com` | **Update after frontend deployment** |
| `NODE_ENV` | `production` | Production environment flag |
| `PORT` | `4000` | Server port (Render sets this automatically, but good to have) |

**Important Notes:**
- You'll need to update `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` after you get the actual URLs from Render
- Render automatically sets the `PORT` environment variable, but your code should use `process.env.PORT || 4000`

### Step 2.4: Update Backend Code for Render

✅ **Good news!** The backend code has already been updated to use `process.env.PORT` from environment variables, so it will work correctly on Render.

However, you still need to update the CORS allowed origins in `index.js` to include your Render frontend URL. After you get your frontend URL, update the `allowedOrigins` array around line 15-19 in `index.js`.

### Step 2.5: Deploy Backend

1. Click **"Create Web Service"**
2. Render will start building and deploying your backend
3. Wait for the deployment to complete (usually 2-5 minutes)
4. Once deployed, copy your backend URL (e.g., `https://student-dashboard-backend.onrender.com`)

---

## Part 3: Deploy Frontend Service

### Step 3.1: Create a Static Site on Render

1. In your Render dashboard, click **"New +"**
2. Select **"Static Site"**
3. Connect the same GitHub repository
4. Select the repository

### Step 3.2: Configure Frontend Settings

Fill in the following:

- **Name**: `student-dashboard-frontend` (or your preferred name)
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `frontend/dist`

### Step 3.3: Set Frontend Environment Variables (if needed)

If your frontend needs to know the backend URL, you may need to:
1. Create a `.env.production` file in the `frontend` directory, OR
2. Use Render's environment variables (if your build process supports it)

**Note**: Check your frontend code to see if it needs the backend URL. You may need to update API endpoints in your React code to use the production backend URL.

### Step 3.4: Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for the build and deployment to complete
3. Copy your frontend URL (e.g., `https://student-dashboard-frontend.onrender.com`)

---

## Part 4: Update Configuration

### Step 4.1: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR_BACKEND_URL.onrender.com/auth/google/callback
   ```
5. Under **Authorized JavaScript origins**, add:
   ```
   https://YOUR_BACKEND_URL.onrender.com
   https://YOUR_FRONTEND_URL.onrender.com
   ```
6. Click **Save**

### Step 4.2: Update Backend Environment Variables

1. Go back to your Render dashboard
2. Navigate to your backend service
3. Go to **Environment** tab
4. Update the following variables:
   - `GOOGLE_REDIRECT_URI`: Set to `https://YOUR_BACKEND_URL.onrender.com/auth/google/callback`
   - `FRONTEND_URL`: Set to `https://YOUR_FRONTEND_URL.onrender.com`
5. Click **Save Changes**
6. Render will automatically redeploy with the new environment variables

### Step 4.3: Update Backend CORS Settings

Update the `allowedOrigins` array in `index.js` to include your frontend URL:

```javascript
const allowedOrigins = [
  "https://YOUR_FRONTEND_URL.onrender.com",
  "https://student-dashboard-1-6w26.onrender.com", // Keep existing if needed
  "http://localhost:5173",
  "http://localhost:5174"
];
```

Commit and push this change to trigger a redeploy.

---

## Part 5: Database Considerations

### ⚠️ Important: SQLite on Render

**SQLite databases on Render are ephemeral** - they will be deleted when:
- The service restarts
- The service is redeployed
- The service goes to sleep (free tier)

### Option 1: Use Render PostgreSQL (Recommended for Production)

1. In Render dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Configure:
   - **Name**: `student-dashboard-db`
   - **Database**: `student_dashboard`
   - **User**: Auto-generated
   - **Region**: Same as your backend
4. Click **"Create Database"**
5. Copy the **Internal Database URL** and **External Database URL**
6. Update your `db.js` to use PostgreSQL instead of SQLite
7. Install PostgreSQL driver: `npm install pg`

### Option 2: Accept Ephemeral Storage (For Testing)

If you're okay with data being reset, you can keep SQLite. The database will work, but data will be lost on restarts.

### Option 3: Use External Database Service

Consider using:
- **Supabase** (free tier available)
- **PlanetScale** (free tier available)
- **Railway** (PostgreSQL)
- **Neon** (serverless PostgreSQL)

---

## Part 6: Update Frontend API Endpoints

### Step 6.1: Check Frontend API Configuration

Check your frontend code (likely in `App.jsx` or a config file) to see where API calls are made. Update hardcoded localhost URLs to use your backend URL.

**Example:**
```javascript
// Before
const API_URL = 'http://localhost:4000';

// After
const API_URL = import.meta.env.VITE_API_URL || 'https://YOUR_BACKEND_URL.onrender.com';
```

### Step 6.2: Create Environment File for Frontend

Create `frontend/.env.production`:
```
VITE_API_URL=https://YOUR_BACKEND_URL.onrender.com
```

Vite will automatically use this during production builds.

---

## Part 7: Final Steps

### Step 7.1: Test Your Deployment

1. Visit your frontend URL
2. Try to connect with Google OAuth
3. Test all major features
4. Check backend logs in Render dashboard for any errors

### Step 7.2: Enable Auto-Deploy (Optional)

By default, Render auto-deploys on every push to your main branch. You can configure this in:
- Service Settings > **Auto-Deploy**

### Step 7.3: Set Up Custom Domain (Optional)

1. In your service settings, go to **Custom Domains**
2. Add your domain
3. Follow Render's instructions to update DNS records

---

## Troubleshooting

### Backend Issues

**Problem**: Service fails to start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure `PORT` is used correctly in code

**Problem**: CORS errors
- Verify frontend URL is in `allowedOrigins`
- Check that `FRONTEND_URL` environment variable is set correctly

**Problem**: Google OAuth not working
- Verify redirect URI matches exactly in Google Console
- Check that `GOOGLE_REDIRECT_URI` environment variable is correct
- Ensure OAuth credentials are correct

### Frontend Issues

**Problem**: API calls failing
- Check browser console for errors
- Verify backend URL is correct in frontend code
- Check CORS settings on backend

**Problem**: Build fails
- Check build logs in Render
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Database Issues

**Problem**: Data disappears
- This is expected with SQLite on Render (ephemeral storage)
- Consider migrating to PostgreSQL or external database

---

## Quick Reference: Required Code Changes

### 1. ✅ Port Configuration (Already Done)

The backend code has already been updated to use `process.env.PORT`, so no changes needed here.

### 2. Update `index.js` - CORS Origins

```javascript
const allowedOrigins = [
  "https://YOUR_FRONTEND_URL.onrender.com", // Add your frontend URL
  "https://student-dashboard-1-6w26.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174"
];
```

### 3. Create `frontend/.env.production`

```
VITE_API_URL=https://YOUR_BACKEND_URL.onrender.com
```

### 4. Update Frontend API Calls

Ensure your frontend uses the environment variable for API URL instead of hardcoded localhost.

---

## Cost Estimate

- **Free Tier**: 
  - Backend: Free (spins down after 15 min inactivity)
  - Frontend: Free (static sites are always free)
  - Database: Free PostgreSQL available (limited)

- **Starter Tier** (Recommended for production):
  - Backend: $7/month (always on)
  - Frontend: Free
  - Database: $7/month for PostgreSQL

---

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Render Status: https://status.render.com

---

**Good luck with your deployment! 🚀**


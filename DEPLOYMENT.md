# Vercel Deployment Guide

This guide explains how to deploy your Express.js API server to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Code

✅ **Already Done:**
- Removed unused files (demo_data.sql, schema.sql, documentation files)
- Updated `index.js` to export the app for Vercel
- Created `vercel.json` configuration file
- Updated `package.json` with build script

## Step 2: Set Up Environment Variables

You need to add your Supabase credentials as environment variables in Vercel:

### Required Environment Variables:

```
SUPABASE_URL=https://drlkgrumakxitjprvqws.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybGtncnVtYWt4aXRqcHJ2cXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ0Mzc0OSwiZXhwIjoyMDgwMDE5NzQ5fQ.j8uSMtPNkG-i3-GbNKd1Z0TgysS6hjwPZ23-Fstxano
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybGtncnVtYWt4aXRqcHJ2cXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDM3NDksImV4cCI6MjA4MDAxOTc0OX0.PernE77_AAi_l6Wz41qosSY_gXvXZX2ptzToOlZb1Vk
NODE_ENV=production
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"

2. **Import Your Repository**
   - Connect your Git provider (GitHub, GitLab, or Bitbucket)
   - Select your repository
   - Choose the branch (usually `main` or `master`)

3. **Configure Project Settings**
   - **Root Directory**: Set to `server` (if your server code is in a subdirectory)
   - **Framework Preset**: Select "Other" or "Node.js"
   - **Build Command**: Leave empty (or use `npm run build`)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add each variable from Step 2:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_ANON_KEY`
     - `NODE_ENV` (set to `production`)

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to Server Directory**:
   ```bash
   cd server
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No** (for first deployment)
   - Project name? (Press Enter for default)
   - Directory? **./** (current directory)
   - Override settings? **No**

5. **Add Environment Variables**:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add SUPABASE_ANON_KEY
   vercel env add NODE_ENV
   ```

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 4: Verify Deployment

After deployment, Vercel will provide you with a URL like:
```
https://your-project-name.vercel.app
```

### Test Your API:

1. **Health Check** (if you add a health endpoint):
   ```
   GET https://your-project-name.vercel.app/api
   ```

2. **Test Login**:
   ```bash
   curl -X POST https://your-project-name.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"teacher","password":"teacher123"}'
   ```

3. **Test Courses**:
   ```bash
   curl https://your-project-name.vercel.app/api/courses
   ```

## Step 5: Update Frontend API URL

Update your frontend to use the Vercel API URL:

1. **Update `.env` or environment variables** in your frontend:
   ```env
   VITE_API_BASE=https://your-project-name.vercel.app/api
   ```

2. **Or update `client/src/api.js`**:
   ```javascript
   const API_BASE = import.meta.env.VITE_API_BASE || 'https://your-project-name.vercel.app/api';
   ```

## Step 6: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Important Notes

### CORS Configuration
Your `index.js` already has CORS enabled, which should work for most cases. If you need to restrict CORS to specific domains:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### Environment Variables
- **Never commit** `.env` files to Git
- Environment variables set in Vercel dashboard are automatically available at runtime
- Use Vercel's environment variable management for different environments (Production, Preview, Development)

### File Structure
Your server directory should contain:
```
server/
├── index.js          (main server file)
├── db.js            (Supabase connection)
├── package.json     (dependencies)
├── vercel.json      (Vercel configuration)
├── routes/          (API routes)
│   ├── auth.js
│   ├── courses.js
│   ├── assessments.js
│   ├── students.js
│   ├── outcomes.js
│   └── reports.js
└── .env.example     (reference only, not used in deployment)
```

### Troubleshooting

**Issue: "Module not found" errors**
- Ensure all dependencies are in `package.json`
- Check that `node_modules` is not committed to Git

**Issue: "Environment variable not found"**
- Verify environment variables are set in Vercel dashboard
- Redeploy after adding new environment variables

**Issue: "Function timeout"**
- Vercel has a 10-second timeout for Hobby plan
- Consider upgrading to Pro plan for longer timeouts
- Optimize slow database queries

**Issue: CORS errors**
- Check CORS configuration in `index.js`
- Verify frontend URL is allowed

## Continuous Deployment

Vercel automatically deploys when you push to your Git repository:
- **Production**: Deploys from `main`/`master` branch
- **Preview**: Creates preview deployments for pull requests

## Monitoring

- Check deployment logs in Vercel dashboard
- Monitor function execution time and errors
- Set up alerts for failed deployments

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

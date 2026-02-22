# 🚀 Deployment Guide

Follow these steps to deploy your Django + React app to production.

## 1. Prerequisites
- [GitHub](https://github.com/) account
- [Railway](https://railway.app/) account (Free tier available)
- [Neon](https://neon.tech/) account (for Postgres DB)
- [Judge0](https://judge0.com/) API Key (RapidAPI or self-hosted)

## 2. Prepare Codebase (Already Done ✅)
- `Procfile` created for Railway
- `runtime.txt` set to python-3.12.0
- `settings.py` configured for production (WhiteNoise, Postgres, Env Vars)
- Dependencies added: `gunicorn`, `uvicorn`, `whitenoise`, `psycopg2-binary`, `dj-database-url`

## 3. Database Setup (Neon)
1. Log in to [Neon Console](https://console.neon.tech/)
2. Create a new project.
3. Copy the **Connection String** (Postgres URL). It looks like:
   `postgres://user:password@ep-cool-frog-123456.us-east-1.aws.neon.tech/neondb?sslmode=require`

## 4. Deploy Backend (Railway)
1. Push your code to a GitHub repository.
2. In Railway, click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Go to **Settings** → **Variables** and add these:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | (Generate a random string) |
| `DEBUG` | `False` |
| `DATABASE_URL` | Paste your Neon connection string |
| `ALLOWED_HOSTS` | `*` (or your railway domain) |
| `JUDGE0_API_URL` | Your Judge0 API URL (or leave default for localhost if using Docker) |
| `GEMINI_API_KEY` | Your Gemini API Key |
| `REDIS_URL` | (Add a Redis service in Railway and link it) |

5. Railway will detect the `Procfile` and deploy automatically.

## 5. Deploy Frontend (Vercel or Netlify)
1. Since the frontend is a separate React app, it's best hosted on Vercel.
2. Connect your GitHub repo to Vercel.
3. Set **Root Directory** to `frontend`.
4. Run Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_API_URL`: The URL of your Railway backend (e.g., `https://django-project-production.up.railway.app`)

## 6. Final Steps
1. Run migrations in Railway console:
   - Go to your Railway project → Backend Service → Settings → Deploy → **Grid Menu** (Command Palette) → Shell
   - Run: `python manage.py migrate`
   - Run: `python manage.py collectstatic --noinput`
2. Create a superuser:
   - Run: `python manage.py createsuperuser`

🚀 **Your app is now live!**

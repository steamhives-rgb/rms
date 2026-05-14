# STEAMhives RMS — README

> **School Result Management System** built with Next.js 14 (App Router), PostgreSQL, and Tailwind CSS.  
> Multi-tenant · Mobile-first · Dark mode · Teacher permissions · Result PINs

---

## Table of Contents

1. [Stack](#stack)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Running the App](#running-the-app)
6. [Testing the App Locally](#testing-the-app-locally)
7. [Deploying to Vercel (Production)](#deploying-to-vercel-production)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Feature Overview](#feature-overview)
10. [Troubleshooting](#troubleshooting)

---

## Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Framework  | Next.js 14 (App Router, TypeScript)    |
| Styling    | Tailwind CSS, dark mode via class       |
| Database   | PostgreSQL 14+ (Neon / Supabase / local)|
| Auth       | Cookie-based sessions (HttpOnly JWT)   |
| Deployment | Vercel (recommended)                   |

---

## Local Development Setup

### Prerequisites

- **Node.js** 18.17+ (`node -v` to check)
- **npm** 9+ or **pnpm** (npm included with Node)
- **PostgreSQL** 14+ running locally **OR** a free hosted DB (see [Database Setup](#database-setup))
- **Git**

### 1. Clone / Extract the project

```bash
# If from ZIP:
unzip upload.zip -d steamhives-rms
cd steamhives-rms

# If from git:
git clone <repo-url> steamhives-rms
cd steamhives-rms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in your values (see [Environment Variables](#environment-variables)).

---

## Database Setup

### Option A — Local PostgreSQL (recommended for development)

1. Make sure PostgreSQL is running:
   ```bash
   # macOS (Homebrew)
   brew services start postgresql@14

   # Ubuntu/Debian
   sudo systemctl start postgresql
   ```

2. Create a database:
   ```bash
   psql -U postgres
   CREATE DATABASE steamhives_rms;
   \qpost 
   ```

3. Run the complete schema:
   ```bash
   psql -U postgres -d steamhives_rms -f database.sql
   ```

4. Set your `.env.local`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=steamhives_rms
   DB_USER=postgres
   DB_PASS=yourpassword
   DB_SSL=false
   ```

### Option B — Neon (free hosted PostgreSQL, recommended for production)

1. Go to [neon.tech](https://neon.tech) → Create a free project
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. In the Neon dashboard → **SQL Editor**, paste and run the contents of `database_complete.sql`
4. Set in `.env.local`:
   ```env
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   ```

### Option C — Supabase (free hosted PostgreSQL)

1. Go to [supabase.com](https://supabase.com) → New project
2. In **SQL Editor**, run `database_complete.sql`
3. Copy the connection string from **Settings → Database → Connection string (URI)**
4. Set `DATABASE_URL` in `.env.local`

> ⚠️ **Note for existing installs (upgrading):**  
> If you have an existing database, run only the `INCREMENTAL MIGRATIONS` section at the bottom of `database_complete.sql`. It uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so it is safe to re-run.

---

## Environment Variables

Create `.env.local` from `.env.example` and set:

```env
# ── Database ──────────────────────────────────────────────────────
# Use ONE of: DATABASE_URL (hosted) OR DB_HOST/DB_PORT/... (local)
DATABASE_URL=postgresql://user:password@host:5432/steamhives_rms

# OR for local postgres:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=steamhives_rms
# DB_USER=postgres
# DB_PASS=yourpassword
# DB_SSL=false

# ── App secrets ───────────────────────────────────────────────────
SESSION_TTL=28800     # session length in seconds (8 hours)

# Dev admin key (bcrypt hash). Generate with:
# node -e "require('bcryptjs').hash('23OLUbunmi$98',12).then(console.log)"
DEV_KEY_HASH=

# ── Public URL ────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Optional: Email (password reset) ─────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="STEAMhives RMS <noreply@yourschool.com>"
```

---

## Running the App

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

App runs at **http://localhost:3000**


# 1. Create the database
psql -U postgres
CREATE DATABASE steamdev;
\q

# 2. Run the SQL schema
psql -U postgres -d steamdev -f database.sql

# 3. Install dependencies
npm install

# 4. Run the app
npm run dev

---

## Testing the App Locally

### Step 1 — Create a test school coupon

The app requires a coupon code to register a school. In development you can create one via the dev panel:

1. Open http://localhost:3000/dev
2. Enter your `DEV_KEY_HASH` secret
3. Click **Generate Coupon** and copy the code

> If you haven't set `DEV_KEY_HASH`, open `.env.local` and generate it:
> ```bash
> node -e "require('bcryptjs').hash('devkey123',12).then(console.log)"
> ```
> Paste the output as `DEV_KEY_HASH=`.

### Step 2 — Register your first school

1. Go to http://localhost:3000/login → **Register a new school**
2. Enter the coupon code from Step 1
3. Choose school type (Primary / Secondary / Both)
4. Fill in school name, abbreviation, and head/principal name
5. Set admin password
6. You'll land on the **Setup Wizard** (/setup)

### Step 3 — Complete Setup Wizard

The wizard walks you through:
- School contact info
- Logo and signatures (optional — can skip)
- Classes selection
- Academic session + current term

Completing all steps → redirected to **/dashboard**

### Step 4 — Core workflow to test

| Action | Where |
|--------|-------|
| Add classes | Dashboard → Classes |
| Assign subjects to classes | Dashboard → Classes → click a class |
| Add teachers | Dashboard → Teachers → Add Teacher |
| Test teacher login | http://localhost:3000/teacher-login |
| Add students | Dashboard → Students → Add Student |
| Enter results | Dashboard → Results |
| View report card | Dashboard → Results → Print |
| Generate teacher coupons | Dashboard → Teacher Coupons |
| Take attendance | Dashboard → Attendance |

### Step 5 — Teacher login

1. After adding a teacher, note their **Employee ID** (shown in toast after creation)
2. Go to http://localhost:3000/teacher-login
3. Enter: School ID (from your registration, visible in dashboard URL), Employee ID or Email, and the auto-generated password (shown in the toast)

### Useful dev URLs

| URL | Description |
|-----|-------------|
| `/dev` | Dev admin panel (create coupons, impersonate schools) |
| `/login` | School admin login |
| `/teacher-login` | Teacher login |
| `/onboarding` | School registration |
| `/setup` | Post-registration setup wizard |
| `/dashboard` | Admin dashboard |
| `/teacher` | Teacher dashboard |
| `/results` | Public result checker (with PIN) |

---

## Deploying to Vercel (Production)

### Prerequisites

- A **Vercel** account (free tier works)
- A hosted **PostgreSQL** database — [Neon](https://neon.tech) recommended (free tier)
- Your project pushed to **GitHub**, **GitLab**, or **Bitbucket** (or deploy via Vercel CLI)

---

### Method A — Deploy via Vercel Dashboard (easiest)

#### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourname/steamhives-rms.git
git push -u origin main
```

#### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as-is (or set to subfolder if needed)

#### 3. Set environment variables in Vercel

In Vercel → **Settings → Environment Variables**, add:

```
DATABASE_URL          = postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
SESSION_TTL           = 28800
DEV_KEY_HASH          = <bcrypt hash of your dev key>
NEXT_PUBLIC_APP_URL   = https://your-app.vercel.app
```

> Optional (for password reset emails):
> ```
> SMTP_HOST   = smtp.gmail.com
> SMTP_PORT   = 587
> SMTP_USER   = your@gmail.com
> SMTP_PASS   = app-specific-password
> SMTP_FROM   = "STEAMhives <your@gmail.com>"
> ```

#### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically.

After deployment, update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL.

---

### Method B — Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# For production
vercel --prod
```

During CLI setup, paste your environment variables when prompted or configure them in the dashboard afterwards.

---

### Method C — Self-hosted (VPS / Ubuntu)

If you prefer a VPS (DigitalOcean, AWS EC2, etc.):

```bash
# Install Node 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone <repo> /var/www/steamhives
cd /var/www/steamhives
npm install

# Create production env
cp .env.example .env.local
nano .env.local  # fill in values

# Build
npm run build

# Run with PM2
npm install -g pm2
pm2 start npm --name "steamhives" -- start
pm2 startup && pm2 save

# Nginx reverse proxy (example)
# Proxy port 3000 to your domain
```

---

## Post-Deployment Checklist

After your first deployment, complete these steps:

- [ ] **Run database schema**: paste `database_complete.sql` into your hosted DB's SQL editor
- [ ] **Generate a coupon**: visit `<your-url>/dev`, enter your dev key, create coupon
- [ ] **Register your school**: go to `<your-url>/onboarding`, use the coupon
- [ ] **Complete Setup Wizard**: add logo, classes, session
- [ ] **Test teacher creation and login**
- [ ] **Update `NEXT_PUBLIC_APP_URL`** to your actual domain in Vercel env vars
- [ ] **Redeploy** after updating env vars (Vercel → Deployments → Redeploy)

---

## Feature Overview

| Module | Status | Notes |
|--------|--------|-------|
| School onboarding + coupon | ✅ | Multi-step with school-type selection |
| Post-registration setup wizard | ✅ | `/setup` — school info, branding, classes, session |
| School settings | ✅ | Logo, signatures, branding, school info |
| Student management | ✅ | Passport required, clubs, dynamic dept, no session/term at registration |
| Teacher management | ✅ | Employee ID auto-gen, passport, signature, permissions, class-subject assignments |
| Teacher login | ✅ | Employee ID **or** Email + password |
| Teacher coupon system | ✅ | School admin generates single-use codes for teacher self-registration |
| Class management | ✅ | Pre-built groups + custom, subject presets per class |
| Academic sessions | ✅ | Pre-generated options, term management |
| Result entry | ✅ | CA + Exam, grade scale, positions |
| Report cards | ✅ | Signature/name auto-display, print layout |
| Broadsheet | ✅ | Class-level result overview |
| Attendance | ✅ | Weekly, am/pm tracking |
| Result PINs | ✅ | Student result access |
| Teacher permissions | ✅ | 8 granular permission toggles per teacher |
| Mobile navigation | ✅ | Floating glassmorphism dock |
| Dark mode | ✅ | System preference + manual toggle |
| Audit log | ✅ | DB table populated; admin viewer pending |

---

## Troubleshooting

### `DATABASE_URL` not connecting

- For Neon: make sure `?sslmode=require` is at the end of the URL
- For local: set `DB_SSL=false`
- Test connection: `psql "<your DATABASE_URL>"`

### `Cannot find module` errors after deployment

- Delete `.next` folder locally: `rm -rf .next`
- Run `npm run build` again
- In Vercel: Deployments → click **Redeploy with cleared cache**

### Teacher can't log in

- Check `approval_status` in `sh_teachers` — must be `approved`
- The auto-generated password is shown **once** in the toast when adding a teacher — reset it from Teachers module if lost
- Confirm the school ID matches (visible in the URL bar when on dashboard, or in dev panel)

### Session expired / kicked out

- Default session TTL is 8 hours (`SESSION_TTL=28800`). Increase in env vars if needed.
- Expired sessions are cleaned up automatically.

### Images not persisting after redeploy

- All images (passport, logo, signatures) are stored as **base64 data-URLs directly in the database**. They are not uploaded to a file server and will persist as long as your database does.

---

## License

Proprietary — STEAMhives © 2025. All rights reserved.

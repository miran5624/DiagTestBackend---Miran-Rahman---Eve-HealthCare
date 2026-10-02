# EVE Healthcare - Diagnostic Booking Platform

A full-stack web application designed for booking diagnostic tests, built with a modern, glassmorphic React frontend and a highly robust Express/Prisma/PostgreSQL backend.

## Tech Stack
*   **Database**: PostgreSQL (Hosted on [Supabase](https://supabase.com))
*   **Backend**: Node.js, Express, Prisma ORM, Zod, Vitest (Hosted on [Render](https://render.com))
*   **Frontend**: React, TypeScript, Vite, Vanilla CSS (Hosted on [Vercel](https://vercel.com))

---

## 🚀 Deployment Guide (Monorepo)

You can host this entire project from a single GitHub repository. Follow these steps to deploy the application to production:

### 1. Database (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **Project Settings > Database** and copy the **Connection string (URI)**.
3. Make sure to append `?pgbouncer=true&connection_limit=1` if using Prisma, or use the Transaction pooler URL.

### 2. Backend (Render)
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect this GitHub repository.
3. Set the **Root Directory** to empty (or leave it as default, which is the root of the repo).
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. Add the following **Environment Variables** in Render:
   *   `DATABASE_URL` = *(Your Supabase Connection String)*
   *   `JWT_SECRET` = *(Generate a random strong string)*
   *   `JWT_EXPIRES_IN` = `1d`
   *   `WEBHOOK_SECRET` = *(Generate a random strong string)*
   *   `NODE_ENV` = `production`
7. Deploy the backend and copy the resulting `https://your-backend-app-name.onrender.com` URL.

### 3. Frontend (Vercel)
1. Create a new Project on [Vercel](https://vercel.com).
2. Connect this exact same GitHub repository.
3. Under **Build and Output Settings**, set the **Root Directory** to `frontend`.
4. Vercel will automatically detect Vite and configure the build commands.
5. **Important**: Before you deploy, open `frontend/vercel.json` in this repository and replace `https://your-backend-app-name.onrender.com` with your actual Render URL. This allows Vercel to seamlessly proxy frontend API requests to your backend without dealing with CORS issues!
6. Deploy!

---

## 💻 Local Development

### Prerequisites
*   Node.js v20+
*   PostgreSQL running locally (or a development Supabase database)

### Backend Setup
1. Clone the repository and install dependencies at the root:
   ```bash
   npm install
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Run Prisma migrations and seed the database with mock diagnostic centers and tests:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Visit `http://localhost:5173` to view the application!

---

## 🛠 Features & Architecture

*   **Idempotent Webhooks**: Payment webhook endpoints are strictly idempotent and protected via HMAC SHA-256 signatures.
*   **State Machine**: Booking transitions strictly follow a state machine pattern (`PENDING` -> `CONFIRMED` / `FAILED` / `CANCELLED`).
*   **Centralized Error Handling**: All errors are uniformly caught and formatted before being sent to the client.
*   **Glassmorphism UI**: The frontend uses modern aesthetic principles (translucent blurred panels, dynamic hovering) without heavy component libraries.

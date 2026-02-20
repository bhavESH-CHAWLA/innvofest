# InnoFest 2026 - AI Risk Intelligence Platform

InnoFest is a full-stack web app that helps teams assess financial and operational risk using AI.
It provides risk prediction, AI chat for decision support, and optional email alerts when risk crosses a threshold.

## What This Project Does

- User authentication (signup/login) with JWT.
- AI risk prediction from user prompts.
- AI chat copilot for follow-up analysis.
- Risk score + risk level dashboard with trend tracking.
- History export to JSON.
- Optional email alerts when risk is high.
- Demo fallback mode when backend or AI provider is unavailable.

## Tech Stack

- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Nodemailer.
- AI Providers: OpenAI, Groq, Hugging Face (fallback order configurable).
- Frontend (main app): React + Vite + Tailwind CSS.

## Repository Structure

```text
.
|- README.md
|- backend/                     # API server
|  |- server.js
|  |- routes.js
|  |- aiService.js
|  |- emailService.js
|  |- authMiddleware.js
|  |- models.js
|  |- .env.example
|  |- package.json
|  \- frontend/                # Main UI app (use this frontend)
|     |- src/
|     |- package.json
|     \- .env.example
\- frontend/                    # Older scaffold (not the main app)
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local or cloud)
- At least one AI API key:
  - OpenAI (`OPENAI_API_KEY`) or
  - Groq (`GROQ_API_KEY`) or
  - Hugging Face (`HUGGINGFACE_API_KEY`)

## Local Installation and Run

### 1) Clone repository

```bash
git clone https://github.com/bhavESH-CHAWLA/innvofest.git
cd innvofest
```

### 2) Setup backend (`backend/`)

Install dependencies:

```bash
cd backend
npm install
```

Create env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update `backend/.env` with your values:

- `MONGO_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY` (or `GROQ_API_KEY` / `HUGGINGFACE_API_KEY`)
- Optional SMTP values for alerts

Run backend:

```bash
npm run dev
```

Backend URL: `http://localhost:5000`

### 3) Setup frontend (`backend/frontend/`)

Open a new terminal:

```bash
cd backend/frontend
npm install
```

Create frontend env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Default frontend env:

- `VITE_API_BASE_URL=http://localhost:5000/api`

Run frontend:

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

## API Routes (Backend)

Base: `/api`

- `GET /health`
- `POST /signup`
- `POST /login`
- `GET /me` (auth)
- `GET /dashboard` (auth)
- `POST /chat` (auth)
- `POST /predict` (auth)
- `POST /alerts/evaluate-email` (auth)

## Notes

- Do not commit real `.env` files.
- Use `.env.example` files as templates.
- Main product UI is in `backend/frontend/`.

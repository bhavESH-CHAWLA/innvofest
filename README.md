# InnoFest 2026 - AI Risk Intelligence Platform

Full-stack hackathon project for AI-assisted risk prediction, scenario analysis, and alerting.

## Repository Structure

```text
.
|- README.md
|- backend/                  # Express + MongoDB API
|  |- server.js
|  |- routes.js
|  |- aiService.js
|  |- emailService.js
|  |- authMiddleware.js
|  |- models.js
|  |- .env.example
|  |- package.json
|  \- frontend/             # Main React dashboard app (Vite + Tailwind)
|     |- src/
|     |- package.json
|     \- .env.example
\- frontend/                 # Initial Vite React scaffold (legacy)
```

## Core Features

- JWT auth: signup, login, protected profile/dashboard routes.
- AI risk prediction endpoint with multi-provider fallback:
  - OpenAI -> Groq -> Hugging Face (configurable order).
- AI chat copilot endpoint for decision-support responses.
- Email alert evaluation and send flow based on configurable risk threshold.
- Frontend risk dashboard with:
  - risk score + level visualization,
  - trend tracking,
  - AI chat,
  - prediction history export,
  - mitigation suggestion generation,
  - offline/demo fallback mode.

## Tech Stack

- Backend: Node.js, Express 5, MongoDB + Mongoose, JWT, bcryptjs, Nodemailer.
- AI: OpenAI SDK + HTTP integrations for Groq and Hugging Face.
- Frontend (main): React, Vite, React Router, Axios, Tailwind CSS.

## Backend Setup (`backend/`)

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Configure required values in `.env`:

- `MONGO_URI`
- `JWT_SECRET`
- At least one AI key: `OPENAI_API_KEY` or `GROQ_API_KEY` or `HUGGINGFACE_API_KEY`
- Optional SMTP block for email alerts

4. Run backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## Frontend Setup (Main App: `backend/frontend/`)

1. Install dependencies:

```bash
cd backend/frontend
npm install
```

2. Configure API base URL:

```bash
cp .env.example .env
```

Default:

- `VITE_API_BASE_URL=http://localhost:5000/api`

3. Start app:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

Base URL: `/api`

- `GET /health` - service health, AI provider config, SMTP status.
- `POST /signup` - create account.
- `POST /login` - authenticate and return JWT.
- `GET /me` - authenticated current user profile.
- `GET /dashboard` - authenticated test route.
- `POST /chat` - authenticated AI chat response.
- `POST /predict` - authenticated AI risk prediction.
- `POST /alerts/evaluate-email` - authenticated risk threshold check + optional email.

## Environment Variables

### Backend (`backend/.env`)

- `MONGO_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `AI_MODEL`
- `AI_PROVIDER_ORDER`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `HUGGINGFACE_API_KEY`, `HF_MODEL`
- `FRONTEND_URL`
- `ALERT_THRESHOLD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `ALERT_FROM_EMAIL`, optional `ALERT_TO_EMAIL`

### Frontend (`backend/frontend/.env`)

- `VITE_API_BASE_URL`

## Notes

- Demo fallback mode is available when backend/AI service is unreachable.
- Commit real `.env` files never. Use `.env.example` as template.
- `frontend/` at repo root is a basic scaffold; the implemented product UI is in `backend/frontend/`.

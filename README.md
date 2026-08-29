# DevKnow

DevKnow is an internal knowledge-sharing platform for technical questions. It lets authenticated users submit and search questions, generates an AI-assisted draft response, and requires senior developer or administrator review before an answer is published.

The repository contains a Django REST API and a React single-page application.

## Architecture

```text
DevKnow-frontend (React + Vite)
        |
        | JWT-authenticated HTTP requests
        v
DevKnow-backend (Django + Django REST Framework)
        |
        +-- PostgreSQL: users, questions, tags, AI drafts, reviews, votes
        |
        +-- Deloitte AI gateway: draft-answer generation
```

## Repository Layout

```text
.
├── DevKnow-backend/    Django REST API, PostgreSQL models, AI integration
├── DevKnow-frontend/   React/Vite user interface and browser tests
├── .github/            Repository automation and workflow configuration
└── .githooks/          Local Git hooks
```

## Where Logic Lives

| Area | Primary location | Responsibility |
|---|---|---|
| API composition | `DevKnow-backend/config/urls.py` | Registers authentication, question, review, and admin routes. |
| Application configuration | `DevKnow-backend/config/settings.py` | Django, database, REST, CORS, security, and environment configuration. |
| User access | `DevKnow-backend/users/` | Custom user model, registration, login, JWT-backed identity, role handling, and request throttling. |
| Question workflow | `DevKnow-backend/questions/models.py` and `views.py` | Questions, tags, AI drafts, approved answers, review audit history, votes, pagination, and search. |
| Input/output validation | `DevKnow-backend/questions/serializers.py` | API payload validation and response representations. |
| Authorisation | `DevKnow-backend/questions/permissions.py` | Senior and administrator access controls for review actions. |
| AI integration | `DevKnow-backend/questions/ai_service.py` | Calls the Deloitte AI gateway and validates generated responses. |
| Client routing | `DevKnow-frontend/src/App.jsx` | Page routes, protected access, review-role gates, and first-login terms acceptance. |
| Client session state | `DevKnow-frontend/src/context/AuthContext.jsx` | Login, logout, current user state, and authentication lifecycle. |
| API client | `DevKnow-frontend/src/api/client.js` | Axios configuration, JWT attachment, and unauthorised-session handling. |
| User-facing pages | `DevKnow-frontend/src/pages/` | Authentication, feed, question submission/detail, search, and review experiences. |

## Core Workflow

1. A user registers or logs in and receives JWT credentials.
2. An authenticated user submits a question with optional tags.
3. The backend saves the question and requests an AI draft from the configured gateway.
4. The question enters the senior review queue when a draft is available.
5. A senior user or administrator approves, edits and approves, or rejects the draft.
6. Approved content becomes the published answer; review actions remain auditable.

## Local Development

Start the backend first, then the frontend in a separate terminal:

```bash
cd DevKnow-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

```bash
cd DevKnow-frontend
npm install
npm run dev
```

The API runs at `http://localhost:8000/api/` and the web application at `http://localhost:5173`.

Backend configuration requires a local `.env` file containing Django, PostgreSQL, and Deloitte AI gateway settings. See [DevKnow-backend/README.md](DevKnow-backend/README.md) for the expected variable names and complete backend setup. Frontend configuration and scripts are documented in [DevKnow-frontend/README.md](DevKnow-frontend/README.md).

## Validation

```bash
# Backend
cd DevKnow-backend
python manage.py test --verbosity=1 --parallel auto --noinput
ruff check .

# Frontend
cd ../DevKnow-frontend
npm run lint
npm run test
npm run build
```

For browser-level coverage, start both development servers and run `npm run e2e:run` from `DevKnow-frontend`.

## Security Notes

- User roles are assigned by the server; public registration cannot self-assign privileged roles.
- Authentication is JWT-based, with throttling on registration and login endpoints.
- Secrets and database credentials are supplied through environment variables and must not be committed.
- Senior review routes are protected server-side; frontend route guards are an additional usability layer.

## Detailed Documentation

- [Backend README](DevKnow-backend/README.md)
- [Frontend README](DevKnow-frontend/README.md)
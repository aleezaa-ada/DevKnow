# DevKnow — Backend

Django REST Framework API for the DevKnow platform. Handles authentication, role-based access control, question lifecycle management, AI-assisted answer generation, and senior developer moderation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.13 |
| Framework | Django 6 + Django REST Framework 3.17 |
| Database | PostgreSQL |
| Authentication | JWT via `djangorestframework-simplejwt` |
| AI Integration | Anthropic Claude API (via `openai` SDK) |
| Linting | Ruff |

---

## Project Structure

```
DevKnow-backend/
├── config/             # Project settings, URL routing, WSGI/ASGI
│   ├── settings.py
│   └── urls.py
├── users/              # Custom user model, auth endpoints, role management
│   ├── models.py       # User + ApprovedSeniorEmail
│   ├── serializers.py  # Registration with server-side role assignment
│   ├── views.py
│   └── urls.py
├── questions/          # Question lifecycle, AI integration, review workflow
│   ├── models.py
│   ├── views.py
│   ├── ai_service.py   # Anthropic API wrapper
│   ├── permissions.py
│   └── urls.py
├── manage.py
└── requirements.txt
```

---

## Setup

### Prerequisites

- Python 3.13
- PostgreSQL running locally

### Installation

```bash
cd DevKnow-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in `DevKnow-backend/`:

```env
SECRET_KEY=your-django-secret-key

DB_NAME=devknow
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

ANTHROPIC_API_KEY=your-anthropic-api-key

ALLOWED_HOSTS=localhost,127.0.0.1
```

### Database Setup

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Run Development Server

```bash
python manage.py runserver 0.0.0.0:8000
```

API is available at `http://localhost:8000/api/`.

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register a new user |
| POST | `/api/auth/login/` | Login, returns JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Get current user profile |

### Questions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/questions/` | Paginated question feed |
| POST | `/api/questions/` | Submit a new question (triggers AI generation) |
| GET | `/api/questions/:id/` | Get question detail |
| DELETE | `/api/questions/:id/` | Delete own question (owner only) |
| POST | `/api/questions/:id/retry/` | Retry AI generation |

### Review (Senior/Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/questions/review/` | Get pending review queue |
| POST | `/api/questions/:ai_id/review/` | Approve, edit-and-approve, or reject AI draft |

---

## Authentication and Roles

- JWT tokens are issued on login. Access tokens expire after 24 hours, refresh tokens after 7 days.
- Three roles: `standard`, `senior`, `admin`.
- Role assignment is computed server-side at registration using the `ApprovedSeniorEmail` allowlist.
- Users cannot self-promote via client input.
- Auth endpoints (`/login/`, `/register/`) are throttled: 30/min and 20/min respectively.

To promote a user to senior role, add their email to the `ApprovedSeniorEmail` model via Django admin at `/admin/`.

---

## Running Tests

```bash
source venv/bin/activate
python manage.py test --verbosity=1 --parallel auto --noinput
```

93 tests covering models, serializers, views, permissions, and AI service handling.

---

## Linting

```bash
ruff check .
```

---

## Security Notes

- API keys stored in environment variables, never in version control.
- Passwords hashed using Django's PBKDF2 algorithm with salt.
- Input validated server-side in DRF serializers at the API boundary.
- CORS restricted to `http://localhost:5173` in development.
- Security headers applied via custom middleware.

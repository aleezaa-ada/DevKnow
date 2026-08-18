# DevKnow — Frontend

React single-page application for the DevKnow platform. Provides the UI for question submission, AI-assisted answer viewing, senior developer review and moderation, and role-based navigation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | JavaScript (ES Modules) |
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| HTTP Client | Axios |
| Styling | CSS Modules |
| Unit Testing | Vitest + React Testing Library |
| E2E Testing | Cypress |
| Linting | ESLint |

---

## Project Structure

```
DevKnow-frontend/
├── src/
│   ├── api/
│   │   └── client.js           # Axios instance with JWT interceptor
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx  # Role-gated route wrapper
│   │   ├── TermsModal.jsx      # First-login T&C acceptance modal
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.jsx     # JWT auth state and login/logout logic
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── FeedPage.jsx
│   │   ├── AskQuestionPage.jsx
│   │   ├── QuestionDetailPage.jsx
│   │   ├── ReviewQueuePage.jsx
│   │   └── ReviewDetailPage.jsx
│   ├── test/                   # Vitest unit tests
│   └── App.jsx                 # Root component with routing
├── cypress/
│   ├── e2e/                    # End-to-end test specs (00–09)
│   └── support/
│       └── e2e.js              # Shared Cypress helpers
├── package.json
└── vite.config.js
```

---

## Setup

### Prerequisites

- Node.js 18+
- DevKnow backend running on `http://localhost:8000`

### Installation

```bash
cd DevKnow-frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

App is available at `http://localhost:5173`.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests (single run) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run e2e:open` | Open Cypress interactive test runner |
| `npm run e2e:run` | Run full Cypress E2E suite headlessly |

---

## Authentication

- JWT tokens are stored in `localStorage` after login.
- The Axios client automatically attaches the access token to protected requests via an interceptor.
- Auth context (`useAuth`) provides `user`, `login()`, and `logout()` throughout the app.
- On first login per user, a Terms and Conditions modal is displayed before platform access is granted. Acceptance is stored per user ID in `localStorage`.

---

## Routing and Role-Based Access

| Route | Access |
|---|---|
| `/login`, `/register` | Public |
| `/` | Authenticated users |
| `/ask` | Authenticated users |
| `/questions/:id` | Authenticated users |
| `/search` | Authenticated users |
| `/review` | Senior and admin only |
| `/review/:id` | Senior and admin only |

`ProtectedRoute` enforces role checks. Standard users visiting a restricted route are redirected to the feed.

---

## Testing

### Unit Tests (Vitest + React Testing Library)

```bash
npm run test
```

Covers: auth context, protected routing, page components, Ask flow session safety, and the first-login terms modal.

### E2E Tests (Cypress)

Requires both the backend and frontend dev servers to be running.

```bash
npm run e2e:run
```

10 specs covering:
- Registration and login flows
- Question submission (happy and failure paths)
- Senior review and approval
- Feed pagination
- Retry AI generation
- Owner delete flow
- Negative scenarios (network errors, permission failures)

---

## Key Design Decisions

- **Session-safe submission handling:** The Ask Question page captures the active user ID at submit start and validates it before navigating on response, preventing cross-user redirect bugs during long-running question submission requests.
- **Server-side role enforcement:** Role control is handled by the backend only. The frontend renders based on the role returned from `/api/auth/me/` after login.
- **First-login T&C modal:** Displayed once per user (keyed by user ID in `localStorage`) to ensure explicit agreement to confidentiality and acceptable-use terms before platform access.

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

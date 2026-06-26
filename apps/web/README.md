# FieldOps Web

React, TypeScript, and Vite frontend skeleton for the FieldOps Workflow Tracker.

## Install Dependencies

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

The frontend sends login requests to the backend API configured by:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Run Tests

```bash
npm test
```

## Build

```bash
npm run build
```

For a production Vite bundle, run:

```bash
npm run build:vite
```

## Placeholder Routes

- `/login`
- `/dashboard`
- `/projects`
- `/timesheets`
- `/field-reports`
- `/assets`

## Authentication

The login page posts credentials to `POST /auth/login` through the configured backend API base URL. A successful response stores the JWT and user profile in browser session storage for the current demo session.

Demo accounts seeded by the API:

- `admin@example.com`
- `manager@example.com`
- `field@example.com`

Default local password:

```text
Password123!
```

Protected pages show a login-required state when no user is authenticated. After login, the app header shows the current user and a logout button that clears the stored session.

Role-aware navigation:

- `admin`: Dashboard, Projects, Timesheets, Field Reports, Assets.
- `project_manager`: Dashboard, Projects, Timesheets, Field Reports, Assets.
- `field_user`: Dashboard, Timesheets, Field Reports.

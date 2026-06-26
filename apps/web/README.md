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

## Current Routes

- `/login`
- `/dashboard`
- `/projects`
- `/projects/new`
- `/projects/:id`
- `/projects/:id/edit`
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
- `field_user`: Dashboard, Projects, Timesheets, Field Reports.

## Projects UI

The Projects screens require an authenticated session and use the stored JWT in the `Authorization: Bearer <token>` header when calling the backend Projects API.

Implemented project screens:

- `/projects`: list projects with loading, empty, and API error states.
- `/projects/:id`: view project details.
- `/projects/new`: create a project.
- `/projects/:id/edit`: edit a project.

Role behavior:

- Admin and Project Manager users can view, create, and edit projects.
- Field User accounts can view the projects list and project details only.

Create and edit forms validate required `projectCode`, `name`, and `projectManagerId` fields before submitting to the API. Run `npm test` from `apps/web` to verify the Projects UI rendering, role behavior, and form validation checks.

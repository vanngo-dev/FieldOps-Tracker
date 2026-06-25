# FieldOps API

Minimal Express and TypeScript API for the FieldOps Workflow Tracker.

## Install Dependencies

```bash
npm install
```

## Run Tests

```bash
npm test
```

Tests verify the health endpoint and database configuration without requiring a live SQL Server connection.

## Build

```bash
npm run build
```

## Start The API

Build first, then start the compiled API:

```bash
npm run build
npm start
```

## Health Endpoint

```text
GET /health
```

Expected response:

```json
{ "status": "ok" }
```

## Authentication

Set a JWT secret before using login or protected routes:

```bash
JWT_SECRET=replace-with-a-long-random-local-secret
JWT_EXPIRES_IN=1h
```

Login endpoint:

```text
POST /auth/login
```

Request body:

```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

Successful login returns a JWT and the authenticated user profile. Use the token on protected requests:

```text
Authorization: Bearer <token>
```

Demo accounts seeded for local development:

- `admin@example.com`
- `manager@example.com`
- `field@example.com`

The default local seed password is `Password123!`. Override it with `SEED_USER_PASSWORD` before running the seed command.

Roles:

- `admin`: administrative access.
- `project_manager`: manager-level access for project oversight workflows.
- `field_user`: field-level access for assigned operational work.

Routes protected by role middleware allow only the configured role list and return `403` when an authenticated user has the wrong role.

## SQL Server Configuration

The API uses Prisma with Microsoft SQL Server. Configure `DATABASE_URL` before running Prisma commands that connect to the database.

Required environment variable:

```bash
DATABASE_URL="sqlserver://localhost:1433;database=FieldOpsWorkflowTracker;user=sa;password=YourStrong!Passw0rd;encrypt=true;trustServerCertificate=true"
```

Local assumptions:

- SQL Server is listening on `localhost:1433`.
- The target database is named `FieldOpsWorkflowTracker`.
- The SQL login has permission to create and update schema objects.
- `trustServerCertificate=true` is acceptable for local development only.

## Prisma Commands

Generate the Prisma client:

```bash
npm run db:generate
```

Run local migrations:

```bash
npm run db:migrate
```

Seed sample users and a sample project:

```bash
npm run db:seed
```

The seed script expects the database schema to exist and the Prisma client to be generated.

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

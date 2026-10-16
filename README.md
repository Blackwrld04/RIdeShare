# RideShare Backend

Backend services for RideShare Nigeria.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer
- PostgreSQL with PostGIS
- Redis 7 or newer

## Local setup

Create a local environment file from `.env.example`, start PostgreSQL and Redis from `compose.yaml`, then run:

```sh
npm install
npm run db:deploy
npm run dev:api
```

The API exposes liveness at `GET /api/v1/health` and dependency readiness at `GET /api/v1/ready`.

Run the background process separately:

```sh
npm run dev:worker
```

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

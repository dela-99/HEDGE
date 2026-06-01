# Payment Service

Payment processing service for fintech-secure-app.

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env .env
```

### Database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### Development

```bash
npm run start:dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

## Architecture

### Raw Events Storage

The `raw-events` module provides a storage layer for raw financial events before processing. This allows:

- Storing webhooks before processing
- Preserving original payloads and headers
- Maintaining immutable audit trail
- Efficient lookups by provider reference

## API Routes

- `POST /api/health` - Health check

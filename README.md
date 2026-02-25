# Digiweb Agents - Retell AI Call Logs Sync

A TypeScript/Node.js application that fetches call logs from Retell AI's API and stores them in PostgreSQL using Prisma ORM. Built as the foundation for a future Next.js web application to display and analyze call data.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Bulk Import**: Fetch all historical call logs from Retell AI
- **Incremental Sync**: Fetch only new calls since last sync
- **Multi-Agent Support**: Track calls across multiple Retell AI agents
- **Comprehensive Data**: Store transcripts, analysis, costs, latency metrics, and recordings
- **Type Safety**: Full TypeScript support with Prisma-generated types
- **Idempotent Operations**: Safe to run multiple times without duplicates
- **Error Handling**: Robust retry logic and error logging
- **Cost Tracking**: Segregate usage by agent_id for cost analysis

## 🛠 Tech Stack

- **Runtime**: Node.js (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **HTTP Client**: Axios
- **Validation**: Zod
- **Logging**: Winston
- **Execution**: tsx (TypeScript execution)

## 📦 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (configured via Docker)
- Retell AI API key
- Retell AI agent IDs

## 🚀 Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd digiweb-agents
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual credentials:
   ```env
   # Retell AI API
   RETELL_API_KEY=your_actual_retell_api_key
   RETELL_API_BASE_URL=https://api.retellai.com/v2
   RETELL_AGENT_IDS=agent_abc123,agent_def456,agent_ghi789

   # Database
   DATABASE_URL=postgresql://postgres:root@localhost:5432/digitalytics

   # Application
   NODE_ENV=development
   LOG_LEVEL=info
   SYNC_BATCH_SIZE=1000
   ```

4. **Set up the database**:
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RETELL_API_KEY` | Your Retell AI API key | **Required** |
| `RETELL_API_BASE_URL` | Retell AI API endpoint | `https://api.retellai.com/v2` |
| `RETELL_AGENT_IDS` | Comma-separated agent IDs | **Required** |
| `DATABASE_URL` | PostgreSQL connection string | **Required** |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) | `info` |
| `SYNC_BATCH_SIZE` | Batch size for database operations | `1000` |

## 🗄️ Database Setup

The project uses PostgreSQL running in Docker:

```bash
# PostgreSQL should already be running via Docker:
# Container: digitalytics
# Database: digitalytics
# User: postgres
# Password: root
# Port: 5432
```

### Run Migrations

```bash
# Create migration and apply to database
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## 📖 Usage

### Initial Bulk Sync

Fetch all historical calls from all configured agents:

```bash
npm run sync:initial
```

Sync a specific agent only:

```bash
npm run sync:initial -- --agent-id=agent_abc123
```

### Incremental Sync

Fetch only new calls since the last sync:

```bash
npm run sync:incremental
```

Sync a specific agent only:

```bash
npm run sync:incremental -- --agent-id=agent_abc123
```

### Test Connections

Test database and API connectivity:

```bash
npm run dev
```

### Development

```bash
# Build TypeScript
npm run build

# Run production build
npm start

# Format code
npm run format

# Lint code
npm run lint
```

## 📁 Project Structure

```
digiweb-agents/
├── src/
│   ├── config/
│   │   └── database.ts              # Prisma client initialization
│   ├── services/
│   │   ├── retell-api.service.ts    # Retell AI API client
│   │   └── sync.service.ts          # Sync orchestration
│   ├── repositories/
│   │   └── calls.repository.ts      # Database operations
│   ├── types/
│   │   └── retell.types.ts          # TypeScript types & Zod schemas
│   ├── utils/
│   │   ├── logger.ts                # Winston logger
│   │   └── error-handler.ts         # Error handling utilities
│   └── index.ts                     # Main entry point
├── scripts/
│   ├── initial-sync.ts              # Bulk import script
│   └── incremental-sync.ts          # Incremental sync script
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── migrations/                  # Migration files
├── logs/                            # Application logs
├── .env                             # Environment variables
└── README.md                        # This file
```

## 🗂️ Database Schema

### Core Tables

- **calls**: Main call metadata (call_id, agent_id, status, timestamps, etc.)
- **transcripts**: Call transcripts (text and structured format)
- **call_analysis**: AI-generated call analysis and summaries
- **call_costs**: Cost breakdown (LLM, TTS, STT, telephony)
- **latency_metrics**: Performance metrics (P50, P90, P95, P99)
- **recordings**: Recording URLs

### Key Indexes

- `calls.agent_id` - Filter by agent
- `calls.start_timestamp` - Time-based queries
- `(agent_id, start_timestamp)` - Agent-specific time queries
- `calls.synced_at` - Incremental sync tracking

### Relationships

- One-to-one: Call → Transcript, Call Analysis, Call Costs, Latency Metrics
- One-to-many: Call → Recordings

## 🔌 API Reference

### RetellAPIService

```typescript
// Fetch calls with pagination
await retellAPI.fetchCallsPaginated({
  agentId: 'agent_abc123',
  paginationKey: 'optional_pagination_key',
  filterStartTime: 1234567890,
  limit: 1000
});

// Fetch all calls for an agent
await retellAPI.fetchAllCalls('agent_abc123', sinceDate);

// Fetch single call
await retellAPI.fetchCallById('call_xyz789');

// Test connection
await retellAPI.testConnection();
```

### CallsRepository

```typescript
// Upsert single call
await callsRepo.upsertCall(callInput);

// Batch upsert
await callsRepo.upsertCallsBatch(calls, batchSize);

// Get last synced timestamp
await callsRepo.getLastSyncedTimestamp('agent_abc123');

// Get call by ID
await callsRepo.getCallById('call_xyz789');

// Get total count
await callsRepo.getTotalCallCount('agent_abc123');

// Get calls by agent
await callsRepo.getCallsByAgent('agent_abc123', limit, offset);
```

### SyncService

```typescript
// Bulk sync
await syncService.performBulkSync(['agent_abc123', 'agent_def456']);

// Incremental sync
await syncService.performIncrementalSync(['agent_abc123']);

// Sync single agent
await syncService.syncAgent('agent_abc123');

// Get stats
await syncService.getSyncStats();
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
npm run dev

# Check if PostgreSQL is running
docker ps | grep postgres

# Verify DATABASE_URL in .env
```

### API Connection Issues

```bash
# Verify RETELL_API_KEY is correct
# Check API base URL
# Test with a single agent ID first
npm run sync:initial -- --agent-id=agent_abc123
```

### Migration Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Apply migrations manually
npx prisma migrate deploy
```

### Common Errors

**Error: "RETELL_API_KEY is not set"**
- Solution: Add your API key to `.env` file

**Error: "No agent IDs configured"**
- Solution: Set `RETELL_AGENT_IDS` in `.env` with comma-separated IDs

**Error: "Database connection failed"**
- Solution: Ensure PostgreSQL is running and `DATABASE_URL` is correct

**Error: "Schema has not been generated"**
- Solution: Run `npm run prisma:generate`

## 📊 Database Validation Queries

```sql
-- Check total calls imported
SELECT COUNT(*) FROM calls;

-- Check calls per agent
SELECT agent_id, COUNT(*) as call_count
FROM calls
GROUP BY agent_id;

-- Check latest calls
SELECT call_id, agent_id, start_timestamp, call_status
FROM calls
ORDER BY start_timestamp DESC
LIMIT 10;

-- Verify related data exists
SELECT
  COUNT(DISTINCT c.call_id) as total_calls,
  COUNT(DISTINCT t.call_id) as calls_with_transcripts,
  COUNT(DISTINCT a.call_id) as calls_with_analysis,
  COUNT(DISTINCT co.call_id) as calls_with_costs
FROM calls c
LEFT JOIN transcripts t ON c.call_id = t.call_id
LEFT JOIN call_analysis a ON c.call_id = a.call_id
LEFT JOIN call_costs co ON c.call_id = co.call_id;

-- Check cost totals by agent
SELECT
  c.agent_id,
  COUNT(*) as call_count,
  SUM(cc.total_cost) as total_cost,
  AVG(cc.total_cost) as avg_cost_per_call
FROM calls c
LEFT JOIN call_costs cc ON c.call_id = cc.call_id
GROUP BY c.agent_id;
```

## 🔮 Future Next.js Integration

This backend is designed to integrate seamlessly with a Next.js web application:

- **Shared Types**: Import Prisma-generated types
- **API Routes**: Reuse repository layer
- **Database Connection**: Use same Prisma client

Example Next.js API route:

```typescript
// pages/api/calls/index.ts
import { CallsRepository } from '@/repositories/calls.repository';

export default async function handler(req, res) {
  const repo = new CallsRepository();
  const calls = await repo.getCallsByAgent('agent_abc123', 50, 0);
  res.json(calls);
}
```

## 📝 License

ISC

## 🤝 Contributing

This is a private project for Digitalytics.

---

**Built with ❤️ using TypeScript, Prisma, and PostgreSQL**

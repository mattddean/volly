# PostgreSQL Server Adapter for Echo

This adapter allows you to use a standard PostgreSQL database with the Echo optimistic update system on the server side. It uses `node-postgres` (`pg` package) and Drizzle ORM.

## Installation

To use this adapter, you'll need to install the following dependencies:

```bash
npm install pg drizzle-orm
# and for types, if not already included with pg
npm install @types/pg --save-dev 
```

## Usage

### 1. Define your schema

First, define your schema using Drizzle ORM (same as the client-side example):

```typescript
import { text, integer, pgTable } from 'drizzle-orm/pg-core';

const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tournamentId: text('tournament_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  version: integer('version').notNull().default(1),
});

const schema = { teams /*, ...otherTables */ };
```

### 2. Create the adapter

Next, create the PostgreSQL adapter. This is an async operation as it connects to the database.

```typescript
import { createPostgresAdapter } from 'src/lib/echo/db/server/postgres'; // Adjust path as needed

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@host:port/database';

async function initializeDb() {
  const adapter = await createPostgresAdapter(connectionString, schema);
  return adapter;
}
```

### 3. Initialize your Echo server context

In your server setup:

```typescript
import { ServerContext } from 'src/lib/echo/server'; // Adjust path as needed

async function startServer() {
  const { tables, pool, release } = await initializeDb();
  
  const serverCtx = new ServerContext(tables, schema);
  
  // ... register operations, setup WebSocket server with serverCtx ...
  
  // Make sure to release the client and end the pool on shutdown
  // process.on('SIGINT', async () => {
  //   await release();
  //   await pool.end();
  //   process.exit();
  // });
  return { serverCtx, pool, release };
}
```

### 4. Use with operations

Operations registered with this `serverCtx` will now use PostgreSQL for their database interactions.

```typescript
// (in your operations file)
import { defineOperation } from 'src/lib/echo/core';
import { z } from 'zod';

export const getTeam = defineOperation({
  name: 'getTeam',
  schema: teams, // Drizzle table schema
  input: z.object({ teamId: z.string() }),
  execute: async (ctx, { teamId }) => {
    // This will use the PostgresTableAdapter.get() method
    return ctx.db.teams.get(teamId);
  },
});
```

## How It Works

The PostgreSQL adapter:

1. Connects to your PostgreSQL database using a connection pool from `pg`.
2. Sets up Drizzle ORM to interface with the connected client from the pool.
3. Implements the Echo `TableAdapter` interface for each table in your schema.
4. Provides the actual database persistence layer for your Echo server.

## Connection Management

The `createPostgresAdapter` function returns:
- `db`: The Drizzle ORM instance.
- `pool`: The `node-postgres` connection pool.
- `client`: The specific client connection used by Drizzle (obtained from the pool).
- `tables`: The collection of table adapters.
- `release`: A function to release the `client` back to the `pool`.

It's important to manage database connections properly. The `client` should be released when it's no longer needed (e.g., after a request in a typical web server, or on application shutdown if it's a long-lived client for the whole app). The `pool` should be ended when the application shuts down to close all connections gracefully.

## Benefits

- **Robust and Scalable**: Leverages PostgreSQL, a powerful relational database.
- **Drizzle ORM**: Provides a type-safe SQL query builder.
- **Standard Tooling**: Works with common Node.js PostgreSQL libraries. 
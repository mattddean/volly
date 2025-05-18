# PGLite Adapter for Echo

This adapter allows you to use [PGLite](https://electric-sql.com/docs/api/clients/pglite) with the Echo optimistic update system. PGLite is a SQLite-based Postgres implementation that runs in WebAssembly, making it perfect for client-side optimistic updates.

## Installation

To use this adapter, you'll need to install the following dependencies:

```bash
npm install @electric-sql/pglite drizzle-orm
```

## Usage

### 1. Define your schema

First, define your schema using Drizzle ORM:

```typescript
import { text, integer, pgTable } from 'drizzle-orm/pg-core';

// Define your tables
const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tournamentId: text('tournament_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  version: integer('version').notNull().default(1),
});

// Group all tables in a schema object
const schema = { teams };
```

### 2. Create the adapter

Next, create the PGLite adapter:

```typescript
import { createPgLiteAdapter } from 'src/lib/echo/db/client/pglite';

// Create the adapter with a URL for the database
const { tables, db, pglite } = createPgLiteAdapter('pglite://my-app-db', schema);
```

### 3. Initialize your Echo client context

```typescript
import { ClientContext } from 'src/lib/echo/client';
import { setupSync } from 'src/lib/echo/client';

// Create the client context
const clientCtx = new ClientContext(tables, schema);

// Set up sync with your server
const syncClient = setupSync('wss://api.example.com');
```

### 4. Use with operations

Now you can use your client context with Echo operations:

```typescript
import { useOperation } from 'src/lib/echo/client';
import { addTeam } from './operations';

function MyComponent() {
  const { execute } = useOperation(addTeam, syncClient, clientCtx);
  
  const handleAddTeam = async () => {
    await execute({
      name: 'New Team',
      tournamentId: 'tournament-123',
    });
  };
  
  // ... rest of component
}
```

## How It Works

The PGLite adapter:

1. Creates a PGLite database instance running in WebAssembly
2. Sets up Drizzle ORM to interface with the database 
3. Implements the Echo `TableAdapter` interface for each table
4. Provides a seamless way to perform optimistic updates on the client

## Benefits

- **Full SQL Capabilities**: PGLite provides SQL capabilities in the browser
- **Optimistic Updates**: Changes appear instantly in the UI
- **Offline Support**: Data persists even when offline
- **Sync**: Changes synchronize with the server when connection is available

## Limitations

- Initial database size can be large, so load time may be a consideration
- Complex SQL operations may be slower than in a native environment 
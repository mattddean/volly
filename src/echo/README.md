# Echo: Generic Optimistic Update System

Echo is a library for building real-time applications with optimistic updates using a single codebase for both client and server operations.

## Key Features

- **Single Code Path**: Use the same operation definitions for both client and server
- **Optimistic Updates**: Changes appear instantly in the UI before server confirmation
- **Conflict Resolution**: Multiple strategies for handling conflicting changes
- **Real-time Sync**: WebSocket-based synchronization between clients
- **Type Safety**: Full TypeScript support throughout

## Basic Concepts

### Operations

Operations are the core of Echo. An operation is a function that can be executed on both the client and server.

```typescript
const addTeam = defineOperation({
  name: 'addTeam',
  schema: teamSchema,
  input: z.object({
    name: z.string(),
    tournamentId: z.string(),
  }),
  execute: async (ctx, input) => {
    const newTeam = {
      id: crypto.randomUUID(),
      name: input.name,
      tournamentId: input.tournamentId,
      createdAt: new Date(),
      version: 1,
    };
    
    return ctx.db.teams.insert(newTeam);
  },
});
```

### Conflict Resolution

Echo handles conflicts using version numbers and configurable resolution strategies:

- `client-wins`: Client changes overwrite server state
- `server-wins`: Server state is preserved (default)
- `merge`: Attempt to merge changes
- `manual`: Surface to UI for user decision

### Database Abstraction

Echo provides a database abstraction layer that can work with:

- Server: PostgreSQL, MySQL, SQLite, etc.
- Client: IndexedDB, WebSQL, PGLite WASM, sqlite-wasm, etc.

## Usage Example

### Client Side

```tsx
function TeamForm({ tournamentId }) {
  const { execute } = useOperation(addTeam, syncClient, clientCtx);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute({ 
      name: e.target.name.value,
      tournamentId 
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Server Side

```typescript
// Register operations
const operations = registerOperations(
  { addTeam, updateTeam, getTeams },
  serverContext
);

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });
setupWebSocketServer(wss, operations);
```

## Installation

```bash
# Not yet published
npm install echo-updates
```

## Dependencies

- TypeScript
- Zod (for input validation)
- WebSockets (for real-time sync)
- A WASM database for the client (optional)

## Status

This library is currently in development and not yet ready for production use.

## License

MIT 
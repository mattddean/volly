# Echo Library Structure

## Directory Structure

```
echo/
├── types.ts           # Core type definitions
├── core.ts            # Shared core functionality
├── client.ts          # Client-side implementation
├── server.ts          # Server-side implementation
├── index.ts           # Main entry point
├── examples/          # Usage examples
│   ├── team-operations.ts    # Example operations
│   ├── TeamForm.tsx          # Example React component
│   └── server-setup.ts       # Example server setup
├── README.md          # Documentation
└── STRUCTURE.md       # This file
```

## File Descriptions

### Core Files

- **types.ts**: Contains all type definitions used throughout the library, including `Operation`, `OperationContext`, conflict resolution types, and error classes.

- **core.ts**: Contains shared functionality used by both client and server, such as the `defineOperation` function, conflict resolution helpers, and environment detection.

- **client.ts**: Client-side implementation including the `ClientContext` class, WebSocket sync functionality, and React hooks for using operations.

- **server.ts**: Server-side implementation including the `ServerContext` class, operation registry, and WebSocket server setup.

- **index.ts**: The main entry point for the library, handling environment-specific exports.

### Examples

- **team-operations.ts**: Shows how to define operations that work on both client and server.

- **TeamForm.tsx**: Demonstrates using the operations in a React component with optimistic updates.

- **server-setup.ts**: Shows how to set up the server-side, including WebSocket configuration and operation registration.

## Implementation Details

### The Operation Flow

1. **Definition**: Operations are defined once using `defineOperation`
2. **Client Execution**:
   - Operation is executed locally first (optimistic update)
   - Request is sent to server
   - UI updates immediately
3. **Server Execution**:
   - Server validates and executes the operation
   - Sends result back to the client
   - Broadcasts changes to all clients
4. **Conflict Resolution**:
   - If conflicts occur, they're resolved based on the strategy
   - Resolution can be automatic or involve user intervention

### Database Abstraction

Echo provides a database abstraction layer that works with:

- Table adapters with standard methods (insert, update, delete, query)
- Proxy tables that map to the appropriate tables in the database
- Transaction support for multi-step operations

## Extension Points

To extend Echo with custom functionality:

1. **Custom Database Adapters**: Implement adapters for specific databases
2. **Custom Conflict Resolution**: Add specialized resolution strategies
3. **Additional Context**: Extend the context interface with authentication, etc.
4. **Middleware**: Add support for operation middleware (validation, logging, etc.) 
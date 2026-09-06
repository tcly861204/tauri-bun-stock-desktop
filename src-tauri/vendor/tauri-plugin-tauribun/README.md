# Tauri Plugin Tauribun

A Tauri v2 plugin for managing Bun sidecars with type-safe oRPC communication.

## Installation

### Rust

Add the plugin to your Tauri app's `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-bun = { path = "path/to/tauri-plugin-bun" }
```

Register the plugin in your `lib.rs`:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_tauribun::init())
```

### JavaScript

Add the plugin API to your frontend:

```bash
bun add tauri-plugin-tauribun
```

### Capabilities

Add the plugin permissions to your capabilities file:

```json
{
  "permissions": [
    "tauribun:default"
  ]
}
```

## Usage

### Server (Bun Sidecar)

Define your RPC procedures and call `createServer()` to start the server:

```ts
// main.ts (sidecar entry point)
import { createServer, os } from 'tauri-plugin-tauribun';
import * as z from "zod";

const router = {
  ping: os
    .route({
      method: "POST",
      path: "/",
      summary: "Ping-pong",
    })
    .input(z.object({ message: z.string() }))
    .output(z.object({ message: z.string() }))
    .handler(async ({ input }) => {
      console.log("Received:", input.message);
      return { message: "Pong!" };
    }),
};

createServer('my-server', router);

export type Router = typeof router;
```

### Client (Frontend)

Use `createClient()` or `createQueryClient()` for TanStack Query integration:

```ts
// lib/orpc.ts
import { createQueryClient } from 'tauri-plugin-tauribun';
import type { Router } from './server';

export const orpc = createQueryClient<Router>('my-server');
```

```tsx
// In a React component
import { useMutation } from '@tanstack/react-query';
import { orpc } from './lib/orpc';

function PingButton() {
  const { mutate } = useMutation(
    orpc.ping.mutationOptions({
      onSuccess: (data) => console.log(data.message),
    })
  );

  return (
    <button onClick={() => mutate({ message: "Hello!" })}>
      Ping
    </button>
  );
}
```

### Direct Client Usage

For non-React Query usage:

```ts
import { createClient } from 'tauri-plugin-tauribun';
import type { Router } from './server';

const client = createClient<Router>('my-server');

const response = await client.ping({ message: "Hello, world!" });
console.log(response.message); // "Pong!"
```

## API Reference

### `createServer(name, router)`

Creates an oRPC server in the Bun sidecar.

- `name`: Identifier for the server (used for logging)
- `router`: oRPC router object with your procedures

### `createClient<T>(name, options?)`

Creates an oRPC client connected to a sidecar.

- `name`: Server name to connect to
- `options.binaryPath`: Path to sidecar binary (default: `"binaries/bun"`)

### `createQueryClient<T>(name, options?)`

Creates a TanStack Query-enabled oRPC client.

### `disconnectClient(name)`

Disconnects and cleans up a client connection.

## Architecture

```
Frontend (WebView)
    └─> createClient('my-server')
        └─> Tauri Plugin (Rust)
            └─> Spawn/manage sidecar process
                └─> Bun Sidecar running createServer('my-server', router)
```

Communication happens via stdio using oRPC's stdio adapter.
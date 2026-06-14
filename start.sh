#!/bin/bash
# Start backend server in background using transpile-only mode (skip type checks)
TS_NODE_PROJECT=tsconfig.server.json node -r ts-node/register/transpile-only server/index.ts &
BACKEND_PID=$!

# Wait briefly for backend to start
sleep 2

# Start frontend Vite dev server
npx vite --config vite.config.ts

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null

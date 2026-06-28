# Render Deploy Guide

This project is ready for Render.

## Option A: Render Blueprint

1. Push this folder to a GitHub repository.
2. Open Render.
3. Choose **New** then **Blueprint**.
4. Connect the GitHub repository.
5. Render will read `render.yaml`.
6. Deploy the `autody-liquidity-manager` service.

## Option B: Manual Web Service

1. Push this folder to a GitHub repository.
2. Open Render.
3. Choose **New** then **Web Service**.
4. Connect the GitHub repository.
5. Use these settings:

```txt
Runtime: Node
Build Command: empty
Start Command: node server.js
Health Check Path: /api/health
```

Render sets `PORT` automatically, so no manual port value is needed.

## Environment Variables

Render can use the defaults in `render.yaml`. Later, add a stronger private Polygon RPC if the free RPC becomes slow:

```txt
POLYGON_RPC_URL=https://your-private-polygon-rpc
OWNER_WALLET_ADDRESS=your-public-wallet-address
```

Do not add private keys to Render.

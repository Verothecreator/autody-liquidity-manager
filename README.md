# Autody Liquidity Manager

Local build for planning and monitoring Autody AU/USDT liquidity on Polygon.

This system is built around safe liquidity control:

- AU/USDT pool planning
- matched USDT requirement calculation
- price impact simulation
- Polygon token reads
- Uniswap v3 Polygon pool discovery
- monitor worker for 24/7 VPS use

It does not store private keys and does not execute swaps automatically.

## Run Locally

```bash
cp .env.example .env
npm start
```

Open:

```txt
http://localhost:4177
```

## Configure

Edit `.env`:

```txt
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com
AU_TOKEN_ADDRESS=0xE35Ba492b2C7e58FA6691dd631B3b6c7FE5D4914
USDT_TOKEN_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
OWNER_WALLET_ADDRESS=your_public_wallet_here
TARGET_START_PRICE=7
TARGET_LOWER_PRICE=7
TARGET_UPPER_PRICE=10
DEFAULT_AU_DEPOSIT=10000
DEFAULT_FEE_TIER=3000
```

## Commands

```bash
npm start
npm run monitor
npm run check
```

## Deploy To Render

This project includes `render.yaml`.

Read:

```txt
RENDER_DEPLOY.md
```

## What Each Part Does

- `server.js`: local web server and API.
- `public/`: browser dashboard.
- `lib/rpc.js`: Polygon RPC and ERC20 reader.
- `lib/simulator.js`: AU/USDT liquidity math.
- `worker/monitor.js`: repeating Polygon monitor for VPS.
- `config/defaults.js`: project defaults.

## Pool Notes

At a starting price of `$7`, a balanced AU/USDT pool needs:

- `10,000 AU` plus about `70,000 USDT`
- `100,000 AU` plus about `700,000 USDT`

You can deposit Autody first, but an active market needs the USDT side or real USDT buyers for normal chart movement.

## DEX Notes

The dashboard is prepared for:

- QuickSwap v3 / Algebra on Polygon
- Uniswap v3 on Polygon

Uniswap v3 pool discovery is included by fee tier. QuickSwap v3 pool control is kept configurable because Algebra pool addresses should be confirmed at deployment time.

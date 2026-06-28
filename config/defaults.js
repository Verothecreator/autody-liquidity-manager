export const config = {
  appName: "Autody Liquidity Manager",
  chain: {
    name: "Polygon",
    chainId: 137,
    explorer: "https://polygonscan.com",
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
    rpcFallbacks: [
      process.env.POLYGON_RPC_URL,
      "https://polygon-bor-rpc.publicnode.com",
      "https://polygon.drpc.org"
    ].filter(Boolean)
  },
  tokens: {
    au: {
      symbol: "AU",
      name: "Autody",
      address: process.env.AU_TOKEN_ADDRESS || "0xE35Ba492b2C7e58FA6691dd631B3b6c7FE5D4914"
    },
    usdt: {
      symbol: "USDT",
      name: "Tether USD",
      address: process.env.USDT_TOKEN_ADDRESS || "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    }
  },
  ownerWallet: process.env.OWNER_WALLET_ADDRESS || "",
  liquidityPlan: {
    startPrice: Number(process.env.TARGET_START_PRICE || 7),
    lowerPrice: Number(process.env.TARGET_LOWER_PRICE || 7),
    upperPrice: Number(process.env.TARGET_UPPER_PRICE || 10),
    auDeposit: Number(process.env.DEFAULT_AU_DEPOSIT || 10000),
    feeTier: Number(process.env.DEFAULT_FEE_TIER || 3000)
  },
  dexes: {
    uniswapV3: {
      name: "Uniswap v3 Polygon",
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      feeTiers: [500, 3000, 10000]
    },
    quickswapV3: {
      name: "QuickSwap v3 / Algebra",
      note: "QuickSwap v3 uses Algebra-style contracts. Pool discovery is kept configurable so the exact pool address can be added after creation."
    }
  },
  monitor: {
    intervalMs: Number(process.env.MONITOR_INTERVAL_MS || 60000)
  }
};

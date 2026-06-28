import { loadEnv } from "../lib/env.js";

loadEnv();

const { config } = await import("../config/defaults.js");
const { RpcClient, readErc20, readOwnableOwner, findUniswapV3Pool, readV3Pool } = await import("../lib/rpc.js");

const rpc = new RpcClient(config.chain.rpcFallbacks);

async function checkOnce() {
  const checkedAt = new Date().toISOString();
  const blockNumber = await rpc.blockNumber();
  const au = await readErc20(rpc, config.tokens.au.address, config.ownerWallet);
  const usdt = await readErc20(rpc, config.tokens.usdt.address, config.ownerWallet);
  const contractOwner = await readOwnableOwner(rpc, config.tokens.au.address);
  const pools = [];

  for (const fee of config.dexes.uniswapV3.feeTiers) {
    const address = await findUniswapV3Pool(
      rpc,
      config.dexes.uniswapV3.factory,
      config.tokens.au.address,
      config.tokens.usdt.address,
      fee
    );
    if (!address) {
      pools.push({ fee, address: null, status: "not found" });
      continue;
    }
    const pool = await readV3Pool(rpc, address);
    pools.push({ fee, ...pool });
  }

  const snapshot = {
    checkedAt,
    blockNumber,
    au: {
      symbol: au.symbol || config.tokens.au.symbol,
      decimals: au.decimals,
      totalSupply: au.totalSupply.formatted,
      ownerBalance: au.balance?.formatted || null,
      contractOwner
    },
    usdt: {
      symbol: usdt.symbol || config.tokens.usdt.symbol,
      ownerBalance: usdt.balance?.formatted || null
    },
    pools
  };

  console.log(JSON.stringify(snapshot, null, 2));
}

async function loop() {
  await checkOnce().catch((error) => {
    console.error(JSON.stringify({ checkedAt: new Date().toISOString(), error: error.message }, null, 2));
  });
  setTimeout(loop, config.monitor.intervalMs);
}

loop();

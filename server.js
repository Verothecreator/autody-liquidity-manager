import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.js";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4177);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function routeApi(req, res, url) {
  if (url.pathname === "/api/health") {
    return sendJson(res, { ok: true, service: "autody-liquidity-manager", time: new Date().toISOString() });
  }

  if (url.pathname === "/api/config") {
    const { config } = await import("./config/defaults.js");
    return sendJson(res, { ok: true, config: publicConfig(config) });
  }

  if (url.pathname === "/api/plan") {
    const { buildPlan, simulateConstantProduct } = await import("./lib/simulator.js");
    const params = Object.fromEntries(url.searchParams.entries());
    const auDeposit = numberParam(params.auDeposit, 10000);
    const startPrice = numberParam(params.startPrice, 7);
    const lowerPrice = numberParam(params.lowerPrice, 7);
    const upperPrice = numberParam(params.upperPrice, 10);
    const availableUsdt = numberParam(params.availableUsdt, 0);
    const buySizeUsdt = numberParam(params.buySizeUsdt, 100);
    const sellSizeAu = numberParam(params.sellSizeAu, 15);
    const feeRate = numberParam(params.feeRate, 0.003);
    const plan = buildPlan({ auDeposit, startPrice, lowerPrice, upperPrice, availableUsdt });
    const impact = simulateConstantProduct({
      auReserve: auDeposit,
      usdtReserve: auDeposit * startPrice,
      feeRate,
      buySizeUsdt,
      sellSizeAu
    });
    return sendJson(res, { ok: true, plan, impact });
  }

  if (url.pathname === "/api/polygon") {
    const { config } = await import("./config/defaults.js");
    const { RpcClient, readErc20, readOwnableOwner, findUniswapV3Pool, readV3Pool } = await import("./lib/rpc.js");
    const rpc = new RpcClient(config.chain.rpcFallbacks);
    const blockNumber = await rpc.blockNumber();
    const [au, usdt] = await Promise.all([
      readErc20(rpc, config.tokens.au.address, config.ownerWallet),
      readErc20(rpc, config.tokens.usdt.address, config.ownerWallet)
    ]);
    const contractOwner = await readOwnableOwner(rpc, config.tokens.au.address);

    const pools = [];
    for (const fee of config.dexes.uniswapV3.feeTiers) {
      const poolAddress = await findUniswapV3Pool(
        rpc,
        config.dexes.uniswapV3.factory,
        config.tokens.au.address,
        config.tokens.usdt.address,
        fee
      ).catch((error) => ({ error: error.message }));

      if (typeof poolAddress === "string") {
        const pool = await readV3Pool(rpc, poolAddress).catch((error) => ({ address: poolAddress, error: error.message }));
        pools.push({ dex: config.dexes.uniswapV3.name, fee, ...pool });
      } else {
        pools.push({ dex: config.dexes.uniswapV3.name, fee, address: null, status: poolAddress?.error || "not found" });
      }
    }

    return sendJson(res, { ok: true, blockNumber, au, usdt, contractOwner, pools });
  }

  return sendJson(res, { ok: false, error: "API route not found" }, 404);
}

function publicConfig(config) {
  return {
    appName: config.appName,
    chain: config.chain,
    tokens: config.tokens,
    ownerWalletConfigured: Boolean(config.ownerWallet),
    liquidityPlan: config.liquidityPlan,
    dexes: config.dexes
  };
}

function numberParam(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function sendJson(res, body, status = 200) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(text);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, {
    "content-type": mime[ext] || "application/octet-stream",
    "cache-control": "no-store"
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await routeApi(req, res, url);

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(publicDir, requested));
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      return res.end("Not found");
    }
    return sendFile(res, filePath);
  } catch (error) {
    return sendJson(res, { ok: false, error: error.message }, 500);
  }
});

server.listen(port, () => {
  console.log(`Autody Liquidity Manager running at http://localhost:${port}`);
});

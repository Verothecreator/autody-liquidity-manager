const ERC20_ABI = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231"
};

const OWNABLE_OWNER = "0x8da5cb5b";
const UNISWAP_V3_FACTORY_GET_POOL = "0x1698ee82";
const V3_POOL_SLOT0 = "0x3850c7bd";
const V3_POOL_LIQUIDITY = "0x1a686502";

export class RpcClient {
  constructor(rpcUrl) {
    this.rpcUrls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
    this.id = 1;
  }

  async call(method, params) {
    const errors = [];
    for (const rpcUrl of this.rpcUrls) {
      try {
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: this.id++, method, params })
        });
        if (!response.ok) throw new Error(`${rpcUrl} HTTP ${response.status}`);
        const json = await response.json();
        if (json.error) throw new Error(json.error.message || "RPC error");
        return json.result;
      } catch (error) {
        errors.push(error.message);
      }
    }
    throw new Error(errors.join(" | "));
  }

  ethCall(to, data) {
    return this.call("eth_call", [{ to, data }, "latest"]);
  }

  blockNumber() {
    return this.call("eth_blockNumber", []);
  }
}

export function normalizeAddress(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address || "")) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase();
}

export function encodeAddress(address) {
  return normalizeAddress(address).slice(2).padStart(64, "0");
}

export function encodeUint24(value) {
  const hex = Number(value).toString(16);
  return hex.padStart(64, "0");
}

export function hexToBigInt(hex) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

export function decodeString(hex) {
  if (!hex || hex === "0x") return "";
  const clean = hex.slice(2);
  try {
    const offset = Number.parseInt(clean.slice(0, 64), 16) * 2;
    const length = Number.parseInt(clean.slice(offset, offset + 64), 16) * 2;
    const data = clean.slice(offset + 64, offset + 64 + length);
    return Buffer.from(data, "hex").toString("utf8").replace(/\0/g, "");
  } catch {
    return "";
  }
}

export function formatUnits(value, decimals) {
  const raw = typeof value === "bigint" ? value : BigInt(value || 0);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export async function readErc20(rpc, tokenAddress, walletAddress = "") {
  const [nameRaw, symbolRaw, decimalsRaw, supplyRaw] = await Promise.all([
    rpc.ethCall(tokenAddress, ERC20_ABI.name).catch(() => "0x"),
    rpc.ethCall(tokenAddress, ERC20_ABI.symbol).catch(() => "0x"),
    rpc.ethCall(tokenAddress, ERC20_ABI.decimals),
    rpc.ethCall(tokenAddress, ERC20_ABI.totalSupply)
  ]);

  const decimals = Number(hexToBigInt(decimalsRaw));
  const totalSupply = hexToBigInt(supplyRaw);
  let balance = null;

  if (walletAddress) {
    const balanceRaw = await rpc.ethCall(tokenAddress, `${ERC20_ABI.balanceOf}${encodeAddress(walletAddress)}`);
    balance = {
      raw: balanceRaw,
      formatted: formatUnits(hexToBigInt(balanceRaw), decimals)
    };
  }

  return {
    address: tokenAddress,
    name: decodeString(nameRaw),
    symbol: decodeString(symbolRaw),
    decimals,
    totalSupply: {
      raw: supplyRaw,
      formatted: formatUnits(totalSupply, decimals)
    },
    balance
  };
}

export async function readOwnableOwner(rpc, contractAddress) {
  try {
    const result = await rpc.ethCall(contractAddress, OWNABLE_OWNER);
    const addressHex = result.slice(-40);
    const address = `0x${addressHex}`;
    if (/^0x0{40}$/.test(address)) return null;
    return address;
  } catch {
    return null;
  }
}

export async function findUniswapV3Pool(rpc, factory, tokenA, tokenB, fee) {
  const data = `${UNISWAP_V3_FACTORY_GET_POOL}${encodeAddress(tokenA)}${encodeAddress(tokenB)}${encodeUint24(fee)}`;
  const result = await rpc.ethCall(factory, data);
  const addressHex = result.slice(-40);
  const address = `0x${addressHex}`;
  if (/^0x0{40}$/.test(address)) return null;
  return address;
}

export async function readV3Pool(rpc, poolAddress) {
  const [slot0Raw, liquidityRaw] = await Promise.all([
    rpc.ethCall(poolAddress, V3_POOL_SLOT0),
    rpc.ethCall(poolAddress, V3_POOL_LIQUIDITY)
  ]);
  const sqrtPriceX96 = hexToBigInt(`0x${slot0Raw.slice(2, 66)}`);
  const tickHex = slot0Raw.slice(66, 130);
  return {
    address: poolAddress,
    sqrtPriceX96: sqrtPriceX96.toString(),
    tickData: `0x${tickHex}`,
    liquidity: hexToBigInt(liquidityRaw).toString()
  };
}

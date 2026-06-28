const fmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
const fields = ["auDeposit", "startPrice", "availableUsdt", "lowerPrice", "upperPrice", "feeRate", "buySize", "sellSize"];
let lastSnapshot = null;

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.view).classList.add("active");
  });
});

async function loadConfig() {
  const response = await fetch("/api/config");
  const data = await response.json();
  document.getElementById("contractAddress").textContent = data.config.tokens.au.address;
  const plan = data.config.liquidityPlan;
  document.getElementById("auDeposit").value = plan.auDeposit;
  document.getElementById("startPrice").value = plan.startPrice;
  document.getElementById("lowerPrice").value = plan.lowerPrice;
  document.getElementById("upperPrice").value = plan.upperPrice;
  document.getElementById("feeRate").value = plan.feeTier / 1000000;
  await updatePlan();
}

function params() {
  const get = (id) => Number(document.getElementById(id).value || 0);
  return new URLSearchParams({
    auDeposit: get("auDeposit"),
    startPrice: get("startPrice"),
    availableUsdt: get("availableUsdt"),
    lowerPrice: get("lowerPrice"),
    upperPrice: get("upperPrice"),
    feeRate: get("feeRate"),
    buySizeUsdt: get("buySize"),
    sellSizeAu: get("sellSize")
  });
}

async function updatePlan() {
  const response = await fetch(`/api/plan?${params().toString()}`);
  const data = await response.json();
  if (!data.ok) return;
  const { plan, impact } = data;
  document.getElementById("neededUsdt").textContent = fmtUsd.format(plan.matchedUsdt);
  document.getElementById("neededSub").textContent = `${fmt.format(plan.auDeposit)} AU at ${fmtUsd.format(plan.startPrice)}`;
  document.getElementById("fundingGap").textContent = fmtUsd.format(plan.fundingGap);
  document.getElementById("fundingSub").textContent = `${fmtUsd.format(plan.availableUsdt)} available USDT entered`;
  document.getElementById("poolNotional").textContent = fmtUsd.format(plan.poolNotional);
  document.getElementById("rangeWidth").textContent = `${fmt.format(plan.rangeWidth)}%`;
  document.getElementById("rangeSub").textContent = `${fmtUsd.format(plan.lowerPrice)} to ${fmtUsd.format(plan.upperPrice)}`;
  document.getElementById("impactRows").innerHTML = `
    <tr><td>Buy AU with ${fmtUsd.format(impact.buy.inputUsdt)}</td><td>${fmtUsd.format(impact.buy.newPrice)}</td><td class="green">+${fmt.format(impact.buy.movePct)}%</td><td>${fmt.format(impact.buy.outputAu)} AU</td></tr>
    <tr><td>Sell ${fmt.format(impact.sell.inputAu)} AU</td><td>${fmtUsd.format(impact.sell.newPrice)}</td><td class="red">${fmt.format(impact.sell.movePct)}%</td><td>${fmtUsd.format(impact.sell.outputUsdt)}</td></tr>
  `;
}

async function refreshLive() {
  const box = document.getElementById("liveOutput");
  box.textContent = "Reading Polygon RPC...";
  try {
    const response = await fetch("/api/polygon");
    const data = await response.json();
    box.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    box.textContent = `Live read failed: ${error.message}`;
  }
}

async function runSnapshot() {
  setOverviewLoading();
  try {
    const response = await fetch("/api/snapshot");
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Snapshot failed");
    lastSnapshot = data.snapshot;
    renderOverview(data.snapshot);
    renderHistory(data.history || []);
  } catch (error) {
    document.getElementById("nextMove").textContent = `Full check failed: ${error.message}`;
  }
}

async function refreshHistory() {
  const response = await fetch("/api/history");
  const data = await response.json();
  renderHistory(data.history || []);
}

function setOverviewLoading() {
  document.getElementById("readyScore").textContent = "...";
  document.getElementById("readyStatus").textContent = "Checking Polygon and market indexers";
  document.getElementById("nextMove").textContent = "Reading token contract, pool status, and market-pair visibility.";
}

function renderOverview(snapshot) {
  const readiness = snapshot.readiness;
  const polygon = snapshot.polygon;
  const market = snapshot.market || {};
  const poolCount = (polygon.pools || []).filter((pool) => pool.address).length;

  document.getElementById("readyScore").textContent = `${readiness.score}%`;
  document.getElementById("readyStatus").textContent = readiness.status;
  document.getElementById("auSupply").textContent = fmt.format(Number(polygon.au.totalSupply.formatted || 0));
  document.getElementById("pairCount").textContent = market.pairCount ?? 0;
  document.getElementById("v3PoolCount").textContent = poolCount;
  document.getElementById("readyItems").innerHTML = readiness.items.map((item) => `
    <div class="check ${item.done ? "done" : ""}">
      <span>${item.done ? "✓" : "!"}</span>
      <strong>${item.label}</strong>
    </div>
  `).join("");
  document.getElementById("marketRows").innerHTML = renderMarketRows(market.pairs || []);
  document.getElementById("nextMove").innerHTML = nextMoveText(snapshot);
}

function renderMarketRows(pairs) {
  if (!pairs.length) return `<tr><td colspan="5">No indexed pair found yet for AU.</td></tr>`;
  return pairs.map((pair) => `
    <tr>
      <td>${pair.dexId || "--"}</td>
      <td><a href="${pair.url}" target="_blank" rel="noreferrer">${pair.baseToken?.symbol || "AU"}/${pair.quoteToken?.symbol || "--"}</a></td>
      <td>${pair.priceUsd ? fmtUsd.format(Number(pair.priceUsd)) : "--"}</td>
      <td>${pair.liquidity?.usd ? fmtUsd.format(pair.liquidity.usd) : "--"}</td>
      <td>${pair.volume?.h24 ? fmtUsd.format(pair.volume.h24) : "--"}</td>
    </tr>
  `).join("");
}

function nextMoveText(snapshot) {
  const hasPair = Boolean(snapshot.market?.pairCount);
  const hasV3Pool = Boolean(snapshot.polygon?.pools?.some((pool) => pool.address));
  const supply = Number(snapshot.polygon?.au?.totalSupply?.formatted || 0);

  if (supply < 10000) {
    return "AU supply is lower than the planned pool size. Confirm whether the owner wallet can mint more or lower the starting deposit plan.";
  }
  if (!hasPair && !hasV3Pool) {
    return "Create the first AU/USDT pool on Polygon, then add the pool address here so this portal can track it directly.";
  }
  if (!hasPair) {
    return "A pool exists on-chain but no indexed market pair was found yet. Wait for indexing or submit/update the pair profile.";
  }
  return "Market visibility exists. The next layer is database-backed candle/liquidity history and owner alerts.";
}

function renderHistory(history) {
  document.getElementById("historyRows").innerHTML = history.length ? history.map((item) => {
    const pools = (item.polygon?.pools || []).filter((pool) => pool.address).length;
    return `
      <tr>
        <td>${new Date(item.checkedAt).toLocaleString()}</td>
        <td>${item.readiness?.score ?? "--"}%</td>
        <td>${fmt.format(Number(item.polygon?.au?.totalSupply?.formatted || 0))}</td>
        <td>${item.market?.pairCount ?? 0}</td>
        <td>${pools}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5">No snapshots stored yet.</td></tr>`;
}

fields.forEach((id) => document.getElementById(id).addEventListener("input", updatePlan));
document.getElementById("refreshLive").addEventListener("click", refreshLive);
document.getElementById("runSnapshot").addEventListener("click", runSnapshot);
document.getElementById("refreshHistory").addEventListener("click", refreshHistory);
loadConfig().catch((error) => {
  document.getElementById("liveOutput").textContent = error.message;
  updatePlan();
});
runSnapshot();

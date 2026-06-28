const fmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
const fields = ["auDeposit", "startPrice", "availableUsdt", "lowerPrice", "upperPrice", "feeRate", "buySize", "sellSize"];

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

fields.forEach((id) => document.getElementById(id).addEventListener("input", updatePlan));
document.getElementById("refreshLive").addEventListener("click", refreshLive);
loadConfig().catch((error) => {
  document.getElementById("liveOutput").textContent = error.message;
  updatePlan();
});

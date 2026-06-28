export function simulateConstantProduct({ auReserve, usdtReserve, feeRate, buySizeUsdt, sellSizeAu }) {
  const price = usdtReserve / auReserve;
  const buy = simulateBuy(auReserve, usdtReserve, buySizeUsdt, feeRate);
  const sell = simulateSell(auReserve, usdtReserve, sellSizeAu, feeRate);
  return { price, buy, sell };
}

export function buildPlan({ auDeposit, startPrice, lowerPrice, upperPrice, availableUsdt = 0 }) {
  const matchedUsdt = auDeposit * startPrice;
  const poolNotional = matchedUsdt * 2;
  const fundingGap = Math.max(0, matchedUsdt - availableUsdt);
  const rangeWidth = ((upperPrice - lowerPrice) / lowerPrice) * 100;
  return {
    auDeposit,
    startPrice,
    lowerPrice,
    upperPrice,
    matchedUsdt,
    poolNotional,
    availableUsdt,
    fundingGap,
    rangeWidth
  };
}

function simulateBuy(auReserve, usdtReserve, usdtIn, feeRate) {
  const usableIn = usdtIn * (1 - feeRate);
  const k = auReserve * usdtReserve;
  const newUsdt = usdtReserve + usableIn;
  const newAu = k / newUsdt;
  const oldPrice = usdtReserve / auReserve;
  const newPrice = newUsdt / newAu;
  return {
    inputUsdt: usdtIn,
    outputAu: auReserve - newAu,
    newPrice,
    movePct: ((newPrice / oldPrice) - 1) * 100
  };
}

function simulateSell(auReserve, usdtReserve, auIn, feeRate) {
  const usableIn = auIn * (1 - feeRate);
  const k = auReserve * usdtReserve;
  const newAu = auReserve + usableIn;
  const newUsdt = k / newAu;
  const oldPrice = usdtReserve / auReserve;
  const newPrice = newUsdt / newAu;
  return {
    inputAu: auIn,
    outputUsdt: usdtReserve - newUsdt,
    newPrice,
    movePct: ((newPrice / oldPrice) - 1) * 100
  };
}

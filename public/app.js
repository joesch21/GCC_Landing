// --- Constants ---
const tokenAddress  = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol   = "GCC";
const tokenDecimals = 18;
const tokenImage    = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";

// Prefer pair endpoint; fall back to token search if pair is empty
const dexscreenerPairApi =
  "https://api.dexscreener.com/latest/dex/pairs/bsc/0x3d32d359bdad07C587a52F8811027675E4f5A833";
const dexscreenerTokenApi =
  `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;

// Public site URL for MetaMask mobile deeplinks (must include protocol)
const dappPublicUrl = "https://www.gcc-bsc.online";

// --- Helpers ---
const isMobileUA = () => /iPhone|iPad|iPod|Android|Mobile|CriOS/i.test(navigator.userAgent);
const mmDeeplink = (url) => `https://metamask.app.link/dapp/${encodeURIComponent(url)}`;

const BSC_PARAMS = {
  chainId: "0x38",
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

async function ensureBsc() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_PARAMS.chainId }],
    });
  } catch (err) {
    if (err && err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BSC_PARAMS],
      });
    }
  }
}

function formatUsdPrice(price) {
  const n = parseFloat(price);
  if (!Number.isFinite(n)) return "N/A";
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toPrecision(4)}`;
}

function formatUsdVolume(volume) {
  const n = parseFloat(volume);
  if (!Number.isFinite(n)) return "N/A";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pickPair(data) {
  if (!data) return null;
  if (data.pair) return data.pair;
  if (Array.isArray(data.pairs) && data.pairs.length) {
    // Prefer highest liquidity when multiple pairs exist
    return data.pairs.slice().sort((a, b) => {
      const la = parseFloat(a?.liquidity?.usd) || 0;
      const lb = parseFloat(b?.liquidity?.usd) || 0;
      return lb - la;
    })[0];
  }
  return null;
}

// --- Wallet actions ---
async function connectMetaMask() {
  try {
    const isMobile = isMobileUA();

    if (window.ethereum) {
      await ensureBsc();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const a0 = accounts?.[0];
      console.log("Connected wallet:", a0);
      alert(`Connected wallet: ${a0}`);
      return;
    }

    if (isMobile) {
      alert("You'll now be redirected to MetaMask to connect your wallet.");
      const link = mmDeeplink(dappPublicUrl);
      window.location.href = link;
      setTimeout(() => {
        window.open(dappPublicUrl, "_blank", "noopener");
      }, 1500);
      return;
    }

    alert("MetaMask is not detected. Please install it from https://metamask.io");
  } catch (err) {
    console.error("MetaMask connection error:", err);
    alert("Connection failed. Please try again.");
  }
}

async function addTokenToMetaMask() {
  if (!window.ethereum) {
    alert("MetaMask not detected.");
    return;
  }
  try {
    await ensureBsc();
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          image: tokenImage,
        },
      },
    });
    alert(wasAdded ? "Token added!" : "Token addition declined.");
  } catch (err) {
    console.error("Add token error:", err);
    alert(err?.message || "Unable to add token.");
  }
}

// --- Market data ---
async function fetchDexVolumeData() {
  try {
    let pair = null;

    const pairRes = await fetch(dexscreenerPairApi, { cache: "no-store" });
    if (pairRes.ok) {
      pair = pickPair(await pairRes.json());
    }

    if (!pair) {
      const tokenRes = await fetch(dexscreenerTokenApi, { cache: "no-store" });
      if (!tokenRes.ok) throw new Error(`DexScreener HTTP ${tokenRes.status}`);
      pair = pickPair(await tokenRes.json());
    }

    if (!pair) throw new Error("No pair data available");

    const volume = pair.volume?.h24;
    const price = pair.priceUsd;

    const priceEl = document.getElementById("priceData");
    const volEl   = document.getElementById("volumeData");
    if (priceEl) priceEl.textContent = formatUsdPrice(price);
    if (volEl)   volEl.textContent   = formatUsdVolume(volume);

    localStorage.setItem("cachedPrice", String(price ?? ""));
    localStorage.setItem("cachedVolume", String(volume ?? ""));
    localStorage.setItem("cachedTimestamp", new Date().toISOString());
  } catch (err) {
    console.error("Dex fetch error:", err);
    const cachedPrice = localStorage.getItem("cachedPrice");
    const cachedVolume = localStorage.getItem("cachedVolume");
    const cachedTimestamp = localStorage.getItem("cachedTimestamp");

    const priceEl = document.getElementById("priceData");
    const volEl   = document.getElementById("volumeData");

    if (cachedPrice && cachedVolume) {
      if (priceEl) priceEl.textContent = `${formatUsdPrice(cachedPrice)} (cached)`;
      if (volEl)   volEl.textContent   = `${formatUsdVolume(cachedVolume)} (cached)`;
      console.log(`Showing cached data from ${cachedTimestamp}`);
    } else {
      if (priceEl) priceEl.textContent = "N/A";
      if (volEl)   volEl.textContent   = "N/A";
    }
  }
}

function openPancakeSwap() {
  window.open(
    `https://pancakeswap.finance/swap?outputCurrency=${tokenAddress}`,
    "_blank",
    "noopener"
  );
}

// --- Mobile navigation drawer ---
function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const scrim = document.getElementById("navScrim");
  const nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (scrim) {
      if (open) scrim.removeAttribute("hidden");
      else scrim.setAttribute("hidden", "");
    }
  };

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("nav-open"));
  });

  if (scrim) {
    scrim.addEventListener("click", () => setOpen(false));
  }

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 901px)").matches) setOpen(false);
  });
}

// --- Wire up buttons safely ---
window.addEventListener("load", () => {
  initMobileNav();

  let intervalId = null;

  const startPolling = () => {
    if (intervalId != null) return;
    fetchDexVolumeData();
    intervalId = setInterval(fetchDexVolumeData, 60_000);
  };

  const stopPolling = () => {
    if (intervalId == null) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  // Only poll market data when ticker elements exist (home page)
  if (document.getElementById("priceData") || document.getElementById("volumeData")) {
    startPolling();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPolling();
      else startPolling();
    });
  }

  const connectBtn = document.getElementById("connectMetaMaskButton");
  const addBtn     = document.getElementById("importTokenButton");
  const buyBtn     = document.getElementById("buyGccPancakeSwapButton");
  const buyBtnMobile = document.getElementById("buyGccPancakeSwapButtonMobile");
  const copyBtn    = document.getElementById("copyTokenButton");

  if (connectBtn) connectBtn.addEventListener("click", connectMetaMask);
  if (addBtn)     addBtn.addEventListener("click", addTokenToMetaMask);
  if (buyBtn)     buyBtn.addEventListener("click", openPancakeSwap);
  if (buyBtnMobile) buyBtnMobile.addEventListener("click", openPancakeSwap);

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(tokenAddress);
        const prev = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(() => { copyBtn.textContent = prev; }, 1600);
      } catch {
        alert(`Failed to copy. Please copy manually: ${tokenAddress}`);
      }
    });
  }
});

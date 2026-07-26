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

// Canonical production host for MetaMask in-app browser deeplinks.
// MetaMask cannot open localhost — when the page is already on a public
// https origin we prefer that so previews (Vercel, custom domains) work.
const DAPP_FALLBACK_HOST = "www.goldcondor.info";

// --- Helpers ---
const isMobileUA = () =>
  /iPhone|iPad|iPod|Android|Mobile|CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isLocalHost = (hostname) =>
  !hostname ||
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.endsWith(".local");

/**
 * Host (+ optional path) MetaMask should open in its in-app browser.
 * Official format uses host without scheme, e.g. app.uniswap.org
 * @see https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/
 */
function getDappUrlForMetaMask() {
  try {
    const { hostname, pathname, search } = window.location;
    if (!isLocalHost(hostname) && window.location.protocol === "https:") {
      const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
      return `${hostname}${path}${search || ""}`;
    }
  } catch (_) {
    /* ignore */
  }
  return DAPP_FALLBACK_HOST;
}

/**
 * Build MetaMask mobile deeplink that opens this dapp inside MM's browser.
 * Do NOT encodeURIComponent the whole URL — that breaks path parsing.
 * Prefer the official link.metamask.io host (metamask.app.link still works as Branch alias).
 */
function mmDappDeeplink(dappUrl = getDappUrlForMetaMask()) {
  const cleaned = String(dappUrl)
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  return `https://link.metamask.io/dapp/${cleaned}`;
}

function hasInjectedProvider() {
  return Boolean(window.ethereum);
}

function isMetaMaskProvider() {
  const eth = window.ethereum;
  if (!eth) return false;
  if (eth.isMetaMask) return true;
  if (Array.isArray(eth.providers)) {
    return eth.providers.some((p) => p && p.isMetaMask);
  }
  return false;
}

function getMetaMaskProvider() {
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.isMetaMask && !eth.providers) return eth;
  if (Array.isArray(eth.providers)) {
    return eth.providers.find((p) => p && p.isMetaMask) || eth;
  }
  return eth;
}

const BSC_PARAMS = {
  chainId: "0x38",
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

async function ensureBsc(provider = getMetaMaskProvider()) {
  if (!provider) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_PARAMS.chainId }],
    });
  } catch (err) {
    if (err && err.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BSC_PARAMS],
      });
    }
  }
}

function shortAddress(addr) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function setConnectButtonState(label, connected) {
  const btn = document.getElementById("connectMetaMaskButton");
  if (!btn) return;
  btn.textContent = label;
  btn.classList.toggle("btn--primary", Boolean(connected));
  btn.classList.toggle("btn--outline", !connected);
  if (connected) btn.setAttribute("aria-pressed", "true");
  else btn.removeAttribute("aria-pressed");
}

/**
 * Open this site inside MetaMask's in-app browser (mobile only path).
 * Must stay inside a user gesture (click) for iOS Safari.
 */
function openInMetaMaskBrowser() {
  const link = mmDappDeeplink();
  // Full navigation keeps the click-gesture chain intact on iOS.
  window.location.href = link;
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
    const provider = getMetaMaskProvider();

    // Desktop extension OR already inside MetaMask / another injected wallet
    if (provider) {
      await ensureBsc(provider);
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const a0 = accounts?.[0];
      console.log("Connected wallet:", a0);
      if (a0) {
        setConnectButtonState(shortAddress(a0), true);
      }
      return;
    }

    // Mobile Safari/Chrome without injected provider → open in MetaMask browser
    if (isMobileUA()) {
      openInMetaMaskBrowser();
      return;
    }

    alert("MetaMask is not detected. Please install it from https://metamask.io/download/");
  } catch (err) {
    // User rejected request
    if (err && (err.code === 4001 || err.code === "ACTION_REJECTED")) {
      console.info("User rejected wallet connection");
      return;
    }
    console.error("MetaMask connection error:", err);
    // Mobile fallback if injected provider misbehaves
    if (isMobileUA() && !isMetaMaskProvider()) {
      openInMetaMaskBrowser();
      return;
    }
    alert("Connection failed. Please try again.");
  }
}

async function addTokenToMetaMask() {
  const provider = getMetaMaskProvider();

  // On mobile outside MetaMask, open the dapp in-app so watchAsset can run there
  if (!provider) {
    if (isMobileUA()) {
      openInMetaMaskBrowser();
      return;
    }
    alert("MetaMask not detected. Install it from https://metamask.io/download/");
    return;
  }

  try {
    await ensureBsc(provider);
    const wasAdded = await provider.request({
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
    if (wasAdded) {
      const addBtn = document.getElementById("importTokenButton");
      if (addBtn) {
        const prev = addBtn.textContent;
        addBtn.textContent = "GCC added";
        setTimeout(() => { addBtn.textContent = prev; }, 2000);
      }
    }
  } catch (err) {
    if (err && (err.code === 4001 || err.code === "ACTION_REJECTED")) return;
    console.error("Add token error:", err);
    alert(err?.message || "Unable to add token.");
  }
}

/** Silent reconnect if the user already authorized this origin */
async function trySilentConnect() {
  const provider = getMetaMaskProvider();
  if (!provider) return;
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts?.[0]) setConnectButtonState(shortAddress(accounts[0]), true);
  } catch (_) {
    /* ignore */
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
  const openMmBtn  = document.getElementById("openInMetaMaskButton");
  const copyBtn    = document.getElementById("copyTokenButton");

  if (connectBtn) connectBtn.addEventListener("click", connectMetaMask);
  if (addBtn)     addBtn.addEventListener("click", addTokenToMetaMask);
  if (buyBtn)     buyBtn.addEventListener("click", openPancakeSwap);
  if (buyBtnMobile) buyBtnMobile.addEventListener("click", openPancakeSwap);
  if (openMmBtn)  openMmBtn.addEventListener("click", openInMetaMaskBrowser);

  // Show explicit "Open in MetaMask" only on mobile browsers without a provider
  if (openMmBtn) {
    const showOpenMm = isMobileUA() && !hasInjectedProvider();
    openMmBtn.hidden = !showOpenMm;
    openMmBtn.setAttribute("aria-hidden", showOpenMm ? "false" : "true");
  }

  trySilentConnect();

  // Expose for manual verification in DevTools:
  //   GCC_MM.deeplink()  → full MetaMask deeplink string
  //   GCC_MM.dappUrl()   → host path sent to MetaMask
  window.GCC_MM = {
    dappUrl: getDappUrlForMetaMask,
    deeplink: mmDappDeeplink,
    isMobile: isMobileUA,
    hasProvider: hasInjectedProvider,
    isMetaMask: isMetaMaskProvider,
    open: openInMetaMaskBrowser,
  };

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

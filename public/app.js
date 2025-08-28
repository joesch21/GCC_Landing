// --- Constants ---
const tokenAddress  = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol   = "GCC";
const tokenDecimals = 18;
const tokenImage    = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";

const dexscreenerApi = "https://api.dexscreener.com/latest/dex/pairs/bsc/0x3d32d359bdad07C587a52F8811027675E4f5A833";

// Your public site URL for deeplinking into MetaMask mobile
const dappPublicUrl = "https://www.gcc-bsc.online"; // must include protocol

// --- Helpers ---
const isMobileUA = () => /iPhone|iPad|iPod|Android|Mobile|CriOS/i.test(navigator.userAgent);
const mmDeeplink = (url) => `https://metamask.app.link/dapp/${encodeURIComponent(url)}`;

// Optional: ensure BSC on desktop before connect (comment out if you don’t want it)
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
    } // else ignore and let user switch manually
  }
}

// --- Wallet actions ---
async function connectMetaMask() {
  try {
    const isMobile = isMobileUA();

    if (window.ethereum) {
      await ensureBsc(); // optional
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const a0 = accounts?.[0];
      console.log("Connected wallet:", a0);
      alert(`Connected wallet: ${a0}`);
      return;
    }

    if (isMobile) {
      // Keep this inside the click handler for iOS/Safari
      alert("You’ll now be redirected to MetaMask to connect your wallet.");
      const link = mmDeeplink(dappPublicUrl);
      // Primary path: open MetaMask in-app browser on mobile
      window.location.href = link;

      // Soft fallback if MetaMask not installed / deeplink blocked
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
    await ensureBsc(); // optional
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
    const res = await fetch(dexscreenerApi, { cache: "no-store" });
    if (!res.ok) throw new Error(`DexScreener HTTP ${res.status}`);
    const data = await res.json();

    const pair = data?.pairs?.[0];
    if (!pair) throw new Error("No pair data available");

    const volume = pair.volume?.h24;
    const price = pair.priceUsd;

    const priceEl = document.getElementById("priceData");
    const volEl   = document.getElementById("volumeData");
    if (priceEl) priceEl.textContent = `$${parseFloat(price).toFixed(4)}`;
    if (volEl)   volEl.textContent   = `$${parseFloat(volume).toLocaleString()}`;

    localStorage.setItem("cachedPrice", price);
    localStorage.setItem("cachedVolume", volume);
    localStorage.setItem("cachedTimestamp", new Date().toISOString());
  } catch (err) {
    console.error("Dex fetch error:", err);
    const cachedPrice = localStorage.getItem("cachedPrice");
    const cachedVolume = localStorage.getItem("cachedVolume");
    const cachedTimestamp = localStorage.getItem("cachedTimestamp");

    const priceEl = document.getElementById("priceData");
    const volEl   = document.getElementById("volumeData");

    if (cachedPrice && cachedVolume) {
      if (priceEl) priceEl.textContent = `$${parseFloat(cachedPrice).toFixed(4)} (cached)`;
      if (volEl)   volEl.textContent   = `$${parseFloat(cachedVolume).toLocaleString()} (cached)`;
      console.log(`Showing cached data from ${cachedTimestamp}`);
    } else {
      if (priceEl) priceEl.textContent = "N/A";
      if (volEl)   volEl.textContent   = "N/A";
    }
  }
}

// --- Wire up buttons safely ---
window.addEventListener("load", () => {
  // initial + refresh every 60s
  fetchDexVolumeData();
  const intervalId = setInterval(fetchDexVolumeData, 60_000);
  // Optional: clear on visibility change if you want to pause in background
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearInterval(intervalId); }
  });

  const connectBtn = document.getElementById("connectMetaMaskButton");
  const addBtn     = document.getElementById("importTokenButton");
  const buyBtn     = document.getElementById("buyGccPancakeSwapButton");
  const copyBtn    = document.getElementById("copyTokenButton");

  if (connectBtn) connectBtn.addEventListener("click", connectMetaMask);
  if (addBtn)     addBtn.addEventListener("click", addTokenToMetaMask);

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      window.open(
        `https://pancakeswap.finance/swap?outputCurrency=${tokenAddress}`,
        "_blank",
        "noopener"
      );
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(tokenAddress);
        alert("GCC token address copied! Paste it into ApeBond to swap.");
      } catch {
        alert(`Failed to copy. Please copy manually: ${tokenAddress}`);
      }
    });
  }
});

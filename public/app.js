const tokenAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol = "GCC";
const tokenDecimals = 18;
const tokenImage = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";
const dexscreenerApi = `https://api.dexscreener.com/latest/dex/pairs/bsc/0x3d32d359bdad07C587a52F8811027675E4f5A833`;

async function connectMetaMask() {
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Connected wallet:", accounts[0]);
      alert(`Connected wallet: ${accounts[0]}`);
    } else if (isMobile) {
      // OPTIONAL: Show prompt first, or redirect directly below
      alert("You’ll now be redirected to MetaMask to connect your wallet.");

      const dappDomain = "www.gcc-bsc.online"; // ← your real domain
      window.location.href = `https://metamask.app.link/dapp/${dappDomain}`;
    } else {
      alert('MetaMask is not detected. Please install it from https://metamask.io');
    }
  } catch (err) {
    console.error("MetaMask connection error:", err);
    alert("Connection failed. Please try again.");
  }
}




async function addTokenToMetaMask() {
  if (window.ethereum) {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage
          }
        }
      });
      alert(wasAdded ? 'Token added!' : 'Token addition declined.');
    } catch (err) {
      console.error("Add token error:", err);
    }
  }
}

async function fetchDexVolumeData() {
  try {
    const res = await fetch(dexscreenerApi);
    const data = await res.json();

    if (!data.pairs || !data.pairs[0]) throw new Error("No pair data available");

    const volume = data.pairs[0].volume?.h24;
    const price = data.pairs[0].priceUsd;

    // ✅ Display fetched price
    document.getElementById("priceData").textContent = `$${parseFloat(price).toFixed(4)}`;
    document.getElementById("volumeData").textContent = `$${parseFloat(volume).toLocaleString()}`;

    // ✅ Save fetched price to localStorage
    localStorage.setItem("cachedPrice", price);
    localStorage.setItem("cachedVolume", volume);
    localStorage.setItem("cachedTimestamp", new Date().toISOString());

  } catch (err) {
    console.error("Dex fetch error:", err);

    // ✅ If fetch fails, use cached price
    const cachedPrice = localStorage.getItem("cachedPrice");
    const cachedVolume = localStorage.getItem("cachedVolume");
    const cachedTimestamp = localStorage.getItem("cachedTimestamp");

    if (cachedPrice && cachedVolume) {
      document.getElementById("priceData").textContent = `$${parseFloat(cachedPrice).toFixed(4)} (cached)`;
      document.getElementById("volumeData").textContent = `$${parseFloat(cachedVolume).toLocaleString()} (cached)`;
      console.log(`Showing cached data from ${cachedTimestamp}`);
    } else {
      document.getElementById("priceData").textContent = "N/A";
      document.getElementById("volumeData").textContent = "N/A";
    }
  }
}



// Event listeners
window.addEventListener("load", fetchDexVolumeData);
setInterval(fetchDexVolumeData, 60000);

document.getElementById("connectMetaMaskButton").addEventListener("click", connectMetaMask);
document.getElementById("importTokenButton").addEventListener("click", addTokenToMetaMask);
document.getElementById("buyGccPancakeSwapButton").addEventListener("click", () => {
  window.open("https://pancakeswap.finance/swap?outputCurrency=0x092ac429b9c3450c9909433eb0662c3b7c13cf9a", "_blank");
});
document.getElementById("copyTokenButton").addEventListener("click", () => {
  const gccAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
  navigator.clipboard.writeText(gccAddress)
    .then(() => alert("GCC token address copied! Paste it into Ape.bond to swap."))
    .catch(() => alert("Failed to copy. Please try manually."));
});


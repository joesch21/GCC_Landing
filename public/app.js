const tokenAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol = "GCC";
const tokenDecimals = 18;
const tokenImage = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";
const dexscreenerApi = `https://api.dexscreener.com/latest/dex/pairs/bsc/0x3d32d359bdad07C587a52F8811027675E4f5A833`;

async function connectMetaMask() {
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Connected wallet:", accounts[0]);
    } else {
      alert('MetaMask not detected. Please install it.');
    }
  } catch (err) {
    console.error("MetaMask connection error:", err);
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
    const volume = data.pairs[0]?.volume?.h24;
    const price = data.pairs[0]?.priceUsd;

    document.getElementById("priceData").textContent = `$${parseFloat(price).toFixed(4)}`;
    document.getElementById("volumeData").textContent = `$${parseFloat(volume).toLocaleString()}`;
  } catch (err) {
    console.error("Dex fetch error:", err);
    document.getElementById("priceData").textContent = "Error";
    document.getElementById("volumeData").textContent = "Error";
  }
}

// Event listeners
window.addEventListener("load", fetchDexVolumeData);
setInterval(fetchDexVolumeData, 60000);

document.getElementById("connectMetaMaskButton").addEventListener("click", connectMetaMask);
document.getElementById("importTokenButton").addEventListener("click", addTokenToMetaMask);
document.getElementById("buyGccMatcha").addEventListener("click", () => {
  window.open("https://matcha.xyz/token/bsc/0x092ac429b9c3450c9909433eb0662c3b7c13cf9a", "_blank");
});
document.getElementById("buyGccPancakeSwapButton").addEventListener("click", () => {
  window.open("https://pancakeswap.finance/swap?outputCurrency=0x092ac429b9c3450c9909433eb0662c3b7c13cf9a", "_blank");
});

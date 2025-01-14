const tokenAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol = "GCC";
const tokenDecimals = 18;
const tokenImage = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";
const pairAddress = "0x3d32d359bdad07C587a52F8811027675E4f5A833";
const chainId = "bsc"; // Correct chain ID for Binance Smart Chain
const dexscreenerApi = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

// Detect if the device is mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * Connects MetaMask for both desktop and mobile users.
 */
async function connectMetaMask() {
    try {
        if (window.ethereum && window.ethereum.isMetaMask) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            console.log("Connected with:", accounts[0]);
            document.getElementById('importTokenButton').style.display = 'inline-block';
        } else if (isMobile) {
            window.location.href = "https://metamask.app.link/dapp/dapp-condor.vercel.app";
        } else {
            alert('MetaMask not detected. Please install MetaMask.');
            window.open('https://metamask.io/download.html', '_blank');
        }
    } catch (error) {
        console.error("MetaMask connection error:", error);
    }
}

/**
 * Adds the GCC token to MetaMask wallet.
 */
async function addTokenToMetaMask() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenAddress,
                        symbol: tokenSymbol,
                        decimals: tokenDecimals,
                        image: tokenImage,
                    },
                },
            });
            wasAdded ? alert("Token successfully added!") : alert("Token addition declined.");
        } else {
            alert('MetaMask is required to add tokens.');
        }
    } catch (error) {
        console.error("Error adding token:", error);
    }
}

/**
 * Fetches the GCC token price and volume from Dexscreener API using the correct endpoint.
 */
async function fetchDexVolumeData() {
    try {
        const response = await fetch(dexscreenerApi);
        if (!response.ok) throw new Error("Failed to fetch volume data");

        const data = await response.json();
        const volume24h = data.pairs[0]?.volume.h24;
        const priceUsd = data.pairs[0]?.priceUsd;

        // ✅ Update the HTML elements with price and volume
        document.getElementById("volumeData").textContent = `$${Number(volume24h).toLocaleString()}`;
        document.getElementById("priceData").textContent = `$${Number(priceUsd).toFixed(4)}`;
        console.log("Volume and price fetched successfully:", volume24h, priceUsd);
    } catch (error) {
        console.error("Error fetching volume data:", error);
        document.getElementById("volumeData").textContent = "Error loading volume";
        document.getElementById("priceData").textContent = "Error loading price";
    }
}

/**
 * Event Listeners for Buttons and Actions
 */
document.getElementById('connectMetaMaskButton').addEventListener('click', connectMetaMask);
document.getElementById('importTokenButton').addEventListener('click', addTokenToMetaMask);
document.getElementById('buyGccCoinBrainButton').addEventListener('click', () => {
    window.open('https://coinbrain.com/coins/bnb-0x092ac429b9c3450c9909433eb0662c3b7c13cf9a', '_blank');
});
document.getElementById('buyGccPancakeSwapButton').addEventListener('click', () => {
    window.open('https://pancakeswap.finance/swap?outputCurrency=0x092ac429b9c3450c9909433eb0662c3b7c13cf9a', '_blank');
});

// Mobile-specific handling for MetaMask redirection
document.getElementById('openInMetaMask').addEventListener('click', function(event) {
    event.preventDefault();
    if (isMobile) {
        window.location.href = "https://metamask.app.link/dapp/dapp-condor.vercel.app";
    } else {
        alert("This feature is for mobile devices only.");
    }
});

/**
 * ✅ Fetch Dex Volume Data Immediately + Check Again on Page Load
 */
fetchDexVolumeData(); // Fetch immediately
window.addEventListener('load', fetchDexVolumeData); // Secondary check on full page load

// ✅ Optional: Auto-refresh every minute
setInterval(fetchDexVolumeData, 60000); 

const tokenAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol = "GCC";
const tokenDecimals = 18;
const tokenImage = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";

// Detect if the device is mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

async function addTokenToMetaMask() {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      // Request the user to connect their wallet
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // 'wasAdded' is a boolean. Like any RPC method, an error can be thrown.
      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            // The address of the token.
            address: tokenAddress,
            // A ticker symbol or shorthand, up to 5 characters.
            symbol: tokenSymbol,
            // The number of decimals in the token.
            decimals: tokenDecimals,
            // A string URL of the token logo.
            image: tokenImage,
          },
        },
      });

      if (wasAdded) {
        console.log("Token was added successfully!");
        alert("GCC token added to MetaMask successfully!");
      } else {
        console.log("Token addition was declined.");
        alert("Token addition was declined.");
      }
    } else if (isMobile) {
      // Handle mobile case
      alert("MetaMask is not installed. Redirecting to MetaMask download page...");
      window.location.href = "https://metamask.app.link/dapp/dapp-condor.vercel.app";
    } else {
      console.log("MetaMask is not installed.");
      alert("MetaMask is not installed. Please install MetaMask and try again.");
      window.open('https://metamask.io/download.html', '_blank');
    }
  } catch (error) {
    console.error("An error occurred:", error);
    alert("An error occurred. Please try again.");
  }
}

// Add event listener to the button
document.getElementById('addTokenButton').addEventListener('click', addTokenToMetaMask);

// Handle opening the website in MetaMask browser on mobile
document.getElementById('openInMetaMask').addEventListener('click', function(event) {
  event.preventDefault();
  if (isMobile) {
    window.location.href = "https://metamask.app.link/dapp/dapp-condor.vercel.app";
  } else {
    alert("This option is only available on mobile devices.");
  }
});

// Function to fetch the current price of GCC and update the HTML
async function fetchGccPrice() {
  try {
    const response = await fetch('https://api.example.com/gcc-price'); // Replace with actual API endpoint
    const data = await response.json();
    document.getElementById('gccPrice').textContent = `$${data.price.toFixed(2)}`;
  } catch (error) {
    console.error("An error occurred while fetching the GCC price:", error);
  }
}

// Fetch the current price of GCC when the page loads
window.addEventListener('load', fetchGccPrice);

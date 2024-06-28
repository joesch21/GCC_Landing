const tokenAddress = "0x092ac429b9c3450c9909433eb0662c3b7c13cf9a";
const tokenSymbol = "GCC";
const tokenDecimals = 18;
const tokenImage = "https://storage.top100token.com/images/fe7c179d-bfa8-4d49-a460-ca87ca248167.webp";

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

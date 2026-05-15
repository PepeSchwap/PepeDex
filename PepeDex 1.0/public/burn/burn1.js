const factoryAddress = "0x26594d3F4c172554A30D06e8fDc59229B860eAb0";
const burnLpAddress = "0x68b3951fd3d0Ed3E2d2998125aCFC56D98Fea17E";
const primaryRpcUrl = "https://rpc.pulsechain.com";
const backupRpcUrl = "https://rpc-pulsechain.g4mm4.io";
let provider, signer;
let retryAttempts = 3;

document.addEventListener("DOMContentLoaded", () => {
  // Automatically fetch LP data as soon as the page loads
  fetchLpData();
});

document.getElementById('connectWallet').addEventListener('click', async () => {
  if (!window.ethereum) {
    showPopup("💾 💾 💾", "A wallet is required.");
    return;
  }

  // Connect wallet and enable interactions
  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const walletAddress = await signer.getAddress();
  document.getElementById("walletAddress").textContent = `Connected: ${shortenAddress(walletAddress)}`;

  document.getElementById("connectWallet").hidden = true;

  // You can call other wallet-dependent functions here if needed
});

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function setUpProvider(rpcUrl) {
  try {
    const backupProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const blockNumber = await backupProvider.getBlockNumber();
    console.log(`Connected to RPC provider: ${rpcUrl}, Block number: ${blockNumber}`);
    return backupProvider;
  } catch (error) {
    console.error(`Failed to connect to RPC at ${rpcUrl}:`, error);
    throw new Error(`Unable to connect to RPC provider: ${rpcUrl}`);
  }
}

let reverseOrder = false;
let currentPage = 1;
const pageSize = 20;
let totalPairs = 0;

function toggleOrder() {
  reverseOrder = !reverseOrder;
  currentPage = 1;
  fetchLpData();
}

async function fetchLpData() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const table = document.getElementById("lpTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  loadingIndicator.style.display = "block";

  try {
    provider = await tryFetchingWithBackoff(primaryRpcUrl);
    if (!provider) {
      provider = await tryFetchingWithBackoff(backupRpcUrl);
    }

    const factoryAbi = [
      "function allPairsLength() view returns (uint256)",
      "function allPairs(uint256) view returns (address)"
    ];
    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);

    totalPairs = await factoryContract.allPairsLength();

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalPairs);

    let foundPairs = false;

    const promises = [];
    if (reverseOrder) {
      for (let i = totalPairs - 1 - startIndex; i >= totalPairs - endIndex; i--) {
        promises.push(fetchAndCreateRow(factoryContract, i));
      }
    } else {
      for (let i = startIndex; i < endIndex; i++) {
        promises.push(fetchAndCreateRow(factoryContract, i));
      }
    }

    const results = await Promise.all(promises);
    results.forEach(row => {
      if (row) {
        tbody.appendChild(row);
        foundPairs = true;
      }
    });

    if (!foundPairs) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="3">No LP pairs found</td>`;
      tbody.appendChild(row);
    }

    updatePagination();
  } catch (error) {
    console.error("Error fetching LP data:", error);
    showPopup("💾 💾 💾", "Error fetching LP data.");
  } finally {
    loadingIndicator.style.display = "none";
  }
}

function updatePagination() {
  const prevButton = document.getElementById("prevPage");
  const nextButton = document.getElementById("nextPage");

  const totalPages = Math.ceil(totalPairs / pageSize);

  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;

  prevButton.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      fetchLpData();
    }
  };

  nextButton.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchLpData();
    }
  };
}

async function tryFetchingWithBackoff(rpcUrl) {
  let attempts = 0;
  let provider = null;

  while (attempts < retryAttempts && provider === null) {
    try {
      provider = await setUpProvider(rpcUrl);
    } catch (error) {
      attempts++;
      const delay = Math.pow(2, attempts) * 500;
      console.log(`Retrying in ${delay / 500}s... Attempt #${attempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (provider === null) {
    showPopup("💾 💾 💾", `Failed to connect to RPC provider after ${retryAttempts} attempts.`);
  }

  return provider;
}

async function fetchAndCreateRow(factoryContract, i) {
  const lpAddress = await factoryContract.allPairs(i);
  const pairData = await getLpPairData(lpAddress);

  if (pairData.balance > 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${pairData.token0Symbol}/${pairData.token1Symbol}</td>
      <td>${pairData.balance}</td>
      <td>
        <button onclick="burnLp('${pairData.token0}', '${pairData.token1}')">Burn</button>
      </td>
    `;
    return row;
  }
  return null;
}

async function getLpPairData(lpAddress) {
  try {
    const abi = [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function balanceOf(address owner) view returns (uint256)"
    ];
    const lpContract = new ethers.Contract(lpAddress, abi, provider);

    const token0 = await lpContract.token0();
    const token1 = await lpContract.token1();
    const balance = await getLpBalance(lpAddress);

    const token0Symbol = await getTokenSymbol(token0);
    const token1Symbol = await getTokenSymbol(token1);

    return { token0, token1, balance, token0Symbol, token1Symbol };
  } catch (error) {
    console.error(`Error fetching pair data for ${lpAddress}:`, error);
    return { token0: "Error", token1: "Error", balance: 0, token0Symbol: "Error", token1Symbol: "Error" };
  }
}

async function getTokenSymbol(tokenAddress) {
  const abi = ["function symbol() view returns (string)"];
  const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
  return await tokenContract.symbol();
}

async function getLpBalance(lpAddress) {
  try {
    const abi = ["function balanceOf(address owner) view returns (uint256)"];
    const lpContract = new ethers.Contract(lpAddress, abi, provider);
    const balance = await lpContract.balanceOf(burnLpAddress);
    return ethers.utils.formatUnits(balance, 18);
  } catch (error) {
    console.error(`Error fetching balance for LP ${lpAddress}:`, error);
    return 0;
  }
}

async function burnLp(token0, token1) {
  try {
    console.log(`Attempting to burn LP for tokens ${token0} and ${token1}`);

    const abi = [
      {
        "inputs": [
          { "internalType": "address[]", "name": "tokens0", "type": "address[]" },
          { "internalType": "address[]", "name": "tokens1", "type": "address[]" }
        ],
        "name": "convertLps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    const burnContract = new ethers.Contract(burnLpAddress, abi, signer);
    const tx = await burnContract.convertLps([token0], [token1]);
    const txLink = `https://dextop.pro/scan/#/tx/${tx.hash}`;
    await tx.wait();
    showPopup("Burn 💾 Success!", `Burn successful! <a href="${txLink}" target="_blank">BlockScan</a>`);
    fetchLpData();
  } catch (error) {
    console.error("Error burning LP tokens:", error);
    const errorMessage = error?.data?.message || error.message || "An error occurred during the transaction.";
    showPopup("💾 💾 💾", errorMessage);
  }
}

function showPopup(title, message) {
  const popup = document.getElementById("popup");
  popup.querySelector(".popup-title").textContent = title;
  popup.querySelector(".popup-message").innerHTML = message;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 8000);
}

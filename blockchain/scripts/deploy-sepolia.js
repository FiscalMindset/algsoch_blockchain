const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Sepolia testnet...");
  console.log("Deployer address:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  const AgentSwarmEscrow = await ethers.getContractFactory("AgentSwarmEscrow");
  const contract = await AgentSwarmEscrow.deploy();

  console.log("Deploying contract...");
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("Contract deployed to:", deployedAddress);

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contractAddress: deployedAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", outputPath);

  console.log("\nTo use this contract:");
  console.log("1. Update frontend/src/utils/contracts.js with the address:", deployedAddress);
  console.log("2. Update backend/.env with SEPOLIA_CONTRACT_ADDRESS=" + deployedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
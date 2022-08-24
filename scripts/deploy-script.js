const hre = require("hardhat");

async function main() {

  // Get deployer accounts
  [user_1, user_2, user_3] = await ethers.getSigners();
  console.log(`Deploying contract with the account: ${user_1.address}`);

  // Deploying RewardsPool contract
  const RewardsPool = await hre.ethers.getContractFactory("RewardsPool");
  const rewardsPool = await RewardsPool.deploy();
  await rewardsPool.deployed();
  console.log("RewardsPool deployed to :", rewardsPool.address);

  // Deploying UtilityManager contract
  const UtilityManager = await hre.ethers.getContractFactory("UtilityManager");
  const utilityManager = await UtilityManager.deploy();
  await utilityManager.deployed();
  console.log("UtilityManager deployed to :", utilityManager.address);

  // Deploying FossilToken contract
  const FossilToken = await hre.ethers.getContractFactory("FossilToken");
  const fossilToken = await FossilToken.deploy("Fossil", "FOS", "1000000000000000000000000000", utilityManager.address);
  await fossilToken.deployed();
  console.log("FossilToken deployed to :", fossilToken.address);

  // Deploying DinoToken contract
  const DinoToken = await hre.ethers.getContractFactory("DinoToken");
  const dinoToken = await DinoToken.deploy("https://dinotoken/");
  await dinoToken.deployed();
  console.log("DinoToken deployed to :", dinoToken.address);

  // Deploying DinoPool contract
  const DinoPool = await hre.ethers.getContractFactory("DinoPool");
  const dinoPool = await DinoPool.deploy(
    "Staked Dino Token",
    "SDT",
    dinoToken.address,
    fossilToken.address,
    "1000000000000000000",
    "31536000",
    utilityManager.address,
    rewardsPool.address,
    dinoToken.address
  );
  await dinoPool.deployed();
  console.log("DinoPool deployed to :", dinoPool.address);

  // Deploying LiquidityMiningManager contract
  const LiquidityMiningManager = await hre.ethers.getContractFactory("LiquidityMiningManager");
  const liquidityMiningManager = await LiquidityMiningManager.deploy(fossilToken.address, user_1.address, utilityManager.address);
  await liquidityMiningManager.deployed();
  console.log("LiquidityMiningManager deployed to :", liquidityMiningManager.address);

  // Set contract addresses of Rewards Pool
  await rewardsPool.setContractAddresses(dinoPool.address, fossilToken.address);

  // Set contract addresses of Utility Manager and pending rewards
  await utilityManager.setContractAddress(fossilToken.address, dinoPool.address, liquidityMiningManager.address);
  let supply = await fossilToken.totalSupply();
  await utilityManager.updatePendingRewards(supply, 1);

  // Grant roles, add pool, set reward per second and approval from Fossil Token contract
  let govRole = await liquidityMiningManager.GOV_ROLE();
  let distributorRole = await liquidityMiningManager.REWARD_DISTRIBUTOR_ROLE();
  await liquidityMiningManager.grantRole(govRole, user_1.address);
  await liquidityMiningManager.grantRole(distributorRole, user_1.address);
  await liquidityMiningManager.addPool(dinoPool.address, "100");
  await liquidityMiningManager.setRewardPerSecond("500000000000000");
  await fossilToken.approve(liquidityMiningManager.address, supply);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

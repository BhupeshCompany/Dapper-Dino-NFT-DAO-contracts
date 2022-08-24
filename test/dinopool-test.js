const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DinoPool Testcases : ", function () {

    let utilityManager;
    let fossilToken;
    let liquidityMiningManager;
    let dinoToken;
    let dinoPool;
    let rewardsPool;

    before(async () => {
        [user_1, user_2, user_3] = await ethers.getSigners();
        console.log(`Deploying contract with the account: ${user_1.address}`);
    });

    // ------------------------------- Deploying Contracts -----------------------------------------

    it("Should deploy UtilityManager contract", async function () {
        const UtilityManager = await ethers.getContractFactory("UtilityManager");
        utilityManager = await UtilityManager.deploy();
        await utilityManager.deployed();
        console.log("UtilityManager contract deployed at : ", utilityManager.address);
    });

    it("Should deploy RewardsPool contract", async function () {
        const RewardsPool = await ethers.getContractFactory("RewardsPool");
        rewardsPool = await RewardsPool.deploy();
        await rewardsPool.deployed();
        console.log("RewardsPool contract deployed at : ", rewardsPool.address);
    });

    it("Should deploy FossilToken contract", async function () {
        const FossilToken = await ethers.getContractFactory("FossilToken");
        fossilToken = await FossilToken.deploy("Fossil", "FOS", "1000000000000000000000000000", utilityManager.address);
        await fossilToken.deployed();
        console.log("FossilToken contract deployed at : ", fossilToken.address);
    });

    it("Should deploy DinoToken contract", async function () {
        const DinoToken = await ethers.getContractFactory("DinoToken");
        dinoToken = await DinoToken.deploy("https://dinotoken/");
        await dinoToken.deployed();
        console.log("DinoToken contract deployed at : ", dinoToken.address);
    });

    it("Should deploy LiquidityMiningManager contract", async function () {
        const LiquidityMiningManager = await ethers.getContractFactory("LiquidityMiningManager");
        liquidityMiningManager = await LiquidityMiningManager.deploy(fossilToken.address, user_1.address, utilityManager.address);
        await liquidityMiningManager.deployed();
        console.log("LiquidityMiningManager contract deployed at : ", liquidityMiningManager.address);
    });

    it("Should deploy DinoPool contract", async function () {
        const DinoPool = await ethers.getContractFactory("DinoPool");
        dinoPool = await DinoPool.deploy(
            "Staked Dino Token",
            "SDT",
            dinoToken.address,
            fossilToken.address,
            "1000000000000000000",
            "660",
            utilityManager.address,
            rewardsPool.address,
            dinoToken.address
        );
        await dinoPool.deployed();
        console.log("DinoPool contract deployed at : ", dinoPool.address);
    });

    // ----------------------- Initialize UtilityManager -----------------------------------

    it("Should initialize UtilityManager values", async function () {
        await utilityManager.setContractAddress(fossilToken.address, dinoPool.address, liquidityMiningManager.address);
        let supply = await fossilToken.totalSupply();
        await utilityManager.updatePendingRewards(supply,1);
    });

    // ----------------------- Initialize RewardsPool -----------------------------------

    it("Should initialize RewardsPool values", async function () {
        await rewardsPool.setContractAddresses(dinoPool.address, fossilToken.address);
    });

    // ----------------------- Initialize LiquidityMiningManager -----------------------------------

    it("Should initialize LiquidityMiningManager values", async function () {
        let govRole = await liquidityMiningManager.GOV_ROLE();
        let distributorRole = await liquidityMiningManager.REWARD_DISTRIBUTOR_ROLE();
        await liquidityMiningManager.grantRole(govRole, user_1.address);
        await liquidityMiningManager.grantRole(distributorRole, user_1.address);
        await liquidityMiningManager.addPool(dinoPool.address, "100");
        await liquidityMiningManager.setRewardPerSecond("500000000000000");
        let supply = await fossilToken.totalSupply();
        await fossilToken.approve(liquidityMiningManager.address, supply);
    });

    // --------------------------------- Transfer NFT ----------------------------------------------

    it("Should transfer 6 NFT from user_1 to user_2", async function () {
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 0);
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 1);
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 2);
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 3);
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 4);
        await dinoToken["safeTransferFrom(address,address,uint256)"](user_1.address, user_2.address, 5);
        let balance = await dinoToken.balanceOf(user_2.address);
        expect(balance).to.equal(6);
    });

    it("Should give approval of all the tokens to dinoPool", async function () {
        await dinoToken.connect(user_2).setApprovalForAll(dinoPool.address, true);
    });

    // ------------------------------------ Stake NFT ----------------------------------------------

    it("Should deposit token 0 to dinoPool", async function () {
        await dinoPool.connect(user_2).deposit([0], "600", user_2.address);
        let deposits = await dinoPool.getDepositsOf(user_2.address);
        expect(deposits.length).to.greaterThanOrEqual(1);
    });

    // ---------------------------------- View Functions -------------------------------------------

    it("Should have balance greater than equal to 1", async function () {
        let result = await dinoPool.balanceOf(user_2.address);
        expect(parseInt(result)).to.greaterThanOrEqual(1);
    });

    it("Should have cumulative rewards greater than equal to 0", async function () {
        let result = await dinoPool.cumulativeRewardsOf(user_2.address);
        expect(parseInt(result)).to.greaterThanOrEqual(0);
    });

    it("Should have atleast one deposit", async function () {
        let result = await dinoPool.getDepositsOf(user_2.address);
        expect(result.length).to.greaterThanOrEqual(1);
    });

    it("Should have deposits length greater than 0", async function () {
        let result = await dinoPool.getDepositsOfLength(user_2.address);
        expect(result).to.equal(1);
    });

    it("Should give estimated reward", async function () {
        let result = await dinoPool.getMultiplier(600);
        expect(Number(result)).to.lessThanOrEqual(Number(2000000000000000000));
    });

    it("Should return total deposits", async function () {
        let result = await dinoPool.getTotalDeposit(user_2.address);
        expect(result).to.equal(1);
    });

    it("Should return withdrawable rewards", async function () {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        await ethers.provider.send("evm_mine", [blockBefore.timestamp+86400]);
        await liquidityMiningManager.distributeRewards();
        let result = await dinoPool.withdrawableRewardsOf(user_2.address);
        expect(Number(result)).to.greaterThan(Number(1));
    });

    it("Should return withdrawn rewards", async function () {
        let result = await dinoPool.withdrawnRewards(user_2.address);
        expect(result).to.equal(0);
    });

    it("Should return SDT balance of user", async function () {
        let result = await dinoPool.balanceOf(user_2.address);
        expect(Number(result)).to.greaterThan(0);
    });

    it("Should return total supply of SDT", async function () {
        let result = await dinoPool.totalSupply();
        expect(Number(result)).to.greaterThan(0);
    });

    // ------------------------------- Claim & Withdraw Rewards ------------------------------------

    it("Should claim rewards after rewards distribution", async function () {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        await ethers.provider.send("evm_mine", [blockBefore.timestamp+86400]);
        await liquidityMiningManager.distributeRewards();
        let oldFossilBalance = await fossilToken.balanceOf(rewardsPool.address);
        await dinoPool.connect(user_2).claimRewards(user_2.address);
        let newFossilBalance = await fossilToken.balanceOf(rewardsPool.address);
        expect(Number(newFossilBalance)).to.greaterThan(Number(oldFossilBalance));
    });

    it("Should withdraw staked amount", async function () {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        await ethers.provider.send("evm_mine", [blockBefore.timestamp+86400]);
        let oldDeposits = await dinoPool.getDepositsOf(user_2.address);
        await dinoPool.connect(user_2).withdraw([0], user_2.address);
        let updatedDeposits = await dinoPool.getDepositsOf(user_2.address);
        expect(oldDeposits.length).to.greaterThan(updatedDeposits.length);
    });


    // ------------------------------ Multiple Staking & Unstaking ---------------------------------

    it("Should stake all 6 tokens to Dino Pool", async function () {
        await dinoPool.connect(user_2).deposit([0,1,2,3,4,5], "600", user_2.address);
        let deposits = await dinoPool.getDepositsOf(user_2.address);
        expect(deposits.length).to.equal(6);
    });

    it("Should unstake all 6 tokens from Dino Pool", async function () {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        await ethers.provider.send("evm_mine", [blockBefore.timestamp+660]);
        let oldDeposits = await dinoPool.getDepositsOf(user_2.address);
        let depositIds = oldDeposits.map((data,index) => {return index;});
        await liquidityMiningManager.connect(user_1).distributeRewards();
        await dinoPool.connect(user_2).withdraw(depositIds, user_2.address);
        let updatedDeposits = await dinoPool.getDepositsOf(user_2.address);
        expect(oldDeposits.length).to.greaterThan(updatedDeposits.length);
    });

    // ------------------------------------ External functions -------------------------------------

    it("Should change minimum lock period", async function () {
        let oldMinimumLock = await dinoPool.minimumLockDuration();
        await dinoPool.setMinimumLockDuration("630");
        let newMinimumLock = await dinoPool.minimumLockDuration();
        expect(Number(newMinimumLock)).to.greaterThan(Number(oldMinimumLock));
    });

    it("Should change maximum lock period", async function () {
        let oldMaximumLock = await dinoPool.maxLockDuration();
        await dinoPool.setMaximumLockDuration("31539000");
        let newMaximumLock = await dinoPool.maxLockDuration();
        expect(Number(newMaximumLock)).to.greaterThan(Number(oldMaximumLock));
    });

    it("Should change maximum bonus", async function () {
        let oldMaxBonus = await dinoPool.maxBonus();
        await dinoPool.setMaximumBonus("2000000000000000000");
        let newMaxBonus = await dinoPool.maxBonus();
        expect(Number(newMaxBonus)).to.greaterThan(Number(oldMaxBonus));
    });

    it("Should change maximum NFT staking allowed", async function () {
        let oldMaxValue = await dinoPool.maximumNftStakingAllowed();
        await dinoPool.setMaximumNftStakingAllowed(30);
        let newMaxValue = await dinoPool.maximumNftStakingAllowed();
        expect(Number(newMaxValue)).to.greaterThan(Number(oldMaxValue));
    });

    it("Should change contract owner", async function () {
        let oldOwner = await dinoPool.owner();
        await dinoPool.changeContractOwner(user_3.address);
        let newOwner = await dinoPool.owner();
        expect(oldOwner).to.not.equal(newOwner);
    });

});



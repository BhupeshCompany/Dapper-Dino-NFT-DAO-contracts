// SPDX-License-Identifier: NONE
pragma solidity 0.8.7;


interface IERC20 {

    event Transfer(
        address indexed from, 
        address indexed to, 
        uint256 value
    );
    event Approval(
        address indexed owner, 
        address indexed spender, 
        uint256 value
    );

    function transfer(
        address recipient, 
        uint256 amount
    ) external returns (bool);
    function approve(
        address spender, 
        uint256 amount
    ) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function totalSupply() external view returns (uint256);
    function balanceOf(
        address account
    ) external view returns (uint256);
    function allowance(
        address owner, 
        address spender
    ) external view returns (uint256);

}


contract RewardsPool {

    struct Reward {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
    }

    address public dinoPool;
    address public rewardToken;
    address public owner;
    uint256 public vestingPeriod = 600;

    mapping(address => Reward[]) public userClaimedRewards;

    event RewardsWithdrawn(address _receiver, uint256 _withdrawnId);

    constructor() {
        owner = msg.sender;
    }

    function setContractAddresses(
        address _dinoPool, 
        address _rewardToken
    ) external {
        require(msg.sender == owner, "Access Denied!");
        dinoPool = _dinoPool;
        rewardToken = _rewardToken;
    }

    // Takes seconds as input for vesting period and changes the vesting period
    function setVestingPeriod(
        uint256 _vestingPeriod
    ) external {
        require(
            msg.sender == owner,
            "Access denied, only contract has access!"
        );
        vestingPeriod = _vestingPeriod;
    }

    // Utility function to change contract owner
    function changeContractOwner(
        address newOwner
    ) external {
        require(msg.sender == owner, "Caller is not contract owner!");
        require(newOwner != address(0), "Invalid address!");
        owner = newOwner;
    }

    // Rewards gets added here which needs to go through vesting period
    function addReward(
        address _receiver, 
        uint256 _amount
    ) external {
        require(msg.sender == dinoPool, "Access Denied!");
        userClaimedRewards[_receiver].push(
            Reward({
                amount: _amount,
                startTime: uint64(block.timestamp),
                endTime: uint64(block.timestamp) + uint64(vestingPeriod)
            })
        );
    }

    // Withdraws rewards and transfers to receiver wallet after vesting period ends
    function withdraw(
        address _receiver, 
        uint256 _withdrawId
    ) external {
        Reward[] storage rewardList = userClaimedRewards[_receiver];
        require(_withdrawId < rewardList.length, "Invalid withdraw id!");
        Reward memory data = rewardList[_withdrawId];
        require(block.timestamp >= data.endTime, "Withdrawing too soon!");
        rewardList[_withdrawId] = rewardList[rewardList.length - 1];
        rewardList.pop();
        IERC20(rewardToken).transfer(_receiver, data.amount);
        emit RewardsWithdrawn(_receiver, _withdrawId);
    }

    // Returns list of rewards of an address
    function getUserRewardsList(
        address _receiver
    ) public view returns (Reward[] memory) {
        return userClaimedRewards[_receiver];
    }

}

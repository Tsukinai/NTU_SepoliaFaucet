// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SepoliaFaucet {
    uint256 public dripAmount = 0.1 ether; 
    uint256 public interval = 24 hours; 
    uint256 public ownerInterval = 1 minutes; // Owner的drip时间间隔为1分钟

    mapping(address => uint256) public lastDripTime; // 记录每个地址上次drip的时间
    mapping(address => uint256) public lastLoginTime; // 记录每个账户上次drip时的登录时间

    address public owner;

    constructor() {
        owner = msg.sender;
        
    }

    // // 记录用户登录时间（只有成功drip时才更新）
    function recordLogin() external view {
        require(msg.sender == owner, "Only the owner can record login");
    }

    // 水龙头drip功能
    function drip(address payable recipient) external {
        uint256 applicableInterval = msg.sender == owner ? ownerInterval : interval;
        
        require(block.timestamp >= lastDripTime[recipient] + applicableInterval, "You must wait for the required interval before dripping again");
        require(block.timestamp >= lastLoginTime[msg.sender] + applicableInterval, "You can only drip once every 24 hours after logging in");
        require(address(this).balance >= dripAmount, "Insufficient faucet balance");

        // 更新drip时间
        lastDripTime[recipient] = block.timestamp;
        // 更新登录时间，只有成功drip后才更新
        lastLoginTime[msg.sender] = block.timestamp;

        // 支付 gas 费用并转账给相应账户
        (bool success, ) = recipient.call{value: dripAmount, gas: gasleft()}("");
        require(success, "Transfer failed");

        // 如果转账成功，则继续执行
    }

    // 允许合约所有者更改drip的数量
    function setDripAmount(uint256 _newAmount) external {
        require(msg.sender == owner, "Only the owner can set the drip amount");
        dripAmount = _newAmount;
    }

    // 捐赠功能
    function donate() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
    }

    // 提取捐赠的资金
    function withdraw(uint256 _amount) external {
        require(msg.sender == owner, "Only the owner can withdraw");
        require(_amount <= address(this).balance, "Insufficient contract balance");
        
        payable(owner).transfer(_amount);
    }

    // 查询水龙头剩余的Sepolia ETH数量
    function getFaucetBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // 查询剩余等待时间（drip时间）
    function getRemainingWaitTime() external view returns (uint256) {
        uint256 applicableInterval = msg.sender == owner ? ownerInterval : interval;
        uint256 lastDrip = lastDripTime[msg.sender];
        
        if (block.timestamp >= lastDrip + applicableInterval) {
            return 0; // 可以立即drip
        } else {
            return (lastDrip + applicableInterval) - block.timestamp; // 剩余时间
        }
    }

    // 接收ETH的fallback函数
    receive() external payable {}
}
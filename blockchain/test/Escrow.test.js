const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentSwarmEscrow", function () {
  let escrow, owner, worker;

  beforeEach(async () => {
    [owner, worker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentSwarmEscrow");
    escrow = await Factory.deploy();
    await escrow.waitForDeployment();
  });

  it("should post a task", async () => {
    await escrow.postTask("meta://1", { value: ethers.parseEther("0.01") });
    const task = await escrow.tasks(1);
    expect(Number(task.taskId)).to.equal(1);
    expect(task.taskMetadataURI).to.equal("meta://1");
    expect(Number(task.status)).to.equal(0); // Open
  });

  it("should claim a task", async () => {
    await escrow.postTask("meta://1", { value: ethers.parseEther("0.01") });
    await escrow.connect(worker).claimTask(1);
    const task = await escrow.tasks(1);
    expect(Number(task.status)).to.equal(1); // Claimed
    expect(task.workerAgent).to.equal(worker.address);
  });

  it("should submit result", async () => {
    await escrow.postTask("meta://1", { value: ethers.parseEther("0.01") });
    await escrow.connect(worker).claimTask(1);
    await escrow.connect(worker).submitResult(1, "res://1");
    const task = await escrow.tasks(1);
    expect(Number(task.status)).to.equal(2); // Submitted
    expect(task.resultURI).to.equal("res://1");
  });

  it("should approve and pay", async () => {
    const balanceBefore = await ethers.provider.getBalance(worker.address);
    await escrow.postTask("meta://1", { value: ethers.parseEther("0.01") });
    await escrow.connect(worker).claimTask(1);
    await escrow.connect(worker).submitResult(1, "res://1");
    await escrow.approveAndPay(1);
    const task = await escrow.tasks(1);
    expect(Number(task.status)).to.equal(3); // Verified
    const balanceAfter = await ethers.provider.getBalance(worker.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});
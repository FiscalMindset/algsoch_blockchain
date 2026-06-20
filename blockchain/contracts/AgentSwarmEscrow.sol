// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentSwarmEscrow
/// @notice Trustless escrow contract for autonomous M2M agent task management.
/// Funds are locked until the manager approves completed work or a dispute is raised.
contract AgentSwarmEscrow is ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Enums & Structs
    // -----------------------------------------------------------------------

    enum Status {
        Open,
        Claimed,
        Submitted,
        Verified,
        Disputed
    }

    struct Task {
        uint256 taskId;
        address managerAgent;
        address workerAgent;
        string taskMetadataURI;
        string resultURI;
        uint256 reward;
        Status status;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    uint256 public taskCounter;

    mapping(uint256 => Task) public tasks;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event TaskPosted(
        uint256 indexed taskId,
        address indexed manager,
        uint256 reward,
        string metadataURI
    );

    event TaskClaimed(
        uint256 indexed taskId,
        address indexed worker
    );

    event TaskSubmitted(
        uint256 indexed taskId,
        string resultURI
    );

    event TaskApproved(
        uint256 indexed taskId,
        address indexed worker,
        uint256 reward
    );

    event TaskDisputed(
        uint256 indexed taskId,
        address indexed disputer
    );

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error TaskNotFound();
    error InvalidStatus();
    error OnlyManagerAllowed();
    error OnlyWorkerAllowed();
    error CallerNotParticipant();
    error TransferFailed();
    error ZeroReward();
    error AlreadyAssigned();

    // -----------------------------------------------------------------------
    // Core Functions
    // -----------------------------------------------------------------------

    /// @notice Post a new task and lock the reward in escrow.
    /// @param _metadataURI IPFS or HTTP URI describing the task requirements.
    function postTask(string memory _metadataURI) external payable {
        if (msg.value == 0) revert ZeroReward();

        uint256 taskId = ++taskCounter;

        tasks[taskId] = Task({
            taskId: taskId,
            managerAgent: msg.sender,
            workerAgent: address(0),
            taskMetadataURI: _metadataURI,
            resultURI: "",
            reward: msg.value,
            status: Status.Open
        });

        emit TaskPosted(taskId, msg.sender, msg.value, _metadataURI);
    }

    /// @notice Worker claims an open task.
    /// @param _taskId ID of the task to claim.
    function claimTask(uint256 _taskId) external {
        Task storage task = _getTask(_taskId);

        if (task.status != Status.Open) revert InvalidStatus();
        if (task.workerAgent != address(0)) revert AlreadyAssigned();

        task.workerAgent = msg.sender;
        task.status = Status.Claimed;

        emit TaskClaimed(_taskId, msg.sender);
    }

    /// @notice Worker submits a result URI once the task is claimed.
    /// @param _taskId    ID of the task.
    /// @param _resultURI URI pointing to the completed work.
    function submitResult(uint256 _taskId, string memory _resultURI) external {
        Task storage task = _getTask(_taskId);

        if (task.workerAgent != msg.sender) revert OnlyWorkerAllowed();
        if (task.status != Status.Claimed) revert InvalidStatus();

        task.resultURI = _resultURI;
        task.status = Status.Submitted;

        emit TaskSubmitted(_taskId, _resultURI);
    }

    /// @notice Manager approves submitted work and releases the escrow reward.
    /// @param _taskId ID of the task to approve.
    function approveAndPay(uint256 _taskId)
        external
        nonReentrant
    {
        Task storage task = _getTask(_taskId);

        if (task.managerAgent != msg.sender) revert OnlyManagerAllowed();
        if (task.status != Status.Submitted) revert InvalidStatus();

        address worker = task.workerAgent;
        uint256 reward = task.reward;

        task.status = Status.Verified;

        emit TaskApproved(_taskId, worker, reward);

        _safeTransferETH(worker, reward);
    }

    /// @notice Either party can raise a dispute on a non-finalised task.
    /// @param _taskId ID of the task to dispute.
    function raiseDispute(uint256 _taskId) external {
        Task storage task = _getTask(_taskId);

        if (task.managerAgent != msg.sender && task.workerAgent != msg.sender) {
            revert CallerNotParticipant();
        }
        if (task.status == Status.Verified || task.status == Status.Disputed) {
            revert InvalidStatus();
        }

        task.status = Status.Disputed;

        emit TaskDisputed(_taskId, msg.sender);
    }

    // -----------------------------------------------------------------------
    // Internal Helpers
    // -----------------------------------------------------------------------

    function _getTask(uint256 _taskId) internal view returns (Task storage) {
        if (_taskId == 0 || _taskId > taskCounter) revert TaskNotFound();
        return tasks[_taskId];
    }

    function _safeTransferETH(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // -----------------------------------------------------------------------
    // Receive / Fallback
    // -----------------------------------------------------------------------

    receive() external payable {}
}
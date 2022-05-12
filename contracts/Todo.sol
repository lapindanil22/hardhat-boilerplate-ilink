// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @author Danil Lapin
/// @title Todo-list Smart Contract example
contract Todo {
    address admin;

    constructor() {
        admin = msg.sender;
    }

    Task[] internal tasks;
    mapping(address => uint) internal userTaskCount;

    struct Task {
        uint id;
        address owner;
        string text;
        bool isCompleted;
        bool isDeleted;
        bool isOverdue;
        uint timeCreated;
        uint deadline;
    }

    event Created (
        uint indexed id,
        address indexed owner,
        string indexed text,
        uint timeCreated,
        uint deadline
    );

    event Deleted(
        uint indexed id,
        address indexed owner,
        string indexed text,
        uint timeDeleted
    );

    event Restored (
        uint indexed id,
        address indexed owner,
        string indexed text,
        uint timeRestored
    );

    event Completed (
        uint indexed id,
        address indexed owner,
        string indexed text,
        uint timeCompleted
    );

    event Uncompleted (
        uint indexed id,
        address indexed owner,
        string indexed text,
        uint timeUncompleted
    );

    modifier validTaskId(uint taskId) {
        require(userTaskCount[msg.sender] > 0, "no tasks!");
        require(taskId < tasks.length, "invalid taskId!");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not an admin!");
        _;
    }

    modifier onlyOwner(uint taskId) {
        require(msg.sender == tasks[taskId].owner, "not an owner!");
        _;
    }

    /// @notice Creates new task with text "_text" and deadline "_deadline"
    /// @param _text Text of task
    /// @param _deadline Deadline of task
    function createTask(string memory _text, uint _deadline) external {
        tasks.push(
            Task({
                id: tasks.length,
                owner: msg.sender,
                text: _text,
                isCompleted: false,
                isDeleted: false,
                isOverdue: false,
                timeCreated: block.timestamp,
                deadline: _deadline
            })
        );
        userTaskCount[msg.sender]++;
        emit Created(tasks.length - 1, msg.sender, _text, block.timestamp, _deadline);
    }

    /// @notice Deletes the task with task ID "taskId"
    /// @param taskId Task ID
    function deleteTask(uint taskId) external onlyOwner(taskId) {
        tasks[taskId].isDeleted = true;
        Task memory _task = tasks[taskId];
        userTaskCount[msg.sender]--;
        emit Deleted(taskId, _task.owner, _task.text, block.timestamp);
    }

    /// @notice Restores the task with task ID "taskId"
    /// @param taskId Task ID
    function restoreTask(uint taskId) external onlyOwner(taskId) {
        tasks[taskId].isDeleted = false;
        Task memory _task = tasks[taskId];
        userTaskCount[msg.sender]++;
        emit Restored(taskId, _task.owner, _task.text, block.timestamp);
    }

    /// @notice Returns information about the task
    /// @param taskId Task ID
    /// @return Task object
    function getTask(uint taskId)
        external
        view
        validTaskId(taskId)
        onlyOwner(taskId)
        returns(Task memory)
    {
        require(!tasks[taskId].isDeleted, "task deleted!");
        Task memory task = tasks[taskId];
        if (block.timestamp >= task.deadline)
            task.isOverdue = true;
        return task;
    }

    /// @notice Returns information about each task of the user
    /// @return Array of tasks
    function getTasks() external view returns(Task[] memory) {
        uint counter;
        Task[] memory _tasks = new Task[](userTaskCount[msg.sender]);
        for (uint i = 0; i < tasks.length; i++) {
            if (tasks[i].owner == msg.sender && !tasks[i].isDeleted) {
                _tasks[counter] = tasks[i];
                if (block.timestamp >= _tasks[counter].deadline)
                    _tasks[counter].isOverdue = true;
                counter++;
            }
        }
        return _tasks;
    }

    /// @notice Returns information about each task of each user
    /// @return Array of tasks
    function getAllTasks() external view onlyAdmin returns(Task[] memory) { return tasks; }

    /// @notice Changes the status of task completion with the task ID "taskId" to the opposite
    /// @param taskId Task ID
    function toggleComplete(uint taskId) external onlyOwner(taskId) {
        Task memory _task = tasks[taskId];
        if (_task.isCompleted) {
            tasks[taskId].isCompleted = false;
            emit Uncompleted(taskId, _task.owner, _task.text, block.timestamp);
        } else {
            tasks[taskId].isCompleted = true;
            emit Completed(taskId, _task.owner, _task.text, block.timestamp);
        }
    }

    /// @notice Сalculates the percentage of completed tasks
    /// @return Integer part of the percentage of completed tasks
    function completionPercentage() external view returns(uint) {
        require(userTaskCount[msg.sender] > 0, "no tasks!");
        uint completed = 0;
        for (uint i = 0; i < tasks.length; i++) {
            Task memory _task = tasks[i];
            if (_task.owner == msg.sender && _task.isCompleted)
                completed++;
        }
        return (100 * completed) / userTaskCount[msg.sender];
    }
}
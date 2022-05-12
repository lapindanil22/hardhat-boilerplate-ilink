const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Todo", function () {
    const text = ["test1", "test2", "test3"]
    const deadline = [1000, 2000, 3000]
    
    let admin, user1, user2
    let todo, response

    beforeEach(async function() {
        [admin, user1, user2] = await ethers.getSigners()
        const Todo = await ethers.getContractFactory("Todo", admin)
        todo = await Todo.deploy()
        await todo.deployed()
    })

    it("should have proper address", async function() {
        expect(todo.address).to.be.properAddress
    })

    it("should to have no tasks at the beginning.", async function() {
        await expect(await todo.getAllTasks()).to.be.empty
    })

    it("should not be possible to get a task that does not exist", async function() {
        await expect(todo.getTask(0)).to.be.revertedWith("no tasks!")
        await todo.createTask(text[0], deadline[0])
        await expect(todo.getTask(1)).to.be.revertedWith("invalid taskId!")
    })

    it("should create tasks", async function() {
        await todo.connect(admin).createTask(text[0], deadline[0])
        await todo.connect(user1).createTask(text[1], deadline[1])

        const response1 = await todo.connect(admin).getTask(0)
        const response2 = await todo.connect(user1).getTask(1)

        expect(response1.text).to.eq(text[0])
        expect(response1.deadline).to.eq(deadline[0])
        expect(response2.text).to.eq(text[1])
        expect(response2.deadline).to.eq(deadline[1])

        response = await todo.connect(admin).createTask(text[2], deadline[2])

        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await expect(response)
            .to.be.emit(todo, "Created")
            .withArgs(2, admin.address, text[2], timestamp, deadline[2])
    })

    it("should mark the task as completed", async function() {
        await todo.createTask(text[0], deadline[0])
        response = await todo.getTask(0)
        expect(response.isCompleted).to.be.false

        await todo.toggleComplete(0)
        response = await todo.getTask(0)
        expect(response.isCompleted).to.be.true

        await todo.createTask(text[1], deadline[1])
        response = await todo.toggleComplete(1)

        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await expect(response)
            .to.be.emit(todo, "Completed")
            .withArgs(1, admin.address, text[1], timestamp)
    })

    it("should mark the task as not completed", async function() {
        await todo.createTask(text[0], deadline[0])
        await todo.toggleComplete(0)
        await todo.toggleComplete(0)

        response = await todo.getTask(0)
        expect(response.isCompleted).to.be.false
        
        await todo.createTask(text[1], deadline[1])
        await todo.toggleComplete(1)
        response = await todo.toggleComplete(1)

        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await expect(response)
            .to.be.emit(todo, "Uncompleted")
            .withArgs(1, admin.address, text[1], timestamp)
    })

    it("should to get the rate of completed tasks", async function() {
        await expect(todo.completionPercentage()).to.be.revertedWith("no tasks!")
        await todo.createTask(text[0], deadline[0])
        expect(await todo.completionPercentage()).to.be.eq(0)

        await todo.createTask(text[1], deadline[1])
        expect(await todo.completionPercentage()).to.be.eq(0)
        
        await todo.toggleComplete(0)
        expect(await todo.completionPercentage()).to.be.eq(50)

        await todo.toggleComplete(1)
        expect(await todo.completionPercentage()).to.be.eq(100)
        
        await todo.createTask(text[2], deadline[2])
        expect(await todo.completionPercentage()).to.be.eq(66)
        
        await todo.toggleComplete(1)
        expect(await todo.completionPercentage()).to.be.eq(33)

        await todo.connect(user1).createTask(text[0], deadline[0])
        expect(await todo.completionPercentage()).to.be.eq(33)
    })

    it("should to check the task is overdue", async function() {
        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await todo.createTask(text[0], timestamp + deadline[0])
        response = await todo.getTask(0)
        expect(response.isOverdue).to.be.false
        
        response = await todo.getTasks()
        expect(response[0].isOverdue).to.be.false

        await ethers.provider.send('evm_increaseTime', [deadline[0]]);
        await ethers.provider.send('evm_mine');

        response = await todo.getTask(0)
        expect(response.isOverdue).to.be.true
    })

    it("should delete task", async function() {
        await todo.createTask(text[0], deadline[0])
        response = await todo.getTask(0)
        expect(response.isDeleted).to.be.false

        await todo.deleteTask(0)
        await expect(todo.getTask(0)).to.be.revertedWith("no tasks!")

        await todo.createTask(text[1], deadline[1])
        await expect(todo.getTask(0)).to.be.revertedWith("task deleted!")
    
        response = await await todo.deleteTask(1)
        
        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await expect(response)
            .to.be.emit(todo, "Deleted")
            .withArgs(1, admin.address, text[1], timestamp)
    })

    it("should restore task", async function() {
        await todo.createTask(text[0], deadline[0])
        await todo.deleteTask(0)

        await todo.restoreTask(0)
        
        response = await todo.getTask(0)
        await expect(response.isDeleted).to.be.false

        await todo.deleteTask(0)

        response = await todo.restoreTask(0)

        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        const timestamp = block.timestamp;

        await expect(response)
            .to.be.emit(todo, "Restored")
            .withArgs(0, admin.address, text[0], timestamp)
    })


    it("should get all user tasks excluding deleted", async function() {
        await todo.createTask(text[0], deadline[0])
        await todo.createTask(text[1], deadline[1])
        await todo.createTask(text[2], deadline[2])

        response = await todo.getTasks()
        expect(response).to.be.length(3)
        
        await todo.deleteTask(1)
        response = await todo.getTasks()
        expect(response).to.be.length(2)
    })

    it("should be that only the administrator can get tasks of all users", async function() {
        await todo.connect(user1).createTask(text[0], deadline[0])
        response = await todo.connect(admin).getAllTasks()
        expect(response).to.be.length(1)
        await expect(todo.connect(user1).getAllTasks()).to.be.revertedWith("not an admin!")
    })

    it("should be impossible to get another user's task", async function() {
        await todo.connect(user1).createTask(text[0], deadline[0])
        await todo.connect(user2).createTask(text[1], deadline[1])

        await expect(todo.connect(user1).getTask(1)).to.be.revertedWith("not an owner!")
        await expect(todo.connect(user1).deleteTask(1)).to.be.revertedWith("not an owner!")
        await expect(todo.connect(user1).restoreTask(1)).to.be.revertedWith("not an owner!")
        await expect(todo.connect(user1).toggleComplete(1)).to.be.revertedWith("not an owner!")
    })
});

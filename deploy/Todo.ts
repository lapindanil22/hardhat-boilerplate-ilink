import { HardhatRuntimeEnvironment } from 'hardhat/types';

module.exports = async function (hre: HardhatRuntimeEnvironment) {
    console.log(`ChainId: ${await hre.getChainId()}`)

    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log(`Deployer: ${deployer}`)

    await deploy('Todo', {
        from: deployer,
        log: true,
    });
};

module.exports.tags = ["Todo"];

const hre = require("hardhat");

async function main() {
    const Contract = await hre.ethers.getContractFactory("HolaSonic");
    const contract = await Contract.deploy("¡Hola Sonic Network!");
    await contract.waitForDeployment();
    
    console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
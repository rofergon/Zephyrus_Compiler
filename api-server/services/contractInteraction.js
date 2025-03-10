const { ethers } = require('ethers');
require('dotenv').config();

// Initialize provider
const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");

// Initialize wallet with private key
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Helper function to convert BigInt to string
const formatResult = (result) => {
    if (typeof result === 'bigint') {
        return result.toString();
    } else if (Array.isArray(result)) {
        return result.map(formatResult);
    } else if (typeof result === 'object' && result !== null) {
        const formatted = {};
        for (const key in result) {
            formatted[key] = formatResult(result[key]);
        }
        return formatted;
    }
    return result;
};

class ContractInteractionService {
    /**
     * Read data from a contract (for view/pure functions)
     */
    async readContract(contractAddress, abi, functionName, inputs = []) {
        try {
            const contract = new ethers.Contract(contractAddress, abi, provider);
            if (!contract[functionName]) {
                throw new Error(`Function ${functionName} not found in contract`);
            }
            const result = await contract[functionName](...inputs);
            return { success: true, data: formatResult(result) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Write data to a contract (for state-changing functions)
     */
    async writeContract(contractAddress, abi, functionName, inputs = []) {
        try {
            const contract = new ethers.Contract(contractAddress, abi, wallet);
            if (!contract[functionName]) {
                throw new Error(`Function ${functionName} not found in contract`);
            }
            const tx = await contract[functionName](...inputs);
            const receipt = await tx.wait();
            return { 
                success: true, 
                data: {
                    transactionHash: receipt.hash,
                    blockNumber: receipt.blockNumber.toString(),
                    gasUsed: receipt.gasUsed.toString()
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get contract events
     */
    async getEvents(contractAddress, abi, eventName, filter = {}) {
        try {
            const contract = new ethers.Contract(contractAddress, abi, provider);
            const events = await contract.queryFilter(eventName, filter.fromBlock, filter.toBlock);
            return { success: true, data: events.map(formatResult) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ContractInteractionService(); 
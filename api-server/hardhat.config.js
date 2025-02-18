require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

// Asegúrate de tener PRIVATE_KEY en tu archivo .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('Please set your PRIVATE_KEY in a .env file');
  process.exit(1);
}

// Eliminar '0x' si está presente
const privateKey = PRIVATE_KEY.replace('0x', '');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    sonic: {
      url: "https://rpc.blaze.soniclabs.com",
      accounts: [`0x${privateKey}`],
      chainId: 57054
    }
  }
}; 
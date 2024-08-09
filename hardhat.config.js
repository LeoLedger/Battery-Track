require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

function mnemonic() {
  return process.env.PRIVATE_KEY;
}

module.exports = {
  solidity: '0.8.24',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
    },
    sepolia: {
      url: 'https://sepolia.infura.io/v3/' + process.env.INFURA_ID, 
      accounts: [mnemonic()],
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/" + process.env.INFURA_ID, 
      accounts: [
        mnemonic()
      ],
    },
    kovan: {
      url: "https://kovan.infura.io/v3/" + process.env.INFURA_ID, 
      accounts: [
        mnemonic()
      ],
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_ID, 
      accounts: [
        mnemonic()
      ],
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/" + process.env.INFURA_ID, 
      accounts: [
        mnemonic()
      ],
    },
    matic: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts: [
        mnemonic()
      ]
    },
    matic_mumbai: {
      url: "https://polygon-mumbai.infura.io/v3/" + process.env.INFURA_ID,
      accounts: [
        mnemonic()
      ]
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.APIKEY
    } ,
  },
  sourcify: {
    enabled: true
  }
};

// Note: When deploying to mainnet, it tends to timeout due to long confirmation times
const Web3 = require("web3");

const truffleConfig = require("../truffle.js")
const deployConfig = require("../config/deploy-config.js")
const secrets = require("../config/secrets.json")

let MultiSigWallet = artifacts.require("MultiSigWallet");
let BasketToken = artifacts.require("BasketToken");
let TokenA = artifacts.require("TokenA");
let TokenB = artifacts.require("TokenB");

let web3 = new Web3();

/// @notice Loads configuration based on network
/// @param network {string}
function loadConfig(network) {
  let networkConfig = truffleConfig.networks[network];
  let provider = networkConfig.provider ? networkConfig.provider() : new Web3.providers.HttpProvider(`http://${networkConfig.host}:${networkConfig.port}`);
  web3.setProvider(provider);
}

/// @notice Deploys multisig wallet, then the BasketToken, then sets the owner of
/// the Basket to the multisig to the specified network
/// @param deployer {Object} Deployer object from Truffle
/// @param network {string} String representing network from Truffle
/// @param accounts {Array} Accounts array from Truffle
/// @param callback {function} Callback function to invoke after deployment is
/// done
function deploy(deployer, network, accounts, callback) {
  let tokenA;
  let tokenB;
  let multisig;
  let basketToken;

  const deployFrom = secrets.deploy.coinbase;
  const owners = deployConfig[network].multisig.owners;
  const required = deployConfig[network].multisig.required;
  const tokenAddresses = deployConfig[network].tokenAddresses;
  const quantities = deployConfig[network].quantities;
  const granularity = deployConfig[network].granularity;

  deployer.then(function() {
    console.log(owners);
    return MultiSigWallet.new(owners, required);
  }).then(function(_multisig) {
    multisig = _multisig;
    console.log("multisig address", multisig.address);
    return BasketToken.new(tokenAddresses, quantities, granularity);
  }).then(function(_basketToken) {
    basketToken = _basketToken;
    return basketToken.transferOwnership(multisig.address);
  }).then(function() {
    callback({tokenA, tokenB, multisig, basketToken});
  });
};

/// @notice Deploys contracts to network
module.exports = function(deployer, network, accounts) {
  loadConfig(network);

  if (network == "development") {
    deploy(deployer, network, accounts, function(deployed) {
      deployed.basketToken.owner.call().then(function(e) {
        console.log("Owner address", e);
        console.log("MultiSigWallet address", deployed.multisig.address);
        console.log("Done");
      });
    });
  } else if (network == "ropsten") {
    deploy(deployer, network, accounts, function(deployed) {
      console.log("Done");
    });
  } else if (network == "mainnet") {
    deploy(deployer, network, accounts, function(deployed) {
      console.log("Done");
    });
  }
}

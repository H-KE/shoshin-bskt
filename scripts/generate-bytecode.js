const Web3 = require("web3");

const config = require("../config/deploy-config.js");
const basketInfo = require("../build/contracts/BasketToken.json");

const web3 = new Web3();

/// @notice Generates bytecode with encoded constructor arguments
/// @param network {String} Network to generate bytecode for
/// @return string
// Generates bytecode from build folder
function generateBytecode(network) {
  let args;
  if (["development", "ropsten", "mainnet"].includes(network)) {
    args = config[network];
  } else {
    return;
  }

  const abi = basketInfo.abi;
  const bytecode = basketInfo.bytecode;
  const tokenAddresses = args.tokenAddresses;
  const tokenUnits = args.quantities;
  const granularity = args.granularity;
  const basketContract = web3.eth.contract(abi);

  const constructorBytecode = basketContract.new.getData(tokenAddresses, tokenUnits, granularity, {data: bytecode});
  return constructorBytecode;
};

module.exports = generateBytecode;

// TODO: replace with more robust flags solution
// Command line
if (require.main === module) {
  let network;
  process.argv.forEach(function (val, index) {
    if (val == "--network") {
      network = process.argv[index + 1]
    }
  });
  if (!network) {
    console.log("Network undefined");
    return;
  }
  if (!["development", "ropsten", "mainnet",].includes(network)) {
    console.log("Invalid network");
    return;
  }
  const bytecode = generateBytecode(network);
  console.log(bytecode);
}


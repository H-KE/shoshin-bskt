module.exports = {
  accounts: 10,
  norpc: true,
  testCommand: "truffle test ./test/BasketToken.test.js ./test/E2E.test.js",
  copyPackages: ["zeppelin-solidity"],
  skipFiles: ["Migrations.sol", "TokenA.sol", "TokenB.sol", "TokenC.sol", "MultiSigWallet.sol"]
};

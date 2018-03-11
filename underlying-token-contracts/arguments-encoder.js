let abi = require("ethereumjs-abi");

let tokens = ["QASH", "0x", "populous", "Loopring", "vechain", "Aeternity", "binance-coin", "IOSToken", "powerledger", "qtum", "Status", "augur", "nebulas", "Walton", "OmiseGo", "tron", "Dragon", "Kyber", "aelf", "golem", "BytomToken", "digixdao", "eos", "basic-attention-token", "Zilliqa"];
for (let token of tokens) {
  try {
    console.log(token);
    let args = require(`./${token}/args.json`);
    let encoded = abi.rawEncode(args.types, args.values);
    let encodedString = encoded.toString("hex");
    console.log(encodedString);
    console.log(encodedString === args.rawdata ? "rawdata matches" : "rawdata doesn't match");
  } catch (e) {
  }
}

//module.exports()
  //takes string,
  //returns full
  //function(token) {
    //return hex
  //}

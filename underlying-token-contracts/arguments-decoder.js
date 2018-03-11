let abi = require("ethereumjs-abi");

let tokens = ["QASH", "0x", "populous", "Loopring", "vechain", "ADXToken", "Aeternity", "binance-coin", "IOSToken", "powerledger", "qtum", "Status", "augur", "nebulas", "Walton", "OmiseGo", "tron", "Dragon", "Kyber", "aelf", "golem", "BytomToken", "digixdao", "eos", "basic-attention-token", "Zilliqa"];
for (let token of tokens) {
  try {
    let args = require(`./${token}/${token}.json`);
    let decodedBuffer = abi.rawDecode(args.types, new Buffer(args.rawdata, 'hex'));
    let decodedString = decodedBuffer.toString('hex');
    let decodedValues = decodedString.split(',');
    console.log(token);
    for (let i = 0; i < args.argument_names.length; i++) {
      console.log(`${args.argument_names[i]}: ${decodedValues[i]}`);
    }
  } catch (e) {
    console.log(`${token} skip`);
  }
}

//module.exports()
  //takes string,
  //returns full
  //function(token) {
    //return hex
  //}

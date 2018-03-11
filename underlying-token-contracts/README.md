# underlying-token-contracts

Contracts are retrieved from:
[Etherscan Token Tracker](https://etherscan.io/tokens)

## Usage
Check if mainnet argument bytecode matches:

    node argument-encoder.js

Decode mainnet argument bytecode:

    node argument-decoder.js


## Documentation
### Arguments
Each token defines an `args.json` file which represents the constructor initialization arguments. Example for Tron:

    {
      "types": ["address"],
      "argument_names": ["_addressFounder"],
      "values": ["0x00e25bddcac7fcb56932c62fc8d662f85d126434"],
      "rawdata": ""
    }

## Notes
- populous doesn't match, off by 1 bit
- why is binance token payable? It accepts eth and implements withdrawEther to drain the balance.
- status doesn't check out. The constructor for SNTPlaceHolder has 4 parameters, but there only seems to be one argument.
- loopring seems to have crowdsale coded in, so will be hard to credit ourselves with tokens
- Bytom and someone else uses HumanStandardToken
- Icon is the only token with no code online.
  - Therefore can't determine the constructor arguments

### More
These tokens have an address in their constructor:

- loopring
- powerledger
- status
- augur
- nebulas
- tron
- golem
- digixdao
- zilliqa
- basic-attention-token

### TODO
Allow custom addresses to be specified externally.

# Basket Token
[![Circle branch](https://circleci.com/gh/CryptoFinInc/basket.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/CryptoFinInc/basket/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/CryptoFinInc/basket/badge.svg?t=N3fjIq)](https://coveralls.io/github/CryptoFinInc/basket)

## Development

#### Installing BasketToken
    npm run bootstrap
#### Verify instalation
    npm run test:e2e

## Usage

#### ABI

Our token has 18 decimal point

#### `creationQuantity() returns(uint256)`
- returns creationQuantity amount

#### `create(uint256 baseUnitToCreate)`
- **baseUnitToCreate** is be the amount of BasketToken * 10^18 and divisible by the **creationQuantity** amount.
- Before creation, users need to own the appropriate amount of underlying tokens to create the corresponding amount of BasketTokens. 

#### `redeem(uint256 baseUnitToCreate, address[] tokensToSkip)`
- **baseUnitToCreate** is be the amount of BasketToken * 10^18 and divisible by the **creationQuantity** amount.
- **tokensToSkip** is the underlying token addresses to skip redemption 

#### `tokenAddresses() returns (address[])`
- returns underlying tokens' deployed contract addresses

#### `tokenUnits() returns (uint256[])`
- returns number of token base units required per grain of BasketToken
- For example: if creationQuantity is 10^5 then 1 BasketToken has 10^13 grains (10^18/10^5). If 1 grain has 100 ZRX token then 1 BasketToken will have 100 * 10^13 ZRX tokens.
#### Secrets
Example `secrets.json`:

    {
      "infura_token": "aaaaaaaaaaaaaaaaaaaa",
      "mnemonic": "exposure quill squeeze ..."
    }

#### Deploy to Rinkeby testnet

    truffle migrate --network rinkeby_infura

## Tests
Testing can be flaky if the network isn't reset between tests. Make sure you kill any ganache or testrpc instances between tests.


### Running tests

    npm run test:js
    npm run test:sol
    npm run test:e2e
    npm run cover

### REPL reference
Useful for common commands when manually verifying.

    abi = require("./build/contracts/TokenA.json").abi
    token = web3.eth.contract(abi).at("0x8f0483125fcb9aaaefa9209d8e9d7b9c8b9fb90f")

    BasketToken.deployed().then(e => basket = e)
    TokenA.deployed().then(e => tokena = e)
    TokenB.deployed().then(e => tokenb = e)
    TokenC.deployed().then(e => tokenc = e)
    tokena.transfer(basket.address, 1000)
    basket.withdrawExcessToken(tokena.address)

    tokena.approve(basket.address, 1000)
    tokenb.approve(basket.address, 1000)
    basket.create(1, {from: web3.eth.coinbase})

    tokena.allowance(web3.eth.coinbase, basket.address)
    tokenb.allowance(web3.eth.coinbase, basket.address)

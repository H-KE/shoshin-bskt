# Introduction


## Creation and redemption
* Can you create an unintended amount of tokens for underlying assets
* Same for redemption


## Gas and Economic analysis

The purpose of a bskt contract is to generate tokens that track a set of underlying tokens. The nature of the bskt contract's `create` and `redeem` functions have it behaving similar to how an exchange traded fund (ETF) does, save for the lack of a management fee of an ETF.

ETFs derive value to market makers through arbitrage opportunities between the market value of the ETF and the market values of its underlying assets. In order for a creator to derive value from creating a bskt token, the cost of creating and redeeming creation units must be relatively low compared to the arbitrage opportunity.

To analyze this, we performed a gas analysis on the `create` and `redeem` functions.

```
async function setupBsktToken(owner, buyer, underlyingTokens, tokenCountList, creationUnit) {
  const underlyingTokensPromise = underlyingTokens.map(token => token.new({from: owner}));
  const underlyingTokensInstance = await P.all(underlyingTokensPromise);

  const bsktToken = await BsktToken.new(
    underlyingTokensInstance.map(token => token.address),
    tokenCountList,
    creationUnit,
    'Basket',
    'BSK',
    {from: owner}
  );

  const TOKEN_GRAIN_MULTIPLE = TOKENS_MULTIPLE / creationUnit;
  // Can't use await properly in a forEach loop
  for (let i = 0; i < underlyingTokensInstance.length; i++) {
    await underlyingTokensInstance[i].transfer(buyer, TOKEN_GRAIN_MULTIPLE * tokenCountList[i]);
    await underlyingTokensInstance[i].approve(
      bsktToken.address,
      TOKEN_GRAIN_MULTIPLE * tokenCountList[i],
      {from: buyer}
    );
  }

  return {
    bsktToken,
    underlyingTokensInstance
  };
}

const createReceipt = await bskt20Token.create.estimateGas(100, {from: bskt20Buyer});

var gas = Number(createReceipt);

console.log("gas estimation = " + gas + " units");
console.log("gas cost estimation = " + (gas * 2000000000) + " wei");

await bskt20Token.create(100, {from: bskt20Buyer});
const redeemReceipt = await bskt20Token.redeem.estimateGas(100, [], {from: bskt20Buyer});

gas = Number(redeemReceipt);

console.log("gas estimation = " + gas + " units");
console.log("gas cost estimation = " + (gas * 2000000000) + " wei");
```

## Common denominator
* Is the math to determine a common denominator reliable
* division by zero may be possible

## DoS token pausing
* Does the state of external token contracts impact the functionality of bskt

## Send and receive
* Sending the right amount

## MultiSig owner
* Is multisig secure
* Propose deployment strategy

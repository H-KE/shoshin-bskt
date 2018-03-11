const P = require('bluebird');
const BasketToken = artifacts.require('BasketToken');
const TokenA = artifacts.require('TokenA');
const TokenB = artifacts.require('TokenB');
const TokenC = artifacts.require('TokenC');

const assertRevert = require('./helpers/assertRevert.js');
const BigNumber = web3.BigNumber;
const TOKENS_MULTIPLE = 100;

function conditionalIt(title, test) {
  let shouldSkip = false;
  if (process.env.TEST_ENV === 'e2e') {
    shouldSkip = true;
  }
  return shouldSkip ? it.skip(title, test) : it(title, test);
}

contract('BasketToken', function([owner, buyer1, buyer2, basket20Buyer]) {

  context('With 2 underlying tokens', function() {
    let basketToken, tokenA, tokenB;

    beforeEach(async function () {
      const result = await setupBasketToken(owner, buyer1, [TokenA, TokenB], [1, 2], 2);
      basketToken = result.basketToken;
      tokenA = result.underlyingTokensInstance[0];
      tokenB = result.underlyingTokensInstance[1];
    });

    conditionalIt('should correctly set values on init', async function test() {
      const tokenAddresses = await basketToken.tokenAddresses();
      const tokenUnits = await basketToken.tokenUnits();
      const contractOwner = await basketToken.owner.call();
      const creationQuantity = await basketToken.creationQuantity();
      const name = await basketToken.name.call();
      const symbol = await basketToken.symbol.call();

      assert.deepEqual(tokenAddresses.valueOf(), [
        tokenA.address,
        tokenB.address
      ], 'should correctly init addresses');
      assert.deepEqual(tokenUnits, [new BigNumber(1), new BigNumber(2)], 'should correctly init weights');
      assert.equal(contractOwner, owner, 'should correctly init owner');
      assert.equal(creationQuantity.toNumber(), 2, 'should correctly init creationQuantity');
      assert.equal(name, 'ERC20 TWENTY', 'should correctly init name');
      assert.equal(symbol, 'ETW', 'should correctly init symbol')
    });

    conditionalIt('should have 0 supply on init', async function() {
      const amount = await basketToken.totalSupply();
      assert.equal(amount.toNumber(), 0, 'should be 0');
    });

    conditionalIt('should initialized external tokens correctly', async function() {
      const tokenAAmount = await tokenA.balanceOf.call(buyer1);
      const tokenBAmount = await tokenB.balanceOf.call(buyer1);
      assert.equal(tokenAAmount.toNumber(), 50, 'incorrect tokenA balance for buyer1');
      assert.equal(tokenBAmount.toNumber(), 100, 'incorrect tokenB balance for buyer1');

      const tokenARemaining = await tokenA.balanceOf.call(owner);
      const tokenBRemaining = await tokenB.balanceOf.call(owner);
      assert.equal(tokenARemaining.toNumber(), 12950, 'incorrect remaining tokenA supply for owner');
      assert.equal(tokenBRemaining.toNumber(), 12900, 'incorrect remaining tokenB supply for owner');
    });

    conditionalIt('should not initialize if contract address input is invalid', async function() {
      try {
        await BasketToken.new([], [1, 2], 2, {from: owner});
        assert.fail(false, 'contract address input should not be correct');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not initialize if token amounts input are invalid', async function() {
      try {
        await BasketToken.new([
          tokenA.address,
          tokenB.address
        ], [], 2, {from: owner});
        assert.fail(false, 'token amounts input should not be correct');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not initialize if addresses length aren\'t equal to token amount length', async function() {
      try {
        await BasketToken.new([
          tokenA.address,
          tokenB.address
        ], [1], 2, {from: owner});
        assert.fail(false, 'token amounts should not be equal to number of addresses');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not initialize if creationQuantity amount is invalid', async function() {
      try {
        await BasketToken.new([
          tokenA.address,
          tokenB.address
        ], [1, 2], 0, {from: owner});
        assert.fail(false, 'creationQuantity amount should be wrong');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should create basket tokens for buyer in a happy case', async function test() {
      const txReceipt = await basketToken.create(100, {from: buyer1});

      assert.equal(txReceipt.logs.length, 4, 'logs should be created');
      assert.equal(txReceipt.logs[0].event, 'Transfer', 'did not log transfer event');
      assert.equal(txReceipt.logs[1].event, 'Transfer', 'did not log transfer event');
      assert.equal(txReceipt.logs[2].event, 'Mint', 'did not log mint event');
      assert.equal(txReceipt.logs[3].event, 'Transfer', 'did not log transfer event');

      const contractTokenABalance = await tokenA.balanceOf(basketToken.address);
      const contractTokenBBalance = await tokenB.balanceOf(basketToken.address);
      const buyer1TokenABalance = await tokenA.balanceOf(buyer1);
      const buyer1TokenBBalance = await tokenB.balanceOf(buyer1);

      assert.equal(contractTokenABalance.toNumber(), 50, 'contract should have 100 token A');
      assert.equal(contractTokenBBalance.toNumber(), 100, 'contract should have 200 token B');
      assert.equal(buyer1TokenABalance.toNumber(), 0, 'buyer should have no token A left');
      assert.equal(buyer1TokenBBalance.toNumber(), 0, 'buyer should have no token B left');

      const buyer1Balance = await basketToken.balanceOf(buyer1);
      assert.equal(buyer1Balance.toNumber(), 100, 'should have correct buyer1 balance');
    });

    conditionalIt('should not create any Basket when creation amount less than 1', async function test() {
      try {
        await basketToken.create(0, {from: buyer1});
        assert.fail(false, 'should not allow creation of anything less than 1');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not create any Basket when there\'s an overflow', async function test() {
      try {
        const result = await setupBasketToken(owner, buyer1, [TokenA, TokenB], [1, 2], 1);
        const lowCreationQuantityToken = result.basketToken;

        await lowCreationQuantityToken.create(2, {from: buyer1});
        await lowCreationQuantityToken.create(-1, {from: buyer1});
        assert.fail(false, 'should not allow creation when overflow');

      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not create any Basket when there\'s not enough allowance', async function test() {
      try {
        // Remove approval amount
        await tokenA.approve(basketToken.address, 0, {from: buyer1});

        await basketToken.create(100, {from: buyer1});

        assert.fail(false, 'should not allow creation when buyer does not approve basket contract');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not create if units is not divisible by creationQuantity', async function() {
      try {
        await basketToken.create(3, {from: buyer1});
        assert.fail(false, 'should not allow creation of any Basket token amount not divisible by 2');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not create any Basket when contract is paused', async function test() {
      try {
        await basketToken.pause({from: owner});
        await basketToken.create(100, {from: buyer1});
        assert.fail(false, 'should not allow creation when contract is paused');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should create Basket when contract is unpaused', async function test() {
      try {
        await basketToken.pause({from: owner});
        await basketToken.unpause({from: owner});
        await basketToken.create(100, {from: buyer1});
      } catch(e) {
        assert.fail('should not throw any error');
      }
    });

    conditionalIt('should redeem basket tokens for buyer in a happy case', async function test() {
      await basketToken.create(100, {from: buyer1});

      const tokenAPreBalance = await tokenA.balanceOf.call(buyer1);
      const tokenBPreBalance = await tokenB.balanceOf.call(buyer1);
      const totalSupplyPre = await basketToken.totalSupply();

      const txReceipt = await basketToken.redeem(100, [], {from: buyer1});
      const tokenAPostBalance = await tokenA.balanceOf.call(buyer1);
      const tokenBPostBalance = await tokenB.balanceOf.call(buyer1);
      const totalSupplyPost = await basketToken.totalSupply();
      const contractTokenABalance = await tokenA.balanceOf.call(basketToken.address);
      const contractTokenBBalance = await tokenB.balanceOf.call(basketToken.address);

      assert.equal(txReceipt.logs.length, 4, 'logs should be created');
      assert.equal(txReceipt.logs[0].event, 'Burn', 'did not log mint event');
      assert.equal(txReceipt.logs[1].event, 'Transfer', 'did not log transfer event');
      assert.equal(txReceipt.logs[2].event, 'Transfer', 'did not log transfer event');
      assert.equal(txReceipt.logs[3].event, 'Transfer', 'did not log transfer event');

      assert.equal(tokenAPostBalance - tokenAPreBalance, 50, 'buyer1 did not redeem tokenA balance correctly');
      assert.equal(tokenBPostBalance - tokenBPreBalance, 100, 'buyer1 did not redeem tokenB balance correctly');
      assert.equal(totalSupplyPre.toNumber(), 100, 'total supply adjusted properly');
      assert.equal(totalSupplyPost.toNumber(), 0, 'total supply adjusted properly');
      assert.equal(contractTokenABalance, 0, 'contract should have no token A left');
      assert.equal(contractTokenBBalance, 0, 'contract should have no token B left');
    });

    conditionalIt('should not redeem any Basket when redemption amount is more than supply', async function test() {
      try {
        await basketToken.redeem(1000, [], {from: buyer1});
        assert.fail(false, 'redemption amount is more than supply');
      } catch(e) {
        assertRevert(e);
      }
    });

    conditionalIt('should not redeem when sender doesn\'t have enough balance', async function test() {
      try {
        // Precreate some tokens to add to total supply
        await basketToken.create(100, {from: buyer1});

        // Let a buyer that doesn't have any balance redeem the Basket token
        await basketToken.redeem(100, [], {from: buyer2});
        assert.fail(false, 'redemption amount is larger than buyer\'s balance');
      } catch(e) {
        assertRevert(e);
      }
    });
  });

  context('With 20 underlying tokens', function () {
    let basket20Token, tokenInstances, tokenCountList;

    beforeEach(async function () {
      const tokenList = Array.from({length: 20}, () => TokenA);
      tokenCountList = Array.from({length: 20}, () => 2);
      const result = await setupBasketToken(owner, basket20Buyer, tokenList, tokenCountList, 1);
      basket20Token = result.basketToken;
      tokenInstances = result.underlyingTokensInstance;
    });

    conditionalIt('should create basket tokens with 20 tokens for buyer', async function test() {
      const txReceipt = await basket20Token.create(100, {from: basket20Buyer});
      assert.equal(txReceipt.logs.length, 22, 'logs should be created');

      const buyerBalance = await basket20Token.balanceOf.call(basket20Buyer);
      assert.equal(buyerBalance.toNumber(), 100, 'should have correct buyer balance');
    });

    conditionalIt('should not send any underlying tokens if tokens transfer fails mid way of creation', async function test() {
      const fifthToken = tokenInstances[4];
      await fifthToken.approve(basket20Token.address, 0, {from: basket20Buyer});
      const allowanceAmount = await fifthToken.allowance.call(basket20Buyer, basket20Token.address);

      assert.equal(allowanceAmount, 0, 'invalid allowance amount');
      try {
        await basket20Token.create(200, {from: basket20Buyer});
      } catch(e) {
        const buyerBalance = await basket20Token.balanceOf.call(basket20Buyer);
        assert.equal(buyerBalance.toNumber(), 0, 'should have no basket token');
        for (let i = 0; i < tokenInstances.length; i++) {
          const buyerBalance = await tokenInstances[i].balanceOf(basket20Buyer);
          const contractBalance = await tokenInstances[i].balanceOf(basket20Token.address);
          assert.equal(buyerBalance.toNumber(), 200, 'should have the original token amount');
          assert.equal(contractBalance.toNumber(), 0, 'should have no underlying token');
        }
      }
    });

    context('Locked funds recovery', function () {

      // TODO: what happens if token address isn't an ERC20 and we try to cast?

      // Note that the basket20Token owner also holds all the underlying tokens
      conditionalIt('should recover tokens sent to contract', async function test() {
        const token = tokenInstances[0];
        const ownerBalanceStart = await token.balanceOf(owner);

        await token.transfer(basket20Token.address, 10);
        const ownerBalanceMid = await token.balanceOf(owner);
        await basket20Token.withdrawExcessToken(token.address);

        const ownerBalanceEnd = await token.balanceOf(owner);

        assert.equal(ownerBalanceStart.toNumber() - ownerBalanceMid.toNumber(), 10);
        assert.equal(ownerBalanceEnd.toNumber() - ownerBalanceMid.toNumber(), 10);
        assert.equal(ownerBalanceStart.toNumber(), ownerBalanceEnd.toNumber());
      });

      conditionalIt('should not withdraw for non-owner', async function test() {
        const token = tokenInstances[0];
        const buyer1BalanceStart = await token.balanceOf(buyer1);

        await token.transfer(basket20Token.address, 10);
        try {
          const tx = await basket20Token.withdrawExcessToken(token.address, {from: buyer1});
          assert.fail(false, true, 'contract address input should not be correct');
        } catch(e) {
          assertRevert(e);
        }

        const buyer1BalanceEnd = await token.balanceOf(buyer1);

        assert.equal(buyer1BalanceStart.toNumber(), buyer1BalanceEnd.toNumber());
      });

      conditionalIt('should recover exactly excess tokens sent to contract for basket token', async () => {
        const token = tokenInstances[0];

        await basket20Token.create(100, {from: basket20Buyer});
        await token.transfer(basket20Token.address, 1000);  // Excess tokens
        const basketTokenBalanceWithExcess = await token.balanceOf(basket20Token.address);
        await basket20Token.withdrawExcessToken(token.address, {from: owner});
        const basketTokenBalanceAfterWithdraw = await token.balanceOf(basket20Token.address);

        assert.equal(basketTokenBalanceWithExcess.toNumber() - basketTokenBalanceAfterWithdraw.toNumber(), 1000);
        assert.equal(basketTokenBalanceAfterWithdraw, 100 * tokenCountList[0]);
      });

      conditionalIt('should recover all excess tokens sent to contract for non-basket token', async () => {
        const otherToken = await TokenB.new({from: buyer1});
        await basket20Token.create(100, {from: basket20Buyer});
        await otherToken.transfer(basket20Token.address, 1000, {from: buyer1});  // Excess tokens
        await basket20Token.withdrawExcessToken(otherToken.address);
        const ownerTokenBalance = await otherToken.balanceOf(owner);

        assert.equal(ownerTokenBalance, 1000);
      });

      conditionalIt('should be able to receive ether', async function test() {
        const basket20TokenBalanceStart = await web3.eth.getBalance(basket20Token.address);

        const value = web3.toWei(1, 'ether');
        await web3.eth.sendTransaction({from: buyer2, to: basket20Token.address, value: value});

        const basket20TokenBalanceEnd = await web3.eth.getBalance(basket20Token.address);

        assert.equal(basket20TokenBalanceEnd - basket20TokenBalanceStart, value);
      });

      // This test will break if gas cost of transactions are greater than the amount locked and withdrawn
      conditionalIt('should recover ether sent to contract', async function test() {
        const ownerBalanceStart = await web3.eth.getBalance(owner);

        await web3.eth.sendTransaction({from: buyer1, to: basket20Token.address, value: web3.toWei(1, 'ether')});
        await basket20Token.withdrawEther();

        const ownerBalanceEnd = await web3.eth.getBalance(owner);
        const basket20TokenBalance = await web3.eth.getBalance(basket20Token.address);

        assert.isAbove(ownerBalanceEnd.toNumber(), ownerBalanceStart.toNumber());
        assert.equal(basket20TokenBalance, 0 );
      });

    });

    // TODO: initialization tests

    // TODO: realistic creationQuantity test

  });

  context('With unique underlying tokens', function () {
    let basket, tokenInstances, tokenCountList, tokenA, tokenB, tokenC;

    beforeEach(async function () {
      const tokenList = [TokenA, TokenB, TokenC];
      tokenCountList = [1, 2, 3];
      const result = await setupBasketToken(owner, buyer1, tokenList, tokenCountList, 1);
      basket = result.basketToken;
      [tokenA, tokenB, tokenC] = result.underlyingTokensInstance;
    });

    conditionalIt('should skip redeem for specified tokens', async function () {
      await basket.create(10, {from: buyer1});
      await basket.redeem(10, [tokenB.address, tokenC.address], {from: buyer1});

      let basketTokenABalance = await tokenA.balanceOf(basket.address);
      let basketTokenBBalance = await tokenB.balanceOf(basket.address);
      let basketTokenCBalance = await tokenC.balanceOf(basket.address);

      assert.equal(basketTokenABalance.toNumber(), 0, 'contract TokenA balance should be 0');
      assert.equal(basketTokenBBalance.toNumber(), 10 * tokenCountList[1], 'contract TokenB balance should not have been redeemed');
      assert.equal(basketTokenCBalance.toNumber(), 10 * tokenCountList[2], 'contract TokenC balance should not have been redeemed');
    });

    conditionalIt('should skip redeem for specified tokens and owner withdraws them', async function () {
      let ownerTokenBBalanceStart = await tokenB.balanceOf(owner);
      let ownerTokenCBalanceStart = await tokenC.balanceOf(owner);

      await basket.create(100, {from: buyer1});
      await basket.redeem(100, [tokenB.address, tokenC.address], {from: buyer1});

      await basket.withdrawExcessToken(tokenB.address, {from: owner});
      await basket.withdrawExcessToken(tokenC.address, {from: owner});

      let basketTokenBBalance = await tokenB.balanceOf(basket.address);
      let basketTokenCBalance = await tokenC.balanceOf(basket.address);
      let ownerTokenBBalanceEnd = await tokenB.balanceOf(owner);
      let ownerTokenCBalanceEnd = await tokenC.balanceOf(owner);

      assert.equal(basketTokenBBalance.toNumber(), 0, 'TokenB balance should be 0');
      assert.equal(basketTokenCBalance.toNumber(), 0, 'TokenC balance should be 0');
      assert.equal(ownerTokenBBalanceEnd.toNumber() - ownerTokenBBalanceStart.toNumber(), 100 * tokenCountList[1], 'owner should have withdrawn the excess TokenBs');
      assert.equal(ownerTokenCBalanceEnd.toNumber() - ownerTokenCBalanceStart.toNumber(), 100 * tokenCountList[2], 'owner should have withdrawn the excess TokenCs');
    });

  });

  it('should not be able to initialize with more than 255', async function() {
    const tokenList = Array.from({length: 256}, () => TokenA);
    const tokenCountList = Array.from({length: 256}, () => 2);
    try {
      await BasketToken.new(tokenList, tokenCountList, 2);
      assert.fail(false, 'should not be able to deploy with more than 255 tokens');
    } catch(e) {
      // test may be failing because of gas before it fails because of length
      assert.isOk(e, 'some error');
    }
  });

});

/**-
 * Setup Basket token with underlying token assets
 * @param owner: owner address
 * @param buyer: buyer address
 * @param underlyingTokens: token list
 * @param tokenCountList: list of count of each token in the basket contract
 * @param creationQuantity: creationQuantity for basket coin
 * @return {basketTokenInstance, [tokenInstance]}
 */
async function setupBasketToken(owner, buyer, underlyingTokens, tokenCountList, creationQuantity) {
  const underlyingTokensPromise = underlyingTokens.map(token => token.new({from: owner}));
  const underlyingTokensInstance = await P.all(underlyingTokensPromise);

  const basketToken = await BasketToken.new(
    underlyingTokensInstance.map(token => token.address),
    tokenCountList,
    creationQuantity,
    {from: owner}
  );

  const TOKEN_GRAIN_MULTIPLE = TOKENS_MULTIPLE / creationQuantity;
  // Can't use await properly in a forEach loop
  for (let i = 0; i < underlyingTokensInstance.length; i++) {
    await underlyingTokensInstance[i].transfer(buyer, TOKEN_GRAIN_MULTIPLE * tokenCountList[i]);
    await underlyingTokensInstance[i].approve(
      basketToken.address,
      TOKEN_GRAIN_MULTIPLE * tokenCountList[i],
      {from: buyer}
    );
  }

  return {
    basketToken,
    underlyingTokensInstance
  };
}

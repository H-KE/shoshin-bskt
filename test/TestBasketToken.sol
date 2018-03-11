pragma solidity ^0.4.18;


import "truffle/Assert.sol";
import "../contracts/BasketToken.sol";
import "../contracts/TokenA.sol";


/// @dev Exposed version of BasketToken so that internal functions can be tested.
/// Internal functions are copied and renamed with the prefix `_`.
contract ExposedBasketToken is BasketToken {

    function ExposedBasketToken(address[] addresses, uint[] units, uint _creationQuantity) BasketToken(addresses, units, _creationQuantity) public {
    }

    function _getTokenUnits(address token) public returns (uint256, bool) {
        return getTokenUnits(token);
    }

    function _mint(address to, uint256 amount) public returns (bool) {
        return mint(to, amount);
    }

    function _burn(address from, uint256 amount) public returns (bool) {
        return burn(from, amount);
    }

}


contract TestBasketToken {

    ExposedBasketToken basket;
    address account1 = address(0xdeae3325a66eb9b9ea83b404dc10fd7c2946ece9);

    /// @dev beforeEach is causing an out of gas error, so using setup() instead for now
    function beforeEach() public {
    }

    /// @dev beforeEach isn't resetting state between tests, so using this for
    /// tests that require a clean instance
    /// @return basket Exposed version of the Basket Token contract
    function setup() public returns (ExposedBasketToken) {
        ExposedBasketToken _basket;
        address[] storage addresses;
        uint[] storage units;
        addresses.push(address(0x1));
        addresses.push(address(0x2));
        addresses.push(address(0x3));
        units.push(1);
        units.push(2);
        units.push(3);
        _basket = new ExposedBasketToken(
            addresses,
            units,
            1
        );
        return _basket;
    }

    function testGetTokenUnits() public {
        ExposedBasketToken _basket = setup();
        address query = address(0x2);
        uint unit;
        bool ok;
        (unit, ok) = _basket._getTokenUnits(query);
        Assert.equal(ok, true, "should be ok");
        Assert.equal(unit, 2, "should get the correct token info unit");
    }

    function testGetTokenUnitsFail() public {
        ExposedBasketToken _basket = setup();
        address query = address(0x0);
        uint unit;
        bool ok;
        (unit, ok) = _basket._getTokenUnits(query);
        Assert.equal(ok, false, "should not be ok");
        Assert.equal(unit, 0, "should be 0");
    }

    function testMint() public {
        ExposedBasketToken _basket = setup();
        uint amount = 1000;
        bool ok = _basket._mint(account1, amount);
        Assert.equal(ok, true, "ok");
        Assert.equal(_basket.balanceOf(account1), amount, "account balance should be equal to amount");
        Assert.equal(_basket.totalSupply(), amount, "total supply should be equal to amount");
    }

    function testBurn() public {
        ExposedBasketToken _basket = setup();
        uint amountToMint = 1000;
        bool ok1 = _basket._mint(account1, amountToMint);
        Assert.equal(ok1, true, "ok");
        Assert.equal(_basket.balanceOf(account1), amountToMint, "account balance should be equal to amountToMint");
        Assert.equal(_basket.totalSupply(), amountToMint, "total supply should be equal to amountToMint");

        uint amountToBurn = 500;
        bool ok2 = _basket._burn(account1, amountToBurn);
        Assert.equal(ok2, true, "ok");
        Assert.equal(_basket.balanceOf(account1), amountToMint - amountToBurn, "account balance should be equal");
        Assert.equal(_basket.totalSupply(), amountToMint - amountToBurn, "total supply should be equal");
    }

    // TODO: test _transferUnderlyingTokensWhenCreate

    // TODO: test _transferUnderlyingTokensWhenRedeem

}

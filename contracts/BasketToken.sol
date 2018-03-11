pragma solidity ^0.4.18;


import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


library AddressArrayUtils {

    /// @return Returns index and ok of the first occurrence starting from index 0
    function index(address[] addresses, address a) internal pure returns (uint, bool) {
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == a) {
                return (i, true);
            }
        }
        return (0, false);
    }

}


/// @title A decentralized Basket-like ERC20 which gives the owner a claim to the
/// underlying assets
/// @notice Basket Tokens are transferable, and can be created and redeemed by
/// anyone. To create, a user must approve the contract to move the underlying
/// tokens, then call `create()`.
/// @author Daniel Que and Quan Pham
contract BasketToken is StandardToken, Pausable {
    using SafeMath for uint256;
    using AddressArrayUtils for address[];

    string constant public name = "ERC20 TWENTY";
    string constant public symbol = "ETW";
    uint8 constant public decimals = 18;
    struct TokenInfo {
        address addr;
        uint256 tokenUnits;
    }
    uint256 private creationQuantity_;
    TokenInfo[] public tokens;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    /// @notice Requires value to be divisible by creationQuantity
    /// @param value Number to be checked
    modifier requireMultiple(uint256 value) {
        require((value % creationQuantity_) == 0);
        _;
    }

    /// @notice Requires value to be non-zero
    /// @param value Number to be checked
    modifier requireNonZero(uint256 value) {
        require(value > 0);
        _;
    }

    /// @notice Initializes contract with a list of ERC20 token addresses and
    /// corresponding minimum number of units required for a creation unit
    /// @param addresses Addresses of the underlying ERC20 token contracts
    /// @param tokenUnits Number of token base units required per creation unit
    /// @param _creationQuantity Number of base units per creation unit
    function BasketToken(
        address[] addresses,
        uint256[] tokenUnits,
        uint256 _creationQuantity
    ) public {
        require(0 < addresses.length && addresses.length < 256);
        require(addresses.length == tokenUnits.length);
        require(_creationQuantity >= 1);

        creationQuantity_ = _creationQuantity;

        for (uint8 i = 0; i < addresses.length; i++) { // Using uint8 because we expect maximum of 256 underlying tokens
            tokens.push(TokenInfo({
                addr: addresses[i],
                tokenUnits: tokenUnits[i]
            }));
        }
    }

    /// @notice Returns the creationQuantity
    /// @dev Creation quantity concept is similar but not identical to the one
    /// described by EIP777
    /// @return creationQuantity_ Creation quantity of the Basket token
    function creationQuantity() external view returns(uint256) {
        return creationQuantity_;
    }

    /// @notice Creates Basket tokens in exchange for underlying tokens. Before
    /// calling, underlying tokens must be approved to be moved by the Basket Token
    /// contract. The number of approved tokens required depends on
    /// baseUnits.
    /// @dev If any underlying tokens' `transferFrom` fails (eg. the token is
    /// frozen), create will no longer work. At this point a token upgrade will
    /// be necessary.
    /// @param baseUnits Number of base units to create. Must be a multiple of
    /// creationQuantity.
    function create(uint256 baseUnits)
        external
        whenNotPaused()
        requireNonZero(baseUnits)
        requireMultiple(baseUnits)
    {
        // Check overflow
        require((totalSupply_ + baseUnits) > totalSupply_);

        for (uint8 i = 0; i < tokens.length; i++) {
            TokenInfo memory tokenInfo = tokens[i];
            ERC20 erc20 = ERC20(tokenInfo.addr);
            uint256 amount = baseUnits.div(creationQuantity_).mul(tokenInfo.tokenUnits);
            require(erc20.transferFrom(msg.sender, address(this), amount));
        }

        mint(msg.sender, baseUnits);
    }

    /// @notice Redeems Basket Token in return for underlying tokens
    /// @param baseUnits Number of base units to redeem. Must be a multiple of
    /// creationQuantity.
    /// @param tokensToSkip Underlying token addresses to skip redemption for.
    /// Intended to be used to skip frozen or broken tokens which would prevent
    /// all underlying tokens from being withdrawn due to a revert. Skipped
    /// tokens will be left in the Basket Token contract and will be unclaimable.
    function redeem(uint256 baseUnits, address[] tokensToSkip)
        external
        whenNotPaused()
        requireNonZero(baseUnits)
        requireMultiple(baseUnits)
    {
        require((totalSupply_ >= baseUnits));
        require((balances[msg.sender] >= baseUnits));
        require(tokensToSkip.length <= tokens.length);

        // Burn before to prevent re-entrancy
        burn(msg.sender, baseUnits);

        for (uint8 i = 0; i < tokens.length; i++) {
            TokenInfo memory tokenInfo = tokens[i];
            ERC20 erc20 = ERC20(tokenInfo.addr);
            uint256 index;
            bool ok;
            (index, ok) = tokensToSkip.index(tokenInfo.addr);
            if (ok) {
                continue;
            }
            uint256 amount = baseUnits.div(creationQuantity_).mul(tokenInfo.tokenUnits);
            require(erc20.transfer(msg.sender, amount));
        }
    }

    /// @return tokenAddresses Underlying token addresses
    function tokenAddresses() external view returns (address[]){
        address[] memory tokenAddresses = new address[](tokens.length);
        for (uint8 i = 0; i < tokens.length; i++) {
            tokenAddresses[i] = tokens[i].addr;
        }
        return tokenAddresses;
    }

    /// @return tokenUnits Number of token base units required per creation unit
    function tokenUnits() external view returns (uint256[]){
        uint256[] memory tokenUnits = new uint256[](tokens.length);
        for (uint8 i = 0; i < tokens.length; i++) {
            tokenUnits[i] = tokens[i].tokenUnits;
        }
        return tokenUnits;
    }

    // @dev Mints new Basket tokens
    // @param to
    // @param amount
    // @return ok
    function mint(address to, uint256 amount) internal returns (bool) {
        totalSupply_ = totalSupply_.add(amount);
        balances[to] = balances[to].add(amount);
        Mint(to, amount);
        Transfer(address(0), to, amount);
        return true;
    }

    // @dev Burns Basket tokens
    // @param from
    // @param amount
    // @return ok
    function burn(address from, uint256 amount) internal returns (bool) {
        totalSupply_ = totalSupply_.sub(amount);
        balances[from] = balances[from].sub(amount);
        Burn(from, amount);
        Transfer(from, address(0), amount);
        return true;
    }

    // @notice Look up token info
    // @param token Token address to look up
    // @return (tokenUnits, ok) Units of underlying token, and whether the
    // operation was successful
    function getTokenUnits(address token) internal view returns (uint256, bool) {
        for (uint8 i = 0; i < tokens.length; i++) {
            if (tokens[i].addr == token) {
                return (tokens[i].tokenUnits, true);
            }
        }
        return (0, false);
    }

    /// @notice Owner: Withdraw excess funds which don't belong to Basket Token
    /// holders
    /// @param token ERC20 token address to withdraw
    function withdrawExcessToken(address token)
        external
        onlyOwner
    {
        ERC20 erc20 = ERC20(token);
        uint256 withdrawAmount;
        uint256 amountOwned = erc20.balanceOf(address(this));
        uint256 tokenUnits;
        bool ok;
        (tokenUnits, ok) = getTokenUnits(token);
        if (ok) {
            withdrawAmount = amountOwned.sub(totalSupply_.div(creationQuantity_).mul(tokenUnits));
        } else {
            withdrawAmount = amountOwned;
        }
        require(erc20.transfer(owner, withdrawAmount));
    }

    /// @notice Owner: Withdraw Ether
    function withdrawEther()
        external
        onlyOwner
    {
        owner.transfer(this.balance);
    }

    /// @notice Fallback function
    function() external payable {
    }

}

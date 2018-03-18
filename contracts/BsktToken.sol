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


/// @title A decentralized Bskt-like ERC20 which gives the owner a claim to the
/// underlying assets
/// @notice Bskt Tokens are transferable, and can be created and redeemed by
/// anyone. To create, a user must approve the contract to move the underlying
/// tokens, then call `create()`.
/// @author Daniel Que and Quan Pham
contract BsktToken is StandardToken, Pausable {
    using SafeMath for uint256;
    using AddressArrayUtils for address[];

    string public name;
    string public symbol;
    uint8 constant public decimals = 18;
    struct TokenInfo {
        address addr;
        uint256 quantity;
    }
    uint256 private creationUnit_;
    TokenInfo[] public tokens;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    /// @notice Requires value to be divisible by creationUnit
    /// @param value Number to be checked
    modifier requireMultiple(uint256 value) {
        require((value % creationUnit_) == 0);
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
    /// @param quantities Number of token base units required per creation unit
    /// @param _creationUnit Number of base units per creation unit
    function BsktToken(
        address[] addresses,
        uint256[] quantities,
        uint256 _creationUnit,
        string _name,
        string _symbol
    ) public {
        require(0 < addresses.length && addresses.length < 256);
        require(addresses.length == quantities.length);
        require(_creationUnit >= 1);

        for (uint256 i = 0; i < addresses.length; i++) {
            tokens.push(TokenInfo({
                addr: addresses[i],
                quantity: quantities[i]
            }));
        }

        creationUnit_ = _creationUnit;
        name = _name;
        symbol = _symbol;
    }

    /// @notice Returns the creationUnit
    /// @dev Creation quantity concept is similar but not identical to the one
    /// described by EIP777
    /// @return creationUnit_ Creation quantity of the Bskt token
    function creationUnit() external view returns(uint256) {
        return creationUnit_;
    }

    /// @notice Creates Bskt tokens in exchange for underlying tokens. Before
    /// calling, underlying tokens must be approved to be moved by the Bskt Token
    /// contract. The number of approved tokens required depends on
    /// baseUnits.
    /// @dev If any underlying tokens' `transferFrom` fails (eg. the token is
    /// frozen), create will no longer work. At this point a token upgrade will
    /// be necessary.
    /// @param baseUnits Number of base units to create. Must be a multiple of
    /// creationUnit.
    function create(uint256 baseUnits)
        external
        whenNotPaused()
        requireNonZero(baseUnits)
        requireMultiple(baseUnits)
    {
        // Check overflow
        require((totalSupply_ + baseUnits) > totalSupply_);

        for (uint256 i = 0; i < tokens.length; i++) {
            TokenInfo memory token = tokens[i];
            ERC20 erc20 = ERC20(token.addr);
            uint256 amount = baseUnits.div(creationUnit_).mul(token.quantity);
            require(erc20.transferFrom(msg.sender, address(this), amount));
        }

        mint(msg.sender, baseUnits);
    }

    /// @notice Redeems Bskt Token in return for underlying tokens
    /// @param baseUnits Number of base units to redeem. Must be a multiple of
    /// creationUnit.
    /// @param tokensToSkip Underlying token addresses to skip redemption for.
    /// Intended to be used to skip frozen or broken tokens which would prevent
    /// all underlying tokens from being withdrawn due to a revert. Skipped
    /// tokens will be left in the Bskt Token contract and will be unclaimable.
    function redeem(uint256 baseUnits, address[] tokensToSkip)
        external
        requireNonZero(baseUnits)
        requireMultiple(baseUnits)
    {
        require(baseUnits <= totalSupply_);
        require(baseUnits <= balances[msg.sender]);
        require(tokensToSkip.length <= tokens.length);
        // Total supply check not required since a user would have to have balance greater than the total supply

        // Burn before to prevent re-entrancy
        burn(msg.sender, baseUnits);

        for (uint256 i = 0; i < tokens.length; i++) {
            TokenInfo memory token = tokens[i];
            ERC20 erc20 = ERC20(token.addr);
            uint256 index;
            bool ok;
            (index, ok) = tokensToSkip.index(token.addr);
            if (ok) {
                continue;
            }
            uint256 amount = baseUnits.div(creationUnit_).mul(token.quantity);
            require(erc20.transfer(msg.sender, amount));
        }
    }

    /// @return addresses Underlying token addresses
    function tokenAddresses() external view returns (address[]){
        address[] memory addresses = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            addresses[i] = tokens[i].addr;
        }
        return addresses;
    }

    /// @return quantities Number of token base units required per creation unit
    function tokenQuantities() external view returns (uint256[]){
        uint256[] memory quantities = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            quantities[i] = tokens[i].quantity;
        }
        return quantities;
    }

    // @dev Mints new Bskt tokens
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

    // @dev Burns Bskt tokens
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
    // @return (quantity, ok) Units of underlying token, and whether the
    // operation was successful
    function getQuantities(address token) internal view returns (uint256, bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i].addr == token) {
                return (tokens[i].quantity, true);
            }
        }
        return (0, false);
    }

    /// @notice Owner: Withdraw excess funds which don't belong to Bskt Token
    /// holders
    /// @param token ERC20 token address to withdraw
    function withdrawExcessToken(address token)
        external
        onlyOwner
    {
        ERC20 erc20 = ERC20(token);
        uint256 withdrawAmount;
        uint256 amountOwned = erc20.balanceOf(address(this));
        uint256 quantity;
        bool ok;
        (quantity, ok) = getQuantities(token);
        if (ok) {
            withdrawAmount = amountOwned.sub(totalSupply_.div(creationUnit_).mul(quantity));
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

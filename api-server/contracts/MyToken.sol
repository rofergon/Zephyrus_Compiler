// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MyToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC20Permit {
    // Custom events
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) 
        ERC20(name, symbol)
        Ownable(initialOwner)
        ERC20Permit(name)
    {
        // Initial supply can be minted here if desired
        // _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mints new tokens. Only callable by owner.
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Pauses all token transfers. Only callable by owner.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers. Only callable by owner.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // Required overrides
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
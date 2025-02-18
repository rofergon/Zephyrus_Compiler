// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    uint256 private constant WEIGHT = 1000000;
    uint256 private constant MAX_SUPPLY = 1000000000 * 10**18;

    mapping(uint256 => uint256) public priceHistory;
    uint256 public lastPriceBlock;

    constructor(string memory name, string memory symbol, uint256 initialSupply) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {
        _mint(msg.sender, initialSupply);
        updatePriceHistory();
    }

    function _currentPrice() internal view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return MAX_SUPPLY * WEIGHT;
        }
        return (MAX_SUPPLY - supply) * WEIGHT / supply;
    }

    function currentPrice() public view returns (uint256) {
        return _currentPrice();
    }

    function updatePriceHistory() public {
        uint256 currentBlock = block.number;
        if (currentBlock > lastPriceBlock) {
            priceHistory[currentBlock] = _currentPrice();
            lastPriceBlock = currentBlock;
        }
    }

    function getPriceAtBlock(uint256 blockNumber) public view returns (uint256) {
        return priceHistory[blockNumber];
    }

    function mint(uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "ERC20Capped: cap exceeded");
        _mint(msg.sender, amount);
        updatePriceHistory();
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        updatePriceHistory();
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        bool success = super.transfer(recipient, amount);
        updatePriceHistory();
        return success;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        bool success = super.transferFrom(sender, recipient, amount);
        updatePriceHistory();
        return success;
    }
}
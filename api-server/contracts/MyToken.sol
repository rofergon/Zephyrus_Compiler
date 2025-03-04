// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // Constructor sin parámetros que establece valores predeterminados
    constructor() ERC20("MITO", "MTO") Ownable(msg.sender) {
        // Mint inicial de 5000 tokens al deployer del contrato
        _mint(msg.sender, 5000 * 10 ** decimals());
    }

    // Función para mintear más tokens (solo el owner puede hacerlo)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
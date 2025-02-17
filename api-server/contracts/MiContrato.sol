// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MiContrato {
    string public mensaje;

    constructor() {
        mensaje = 'Hola Sonic';
    }

    function setMensaje(string memory _mensaje) public {
        mensaje = _mensaje;
    }
}
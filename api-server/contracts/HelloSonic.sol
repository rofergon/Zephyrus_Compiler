// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelloSonic {
    string public message;
    
    constructor(string memory _message) {
        message = _message;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}
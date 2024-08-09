// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

library String {
    function toString(uint256 value) internal pure returns(string memory) {
        return Strings.toString(value);
    }

    function memcmp(bytes memory a, bytes memory b) internal pure returns(bool){
        return (a.length == b.length) && (keccak256(a) == keccak256(b));
    }

    function strcmp(string memory a, string memory b) internal pure returns(bool){
        return memcmp(bytes(a), bytes(b));
    }
}

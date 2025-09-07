// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Simple on-chain list of payers per merchant
/// Merchants manage their own list via add/remove and anyone can read
contract PayerRegistry {
  mapping(address => address[]) private payersByMerchant;
  mapping(address => mapping(address => bool)) public isPayerForMerchant;

  event PayerAdded(address indexed merchant, address indexed payer);
  event PayerRemoved(address indexed merchant, address indexed payer);

  function addPayer(address payer) external {
    require(payer != address(0), "payer=0");
    if (!isPayerForMerchant[msg.sender][payer]) {
      isPayerForMerchant[msg.sender][payer] = true;
      payersByMerchant[msg.sender].push(payer);
      emit PayerAdded(msg.sender, payer);
    }
  }

  function removePayer(address payer) external {
    if (!isPayerForMerchant[msg.sender][payer]) return;
    isPayerForMerchant[msg.sender][payer] = false;
    address[] storage arr = payersByMerchant[msg.sender];
    for (uint256 i = 0; i < arr.length; i++) {
      if (arr[i] == payer) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        break;
      }
    }
    emit PayerRemoved(msg.sender, payer);
  }

  function getPayers(address merchant) external view returns (address[] memory) {
    return payersByMerchant[merchant];
  }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@redstone-finance/evm-connector/contracts/core/RedstoneConsumerNumericBase.sol";
import "@redstone-finance/evm-connector/contracts/mocks/AuthorisedMockSignersBase.sol";

/**
 * USD-denominated subscription payments powered by RedStone
 * - Payers deposit ETH
 * - Subscriptions are priced in USD cents per period
 * - Anyone can trigger a charge when the period elapses by attaching RedStone price data
 * - Uses RedStone on-demand calldata pattern (no persistent on-chain storage of prices)
 *
 * Notes:
 * - For demo/tests we authorise Hardhat mock signers and require 1 unique signer
 * - For production, inherit an appropriate DataService base (e.g. PrimaryProdDataServiceConsumerBase)
 *   and set threshold/signers accordingly
 */
contract UsdSubscription is RedstoneConsumerNumericBase, AuthorisedMockSignersBase {
  // RedStone price feeds use bytes32 identifiers, e.g. "ETH"
  bytes32 private constant ETH_FEED_ID = bytes32("ETH");

  // RedStone USD feeds use 8 decimals by convention
  uint256 private constant FEED_DECIMALS = 8;

  struct Plan {
    address merchant;
    uint256 usdCentsPerPeriod; // e.g. 999 for $9.99
    uint256 period; // in seconds
    uint256 lastCharged; // timestamp
    uint256 maxEthPerChargeWei; // payer-provided cap for safety
    bool active;
  }

  mapping(address => uint256) public ethBalances; // payer => ETH balance (wei)
  mapping(address => Plan) public plans; // payer => plan

  event Deposited(address indexed payer, uint256 amount);
  event Withdrawn(address indexed payer, uint256 amount);
  event Subscribed(address indexed payer, address indexed merchant, uint256 usdCentsPerPeriod, uint256 period, uint256 maxEthPerChargeWei);
  event Cancelled(address indexed payer);
  event Charged(address indexed payer, address indexed merchant, uint256 usdCents, uint256 priceEthUsd_8, uint256 paidEthWei, uint256 nextChargeAt);

  // ============ RedStone overrides (demo settings) ============

  // Authorise the well-known Hardhat mock signers used by RedStone test wrappers
  function getAuthorisedSignerIndex(address receivedSigner) public view override returns (uint8) {
    return getAllMockAuthorised(receivedSigner);
  }

  // Require only 1 mock signer for tests/demos
  function getUniqueSignersThreshold() public pure override returns (uint8) {
    return 1;
  }

  // Optionally tighten timestamp validity by overriding validateTimestamp if needed

  // ============ Core logic ============

  function depositETH() external payable {
    require(msg.value > 0, "No ETH");
    ethBalances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value);
  }

  function withdrawETH(uint256 amount) external {
    require(amount > 0, "Zero");
    uint256 bal = ethBalances[msg.sender];
    require(bal >= amount, "Insufficient");
    unchecked { ethBalances[msg.sender] = bal - amount; }
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "Withdraw failed");
    emit Withdrawn(msg.sender, amount);
  }

  function subscribe(
    address merchant,
    uint256 usdCentsPerPeriod,
    uint256 period,
    uint256 maxEthPerChargeWei
  ) external {
    require(merchant != address(0), "merchant=0");
    require(usdCentsPerPeriod > 0, "price=0");
    require(period > 0, "period=0");
    plans[msg.sender] = Plan({
      merchant: merchant,
      usdCentsPerPeriod: usdCentsPerPeriod,
      period: period,
      lastCharged: 0,
      maxEthPerChargeWei: maxEthPerChargeWei,
      active: true
    });
    emit Subscribed(msg.sender, merchant, usdCentsPerPeriod, period, maxEthPerChargeWei);
  }

  function cancel() external {
    Plan storage p = plans[msg.sender];
    require(p.active, "no plan");
    p.active = false;
    emit Cancelled(msg.sender);
  }

  function nextChargeDueAt(address payer) public view returns (uint256) {
    Plan storage p = plans[payer];
    if (!p.active) return type(uint256).max;
    if (p.lastCharged == 0) return block.timestamp; // charge immediately for first cycle
    return p.lastCharged + p.period;
  }

  // Anyone can trigger; requires RedStone price payload appended to calldata
  function charge(address payer) external {
    Plan storage p = plans[payer];
    require(p.active, "no plan");
    require(block.timestamp >= nextChargeDueAt(payer), "not due");

    // Fetch ETH/USD price with 8 decimals from RedStone payload
    uint256 priceEthUsd_8 = getOracleNumericValueFromTxMsg(ETH_FEED_ID);
    require(priceEthUsd_8 > 0, "bad price");

    // Compute owed ETH in wei: ethWei = usdCents * 1e24 / price_8
    uint256 usdCents = p.usdCentsPerPeriod;
    uint256 ethWeiOwed = (usdCents * 1e24) / priceEthUsd_8;
    require(ethWeiOwed > 0, "tiny");
    require(ethWeiOwed <= p.maxEthPerChargeWei || p.maxEthPerChargeWei == 0, "exceeds cap");
    require(ethBalances[payer] >= ethWeiOwed, "insufficient balance");

    // Move funds
    unchecked { ethBalances[payer] -= ethWeiOwed; }
    (bool ok, ) = p.merchant.call{value: ethWeiOwed}("");
    require(ok, "pay fail");

    // Update schedule
    p.lastCharged = block.timestamp;
    emit Charged(payer, p.merchant, usdCents, priceEthUsd_8, ethWeiOwed, nextChargeDueAt(payer));
  }

  // Helper view to quote ETH for a USD cents amount using provided RedStone payload
  function quoteEthForUsdCents(uint256 usdCents) external view returns (uint256 ethWei) {
    uint256 priceEthUsd_8 = getOracleNumericValueFromTxMsg(ETH_FEED_ID);
    require(priceEthUsd_8 > 0, "bad price");
    return (usdCents * 1e24) / priceEthUsd_8;
  }

  receive() external payable {
    ethBalances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value);
  }
}

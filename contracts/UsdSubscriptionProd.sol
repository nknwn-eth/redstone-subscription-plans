// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";

interface IERC20Minimal {
  function decimals() external view returns (uint8);
  function transfer(address to, uint256 amount) external returns (bool);
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * Production-oriented variant using RedStone Primary Prod data service
 * with 3-of-N signer threshold. Adds ERC20 support and caller rewards.
 */
contract UsdSubscriptionProd is PrimaryProdDataServiceConsumerBase {
  bytes32 private constant ETH_FEED_ID = bytes32("ETH");
  uint256 private constant FEED_DECIMALS = 8;
  uint16 private constant BPS_DENOM = 10000;

  struct Plan {
    address merchant;
    address asset; // address(0) for ETH
    bytes32 feedId; // price feed id for asset in USD (e.g., "ETH", "USDC")
    uint16 callerFeeBps; // reward for the caller taken from payer balance
    uint256 usdCentsPerPeriod;
    uint256 period; // seconds
    uint256 lastCharged;
    uint256 maxUnitsPerCharge; // wei for ETH or token units for ERC20 (0 = uncapped)
    bool active;
  }

  mapping(address => uint256) public ethBalances; // payer => wei balance
  mapping(address => mapping(address => uint256)) public tokenBalances; // payer => token => units balance
  mapping(address => Plan) public plans;

  event Deposited(address indexed payer, uint256 amount);
  event Withdrawn(address indexed payer, uint256 amount);
  event TokenDeposited(address indexed payer, address indexed token, uint256 amount);
  event TokenWithdrawn(address indexed payer, address indexed token, uint256 amount);
  event SubscribedAdvanced(address indexed payer, address indexed merchant, address asset, bytes32 feedId, uint256 usdCentsPerPeriod, uint256 period, uint256 maxUnitsPerCharge, uint16 callerFeeBps);
  event Subscribed(address indexed payer, address indexed merchant, uint256 usdCentsPerPeriod, uint256 period, uint256 maxEthPerChargeWei);
  event Cancelled(address indexed payer);
  event Charged(address indexed payer, address indexed merchant, uint256 usdCents, uint256 price_8, uint256 paidUnits, uint256 nextChargeAt);
  event CallerReward(address indexed payer, address indexed caller, address indexed asset, uint256 rewardUnits);

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

  function depositToken(address token, uint256 amount) external {
    require(token != address(0), "token=0");
    require(amount > 0, "Zero");
    require(IERC20Minimal(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");
    tokenBalances[msg.sender][token] += amount;
    emit TokenDeposited(msg.sender, token, amount);
  }

  function withdrawToken(address token, uint256 amount) external {
    require(token != address(0), "token=0");
    require(amount > 0, "Zero");
    uint256 bal = tokenBalances[msg.sender][token];
    require(bal >= amount, "Insufficient");
    unchecked { tokenBalances[msg.sender][token] = bal - amount; }
    require(IERC20Minimal(token).transfer(msg.sender, amount), "transfer failed");
    emit TokenWithdrawn(msg.sender, token, amount);
  }

  function subscribe(
    address merchant,
    uint256 usdCentsPerPeriod,
    uint256 period,
    uint256 maxEthPerChargeWei
  ) external {
    // Backward-compatible ETH subscription (asset=ETH, feedId=ETH, no caller reward)
    require(merchant != address(0), "merchant=0");
    require(usdCentsPerPeriod > 0, "price=0");
    require(period > 0, "period=0");
    plans[msg.sender] = Plan({
      merchant: merchant,
      asset: address(0),
      feedId: ETH_FEED_ID,
      callerFeeBps: 0,
      usdCentsPerPeriod: usdCentsPerPeriod,
      period: period,
      lastCharged: 0,
      maxUnitsPerCharge: maxEthPerChargeWei,
      active: true
    });
    emit Subscribed(msg.sender, merchant, usdCentsPerPeriod, period, maxEthPerChargeWei);
  }

  function subscribeAdvanced(
    address merchant,
    address asset,
    bytes32 feedId,
    uint256 usdCentsPerPeriod,
    uint256 period,
    uint256 maxUnitsPerCharge,
    uint16 callerFeeBps
  ) external {
    require(merchant != address(0), "merchant=0");
    require(usdCentsPerPeriod > 0, "price=0");
    require(period > 0, "period=0");
    require(callerFeeBps < BPS_DENOM, "fee bps");
    plans[msg.sender] = Plan({
      merchant: merchant,
      asset: asset,
      feedId: feedId,
      callerFeeBps: callerFeeBps,
      usdCentsPerPeriod: usdCentsPerPeriod,
      period: period,
      lastCharged: 0,
      maxUnitsPerCharge: maxUnitsPerCharge,
      active: true
    });
    emit SubscribedAdvanced(msg.sender, merchant, asset, feedId, usdCentsPerPeriod, period, maxUnitsPerCharge, callerFeeBps);
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
    if (p.lastCharged == 0) return block.timestamp;
    return p.lastCharged + p.period;
  }

  function charge(address payer) external {
    Plan storage p = plans[payer];
    require(p.active, "no plan");
    require(block.timestamp >= nextChargeDueAt(payer), "not due");

    bytes32 feedId = p.feedId == bytes32(0) ? ETH_FEED_ID : p.feedId;
    uint256 price_8 = getOracleNumericValueFromTxMsg(feedId);
    require(price_8 > 0, "bad price");

    uint256 usdCents = p.usdCentsPerPeriod;
    uint256 owedUnits;
    address asset = p.asset; // 0 for ETH
    if (asset == address(0)) {
      // wei = usdCents * 1e24 / price_8
      owedUnits = (usdCents * 1e24) / price_8;
    } else {
      uint8 d = IERC20Minimal(asset).decimals();
      // tokens = (usdCents * 10^(d+8)) / (price_8 * 100)
      owedUnits = (usdCents * (10 ** (uint256(d) + 8))) / (price_8 * 100);
    }
    require(owedUnits > 0, "tiny");
    require(p.maxUnitsPerCharge == 0 || owedUnits <= p.maxUnitsPerCharge, "exceeds cap");

    uint256 fee = (owedUnits * p.callerFeeBps) / BPS_DENOM;
    uint256 toMerchant = owedUnits - fee;

    if (asset == address(0)) {
      require(ethBalances[payer] >= owedUnits, "insufficient balance");
      unchecked { ethBalances[payer] -= owedUnits; }
      (bool okM, ) = p.merchant.call{value: toMerchant}("");
      require(okM, "payM fail");
      if (fee > 0) {
        (bool okC, ) = msg.sender.call{value: fee}("");
        require(okC, "payC fail");
        emit CallerReward(payer, msg.sender, address(0), fee);
      }
    } else {
      require(tokenBalances[payer][asset] >= owedUnits, "insufficient balance");
      unchecked { tokenBalances[payer][asset] -= owedUnits; }
      require(IERC20Minimal(asset).transfer(p.merchant, toMerchant), "tpayM fail");
      if (fee > 0) {
        require(IERC20Minimal(asset).transfer(msg.sender, fee), "tpayC fail");
        emit CallerReward(payer, msg.sender, asset, fee);
      }
    }

    p.lastCharged = block.timestamp;
    emit Charged(payer, p.merchant, usdCents, price_8, owedUnits, nextChargeDueAt(payer));
  }

  function quoteEthForUsdCents(uint256 usdCents) external view returns (uint256 ethWei) {
    uint256 priceEthUsd_8 = getOracleNumericValueFromTxMsg(ETH_FEED_ID);
    require(priceEthUsd_8 > 0, "bad price");
    return (usdCents * 1e24) / priceEthUsd_8;
  }

  function quoteTokenForUsdCents(bytes32 feedId, address token, uint256 usdCents) external view returns (uint256 units) {
    require(token != address(0), "token=0");
    uint256 price_8 = getOracleNumericValueFromTxMsg(feedId);
    require(price_8 > 0, "bad price");
    uint8 d = IERC20Minimal(token).decimals();
    return (usdCents * (10 ** (uint256(d) + 8))) / (price_8 * 100);
  }

  receive() external payable {
    ethBalances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value);
  }
}

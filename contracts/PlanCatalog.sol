// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PlanCatalog {
  struct Template {
    address merchant;
    address asset; // 0 for ETH
    bytes32 feedId; // token/USD feed id (e.g., "ETH", "USDC")
    uint16 callerFeeBps;
    uint256 usdCentsPerPeriod;
    uint256 period; // seconds
    uint256 maxUnitsPerCharge; // 0 uncapped
    string name;
    bool active;
  }

  mapping(address => Template[]) private plansByMerchant;

  event PlanCreated(address indexed merchant, uint256 indexed planIndex, Template tpl);
  event PlanUpdated(address indexed merchant, uint256 indexed planIndex, Template tpl);
  event PlanStatus(address indexed merchant, uint256 indexed planIndex, bool active);

  function createPlan(
    address asset,
    bytes32 feedId,
    uint256 usdCentsPerPeriod,
    uint256 period,
    uint256 maxUnitsPerCharge,
    uint16 callerFeeBps,
    string calldata name
  ) external returns (uint256 idx) {
    require(usdCentsPerPeriod > 0, "price=0");
    require(period > 0, "period=0");
    Template memory tpl = Template({
      merchant: msg.sender,
      asset: asset,
      feedId: feedId,
      callerFeeBps: callerFeeBps,
      usdCentsPerPeriod: usdCentsPerPeriod,
      period: period,
      maxUnitsPerCharge: maxUnitsPerCharge,
      name: name,
      active: true
    });
    plansByMerchant[msg.sender].push(tpl);
    idx = plansByMerchant[msg.sender].length - 1;
    emit PlanCreated(msg.sender, idx, tpl);
  }

  function setActive(uint256 index, bool active) external {
    Template storage tpl = plansByMerchant[msg.sender][index];
    require(tpl.merchant == msg.sender, "forbidden");
    tpl.active = active;
    emit PlanStatus(msg.sender, index, active);
  }

  function updatePlan(
    uint256 index,
    address asset,
    bytes32 feedId,
    uint256 usdCentsPerPeriod,
    uint256 period,
    uint256 maxUnitsPerCharge,
    uint16 callerFeeBps,
    string calldata name
  ) external {
    Template storage tpl = plansByMerchant[msg.sender][index];
    require(tpl.merchant == msg.sender, "forbidden");
    tpl.asset = asset;
    tpl.feedId = feedId;
    tpl.usdCentsPerPeriod = usdCentsPerPeriod;
    tpl.period = period;
    tpl.maxUnitsPerCharge = maxUnitsPerCharge;
    tpl.callerFeeBps = callerFeeBps;
    tpl.name = name;
    emit PlanUpdated(msg.sender, index, tpl);
  }

  function getPlanCount(address merchant) external view returns (uint256) {
    return plansByMerchant[merchant].length;
  }

  function getPlan(address merchant, uint256 index) external view returns (
    address, address, bytes32, uint16, uint256, uint256, uint256, string memory, bool
  ) {
    Template storage t = plansByMerchant[merchant][index];
    return (t.merchant, t.asset, t.feedId, t.callerFeeBps, t.usdCentsPerPeriod, t.period, t.maxUnitsPerCharge, t.name, t.active);
  }
}


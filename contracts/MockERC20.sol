// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockERC20 {
  string public name;
  string public symbol;
  uint8 public immutable decimals;
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(string memory _name, string memory _symbol, uint8 _decimals) {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }

  function _transfer(address from, address to, uint256 amount) internal {
    require(to != address(0), "transfer to zero");
    uint256 bal = balanceOf[from];
    require(bal >= amount, "insufficient");
    unchecked { balanceOf[from] = bal - amount; }
    balanceOf[to] += amount;
    emit Transfer(from, to, amount);
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    require(allowed >= amount, "not allowed");
    if (allowed != type(uint256).max) {
      unchecked { allowance[from][msg.sender] = allowed - amount; }
    }
    _transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) external {
    require(to != address(0), "mint to zero");
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
  }
}


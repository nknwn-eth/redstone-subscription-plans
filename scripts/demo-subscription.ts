import { ethers } from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";

async function main() {
  const [deployer, payer, merchant, anyone] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Payer:", payer.address);
  console.log("Merchant:", merchant.address);

  const Factory = await ethers.getContractFactory("UsdSubscription");
  const contract = await Factory.deploy();
  await contract.deployed();
  console.log("UsdSubscription deployed at:", contract.address);

  const usdCents = 999; // $9.99 per period
  const period = 60; // 60 seconds
  await (await contract.connect(payer).subscribe(merchant.address, usdCents, period, 0)).wait();
  console.log("Subscribed. USD cents:", usdCents, "period:", period, "sec");

  await (await contract.connect(payer).depositETH({ value: ethers.utils.parseEther("0.1") })).wait();
  console.log("Payer deposited 0.1 ETH");

  // RedStone mock: ETH/USD = 3000 (8 decimals)
  const priceEthUsd_8 = ethers.BigNumber.from("300000000000"); // keep for expected calc (3000 * 1e8)
  const wrapped = WrapperBuilder.wrap(contract.connect(anyone)).usingSimpleNumericMock({
    mockSignersCount: 1,
    timestampMilliseconds: Date.now(),
    dataPoints: [
      { dataFeedId: "ETH", value: 3000, decimals: 8 },
    ],
  });

  const ethBefore = await ethers.provider.getBalance(merchant.address);
  const innerBefore = await contract.ethBalances(payer.address);

  const tx = await wrapped.charge(payer.address);
  const receipt = await tx.wait();
  console.log("Charge tx gas used:", receipt.gasUsed.toString());

  const ethAfter = await ethers.provider.getBalance(merchant.address);
  const innerAfter = await contract.ethBalances(payer.address);

  const expected = ethers.BigNumber.from(usdCents).mul(ethers.BigNumber.from(10).pow(24)).div(priceEthUsd_8);
  console.log("Expected ETH wei charged:", expected.toString());
  console.log("Merchant received:", ethAfter.sub(ethBefore).toString());
  console.log("Payer balance reduced:", innerBefore.sub(innerAfter).toString());

  const nextDue = await contract.nextChargeDueAt(payer.address);
  console.log("Next due at (unix):", nextDue.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

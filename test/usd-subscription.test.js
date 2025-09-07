import { expect } from "chai";
import { ethers } from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";

describe("UsdSubscription", function () {
  it("charges USD-priced subscription using RedStone price", async function () {
    const [deployer, payer, merchant, anyone] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("UsdSubscription");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const usdCents = 1000; // $10
    await contract.connect(payer).subscribe(merchant.address, usdCents, 1, 0);
    await contract.connect(payer).depositETH({ value: ethers.parseEther("0.1") });

    const priceEthUsd_8 = 3_000n * 10n ** 8n; // 3000 * 1e8
    const wrapped = WrapperBuilder.wrap(contract.connect(anyone)).usingSimpleNumericMock({
      mockSignersCount: 1,
      dataPoints: [
        { dataFeedId: "ETH", value: priceEthUsd_8 },
      ],
    });

    const merchantBalBefore = await ethers.provider.getBalance(merchant.address);
    const payerInnerBefore = await contract.ethBalances(payer.address);

    const tx = await wrapped.charge(payer.address);
    await tx.wait();

    const expectedEthWei = (BigInt(usdCents) * 10n ** 24n) / priceEthUsd_8;
    const merchantBalAfter = await ethers.provider.getBalance(merchant.address);
    const payerInnerAfter = await contract.ethBalances(payer.address);

    expect(merchantBalAfter - merchantBalBefore).to.equal(expectedEthWei);
    expect(payerInnerBefore - payerInnerAfter).to.equal(expectedEthWei);

    const plan = await contract.plans(payer.address);
    expect(plan.active).to.equal(true);
    const nextDue = await contract.nextChargeDueAt(payer.address);
    expect(Number(nextDue)).to.be.greaterThan(0);
  });
});


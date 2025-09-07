import 'dotenv/config';
import { ethers } from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { getSignersForDataServiceId } from "@redstone-finance/sdk";

async function main() {
  const [deployer, payer, merchant, executor] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Payer:", payer.address);
  console.log("Merchant:", merchant.address);

  // Deploy the production-oriented consumer
  const Factory = await ethers.getContractFactory("UsdSubscriptionProd");
  const contract = await Factory.deploy();
  await contract.deployed();
  console.log("UsdSubscriptionProd deployed at:", contract.address);

  // Create a plan and fund payer
  const usdCents = Number(process.env.USD_CENTS ?? 999); // default $9.99
  const periodSec = Number(process.env.PERIOD_SEC ?? 60);
  await (await contract.connect(payer).subscribe(merchant.address, usdCents, periodSec, 0)).wait();
  await (await contract.connect(payer).depositETH({ value: ethers.utils.parseEther("0.1") })).wait();
  console.log(`Subscribed ${usdCents} cents / ${periodSec}s and deposited 0.1 ETH`);

  // Configure RedStone Data Service (live price fetch)
  const urls = process.env.REDSTONE_URLS
    ? process.env.REDSTONE_URLS.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined; // let SDK resolve default gateways

  const authorizedSigners = getSignersForDataServiceId("redstone-primary-prod");

  const wrapped = WrapperBuilder.wrap(contract.connect(executor)).usingDataService({
    dataPackagesIds: ["ETH"],
    authorizedSigners,
    ...(urls ? { urls } : {}),
  });

  const merchantBalBefore = await ethers.provider.getBalance(merchant.address);
  const payerInnerBefore = await contract.ethBalances(payer.address);

  // This performs a network request to RedStone gateways to fetch fresh packages
  const tx = await wrapped.charge(payer.address);
  const receipt = await tx.wait();
  console.log("Charge tx hash:", receipt.transactionHash);
  console.log("Gas used:", receipt.gasUsed.toString());

  const merchantBalAfter = await ethers.provider.getBalance(merchant.address);
  const payerInnerAfter = await contract.ethBalances(payer.address);
  console.log("Merchant received:", merchantBalAfter.sub(merchantBalBefore).toString());
  console.log("Payer balance reduced:", payerInnerBefore.sub(payerInnerAfter).toString());

  const nextDue = await contract.nextChargeDueAt(payer.address);
  console.log("Next due at (unix):", nextDue.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

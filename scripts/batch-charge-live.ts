import 'dotenv/config';
import { ethers } from "hardhat";
import type { Contract } from 'ethers';
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { getSignersForDataServiceId } from "@redstone-finance/sdk";

function parseCsvEnv(name: string): string[] | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const executor = signers[1];
  const merchant = signers[2];

  const fromEnvAddress = process.env.SUBSCRIPTION_ADDRESS;
  let contract: any;
  let createdSample = false;

  if (fromEnvAddress) {
    const Factory = await ethers.getContractFactory("UsdSubscriptionProd");
    contract = Factory.attach(fromEnvAddress);
    console.log("Using existing UsdSubscriptionProd at:", fromEnvAddress);
  } else {
    const Factory = await ethers.getContractFactory("UsdSubscriptionProd");
    contract = await Factory.deploy();
    await contract.deployed();
    console.log("Deployed UsdSubscriptionProd at:", contract.address);

    // Create sample subscriptions for 3 payers
    const payers = [signers[3], signers[4], signers[5]];
    for (const p of payers) {
      await (await contract.connect(p).subscribe(merchant.address, 999, 30, 0)).wait();
      await (await contract.connect(p).depositETH({ value: ethers.utils.parseEther("0.05") })).wait();
    }
    createdSample = true;
  }

  // Determine payers list (priority: registry > PAYERS CSV > sample)
  let payers: string[] | undefined = undefined;
  const registryAddr = process.env.PAYER_REGISTRY_ADDRESS;
  if (registryAddr) {
    const RegistryFactory = await ethers.getContractFactory("PayerRegistry");
    const registry: Contract = RegistryFactory.attach(registryAddr);
    const merchantAddr = process.env.MERCHANT_ADDRESS ?? merchant.address;
    try {
      payers = await registry.getPayers(merchantAddr);
      console.log(`Loaded ${payers.length} payers from registry ${registryAddr} for merchant ${merchantAddr}`);
    } catch (e) {
      console.warn("Failed to load from registry; falling back to PAYERS env:", (e as any)?.message ?? e);
    }
  }
  if (!payers) {
    payers = parseCsvEnv("PAYERS");
  }
  if (!payers) {
    payers = createdSample
      ? [signers[3].address, signers[4].address, signers[5].address]
      : [signers[1].address, signers[2].address]; // fallback
  }
  console.log("Payers:", payers.join(", "));

  // RedStone Data Service config
  const urls = parseCsvEnv("REDSTONE_URLS");
  const authorizedSigners = getSignersForDataServiceId("redstone-primary-prod");

  const wrapped = WrapperBuilder.wrap(contract.connect(executor)).usingDataService({
    dataPackagesIds: ["ETH"],
    authorizedSigners,
    ...(urls ? { urls } : {}),
  });

  // Iterate and charge if due
  const now = Math.floor(Date.now() / 1000);
  const results: { payer: string; charged: boolean; tx?: string; reason?: string }[] = [];
  for (const payerAddr of payers) {
    try {
      const nextDue = await contract.nextChargeDueAt(payerAddr);
      if (nextDue.toNumber() > now) {
        results.push({ payer: payerAddr, charged: false, reason: "not due" });
        continue;
      }
      const tx = await wrapped.charge(payerAddr);
      const rc = await tx.wait();
      results.push({ payer: payerAddr, charged: true, tx: rc.transactionHash });
      console.log(`Charged ${payerAddr} in tx ${rc.transactionHash}`);
    } catch (e: any) {
      results.push({ payer: payerAddr, charged: false, reason: e?.message ?? String(e) });
      console.warn(`Failed to charge ${payerAddr}:`, e?.message ?? e);
    }
  }

  console.log("Batch results:", JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

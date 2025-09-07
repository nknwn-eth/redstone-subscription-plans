import 'dotenv/config';
import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const merchant = signers[2];
  const payers = [signers[3], signers[4], signers[5]];

  const Registry = await ethers.getContractFactory("PayerRegistry");
  const registry = await Registry.connect(merchant).deploy();
  await registry.deployed();
  console.log("PayerRegistry deployed at:", registry.address);

  for (const p of payers) {
    await (await registry.connect(merchant).addPayer(p.address)).wait();
    console.log("Added payer:", p.address);
  }

  console.log("Done. Set PAYER_REGISTRY_ADDRESS=", registry.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


import 'dotenv/config';
import { ethers } from 'hardhat';

async function main() {
  const [deployer, payer1, payer2, payer3, merchant] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Merchant:', merchant.address);

  const SubF = await ethers.getContractFactory('UsdSubscriptionProd');
  const sub = await SubF.deploy();
  await sub.deployed();
  console.log('UsdSubscriptionProd:', sub.address);

  const RegF = await ethers.getContractFactory('PayerRegistry');
  const reg = await RegF.connect(merchant).deploy();
  await reg.deployed();
  console.log('PayerRegistry:', reg.address);

  const CatF = await ethers.getContractFactory('PlanCatalog');
  const cat = await CatF.connect(merchant).deploy();
  await cat.deployed();
  console.log('PlanCatalog:', cat.address);

  const payers = [payer1, payer2, payer3];

  for (const p of payers) {
    await (await reg.connect(merchant).addPayer(p.address)).wait();
    await (await sub.connect(p).subscribe(merchant.address, 999, 60, 0)).wait();
    await (await sub.connect(p).depositETH({ value: ethers.utils.parseEther('0.1') })).wait();
    console.log('Seeded payer:', p.address);
  }

  console.log('Done. Set .env variables:');
  console.log('SUBSCRIPTION_ADDRESS=' + sub.address);
  console.log('PAYER_REGISTRY_ADDRESS=' + reg.address);
  console.log('MERCHANT_ADDRESS=' + merchant.address);
  console.log('PLAN_CATALOG_ADDRESS=' + cat.address);

  // Also write addresses.json for UI/server convenience
  const fs = require('fs');
  const path = require('path');
  const file = path.join(process.cwd(), 'addresses.json');
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const merged = { ...existing, SUBSCRIPTION_ADDRESS: sub.address, PAYER_REGISTRY_ADDRESS: reg.address, MERCHANT_ADDRESS: merchant.address, PLAN_CATALOG_ADDRESS: cat.address };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log('Wrote', file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

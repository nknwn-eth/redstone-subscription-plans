import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';

function setEnvVars(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const map = new Map<string, string>();
  for (const line of existing) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, String(v));
  }
  const lines = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join("\n"));
  return envPath;
}

async function main() {
  const doSub = process.env.DEPLOY_SUBSCRIPTION !== 'false';
  const doReg = process.env.DEPLOY_REGISTRY !== 'false';
  const updates: Record<string, string> = {};

  if (doSub) {
    const F = await ethers.getContractFactory("UsdSubscriptionProd");
    const c = await F.deploy();
    await c.deployed();
    console.log("UsdSubscriptionProd:", c.address);
    updates.SUBSCRIPTION_ADDRESS = c.address;
  }

  if (doReg) {
    const R = await ethers.getContractFactory("PayerRegistry");
    const r = await R.deploy();
    await r.deployed();
    console.log("PayerRegistry:", r.address);
    updates.PAYER_REGISTRY_ADDRESS = r.address;
  }

  if (Object.keys(updates).length > 0) {
    const file = setEnvVars(updates);
    console.log("Updated:", file);
  } else {
    console.log("Nothing to deploy; set DEPLOY_SUBSCRIPTION/DEPLOY_REGISTRY to control behavior");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


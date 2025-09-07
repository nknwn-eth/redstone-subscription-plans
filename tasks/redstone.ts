import { task, types } from "hardhat/config";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { getSignersForDataServiceId } from "@redstone-finance/sdk";
import fs from "fs";
import path from "path";
import axios from "axios";

function parseCsv(v?: string | null): string[] | undefined {
  if (!v) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

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

function writeAddressesFile(updates: Record<string, string>) {
  const filePath = path.join(process.cwd(), "addresses.json");
  let current: Record<string, string> = {};
  if (fs.existsSync(filePath)) {
    try { current = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch {}
  }
  const merged = { ...current, ...updates };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  return filePath;
}

async function tryLoadPayersFromSubgraph(url: string, merchant: string): Promise<string[] | undefined> {
  try {
    const q = {
      query: `query($merchant: String!) { payers(where: { merchant: $merchant }) { address } }`,
      variables: { merchant: merchant.toLowerCase() },
    };
    const { data } = await axios.post(url, q, { headers: { "content-type": "application/json" } });
    const items: { address: string }[] | undefined = data?.data?.payers;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((it) => it.address);
    }
  } catch (e) {
    // ignore and fallback
  }
  return undefined;
}

task("deploy:save", "Deploys subscription + registry and writes addresses into .env")
  .addOptionalParam("subscription", "Deploy UsdSubscriptionProd (default true)", true, types.boolean)
  .addOptionalParam("registry", "Deploy PayerRegistry (default true)", true, types.boolean)
  .addOptionalParam("mocks", "Deploy mock ERC20 tokens (for testnets)", false, types.boolean)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const updates: Record<string, string> = {};

    if (args.subscription) {
      const F = await ethers.getContractFactory("UsdSubscriptionProd");
      const c = await F.deploy();
      await c.deployed();
      console.log("UsdSubscriptionProd:", c.address);
      updates.SUBSCRIPTION_ADDRESS = c.address;
    }

    if (args.registry) {
      const R = await ethers.getContractFactory("PayerRegistry");
      const r = await R.deploy();
      await r.deployed();
      console.log("PayerRegistry:", r.address);
      updates.PAYER_REGISTRY_ADDRESS = r.address;
    }

    // PlanCatalog
    try {
      const PC = await ethers.getContractFactory("PlanCatalog");
      const pc = await PC.deploy();
      await pc.deployed();
      console.log("PlanCatalog:", pc.address);
      updates.PLAN_CATALOG_ADDRESS = pc.address;
    } catch (e) {
      console.warn('PlanCatalog deploy skipped/failed:', (e as any)?.message || e);
    }

    if (args.mocks) {
      try {
        const M = await ethers.getContractFactory("MockERC20");
        const usdc = await M.deploy("Test USDC", "USDC", 6);
        await usdc.deployed();
        await (await usdc.mint((await ethers.getSigners())[0].address, ethers.utils.parseUnits("1000000", 6))).wait();
        const dai = await M.deploy("Test DAI", "DAI", 18);
        await dai.deployed();
        await (await dai.mint((await ethers.getSigners())[0].address, ethers.utils.parseEther("1000000"))).wait();
        console.log("Mock USDC:", usdc.address);
        console.log("Mock DAI:", dai.address);
        (updates as any).PRESET_TOKENS = [
          { label: "ETH (native)", address: "0x0000000000000000000000000000000000000000", feedId: "ETH", decimals: 18 },
          { label: "USDC (test)", address: usdc.address, feedId: "USDC", decimals: 6 },
          { label: "DAI (test)", address: dai.address, feedId: "DAI", decimals: 18 },
        ] as any;
      } catch (e) {
        console.warn('Mock tokens deploy failed:', (e as any)?.message || e);
      }
    }

    const file = setEnvVars(Object.fromEntries(Object.entries(updates).map(([k,v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])));
    console.log("Updated:", file);
    const addrFile = writeAddressesFile(updates as any);
    console.log("Wrote:", addrFile);
  });

task("charge", "Charge one payer using RedStone live data")
  .addParam("payer", "Payer address")
  .addOptionalParam("subscription", "Subscription contract address (defaults to .env)")
  .addOptionalParam("urls", "Comma separated RedStone gateway URLs")
  .setAction(async ({ payer, subscription, urls }, hre) => {
    const { ethers } = hre;
    const subAddr = subscription || process.env.SUBSCRIPTION_ADDRESS;
    if (!subAddr) throw new Error("Please provide --subscription or set SUBSCRIPTION_ADDRESS in .env");
    const auth = getSignersForDataServiceId("redstone-primary-prod");
    const urlsArr = parseCsv(urls || process.env.REDSTONE_URLS || "");

    const F = await ethers.getContractFactory("UsdSubscriptionProd");
    const c = F.attach(subAddr);
    const executor = (await ethers.getSigners())[0];
    const wrapped = WrapperBuilder.wrap(c.connect(executor)).usingDataService({
      dataPackagesIds: ["ETH"],
      authorizedSigners: auth,
      ...(urlsArr ? { urls: urlsArr } : {}),
    });

    const tx = await wrapped.charge(payer);
    const rc = await tx.wait();
    console.log("Charged payer:", payer, "tx:", rc.transactionHash);
  });

// Deploy only mock tokens and update presets in addresses.json and .env
task("deploy:mocks", "Deploy mock ERC20 tokens and update UI presets")
  .addOptionalParam("mint", "Mint amount per token (human units)", "1000000", types.string)
  .setAction(async ({ mint }, hre) => {
    const { ethers } = hre;
    const updates: Record<string, any> = {};
    try {
      const M = await ethers.getContractFactory("MockERC20");
      const usdc = await M.deploy("Test USDC", "USDC", 6);
      await usdc.deployed();
      const dai = await M.deploy("Test DAI", "DAI", 18);
      await dai.deployed();
      await (await usdc.mint((await ethers.getSigners())[0].address, ethers.utils.parseUnits(mint, 6))).wait();
      await (await dai.mint((await ethers.getSigners())[0].address, ethers.utils.parseEther(mint))).wait();
      console.log("Mock USDC:", usdc.address);
      console.log("Mock DAI:", dai.address);
      updates.PRESET_TOKENS = [
        { label: "ETH (native)", address: "0x0000000000000000000000000000000000000000", feedId: "ETH", decimals: 18 },
        { label: "USDC (test)", address: usdc.address, feedId: "USDC", decimals: 6 },
        { label: "DAI (test)", address: dai.address, feedId: "DAI", decimals: 18 },
      ];
    } catch (e) {
      console.error('Mock tokens deploy failed:', (e as any)?.message || e);
      throw e;
    }
    // persist
    const file = setEnvVars(Object.fromEntries(Object.entries(updates).map(([k,v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])));
    console.log("Updated:", file);
    const addrFile = writeAddressesFile(updates as any);
    console.log("Wrote:", addrFile);
  });

task("batch:charge", "Charge multiple payers if due using live data")
  .addOptionalParam("subscription", "Subscription contract address", undefined, types.string)
  .addOptionalParam("registry", "Payer registry address", undefined, types.string)
  .addOptionalParam("merchant", "Merchant address for registry lookup", undefined, types.string)
  .addOptionalParam("payers", "Comma separated list of payer addresses", undefined, types.string)
  .addOptionalParam("urls", "Comma separated RedStone gateway URLs", undefined, types.string)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const subAddr = args.subscription || process.env.SUBSCRIPTION_ADDRESS;
    if (!subAddr) throw new Error("Please provide --subscription or set SUBSCRIPTION_ADDRESS in .env");
    const auth = getSignersForDataServiceId("redstone-primary-prod");
    const urlsArr = parseCsv(args.urls || process.env.REDSTONE_URLS || "");

    const F = await ethers.getContractFactory("UsdSubscriptionProd");
    const c = F.attach(subAddr);
    const executor = (await ethers.getSigners())[0];
    const wrapped = WrapperBuilder.wrap(c.connect(executor)).usingDataService({
      dataPackagesIds: ["ETH"],
      authorizedSigners: auth,
      ...(urlsArr ? { urls: urlsArr } : {}),
    });

    // resolve payers: subgraph -> registry -> CSV
    let payers: string[] | undefined = undefined;
    const subgraphUrl = process.env.SUBGRAPH_URL;
    let merchant = args.merchant || process.env.MERCHANT_ADDRESS;
    if (!merchant) {
      const ss = await ethers.getSigners();
      merchant = ss[0].address;
    }
    if (subgraphUrl) {
      payers = await tryLoadPayersFromSubgraph(subgraphUrl, merchant);
      if (payers?.length) console.log(`Loaded ${payers.length} payers from subgraph`);
    }
    const registryAddr = args.registry || process.env.PAYER_REGISTRY_ADDRESS;
    if (!payers && registryAddr) {
      const R = await ethers.getContractFactory("PayerRegistry");
      const r = R.attach(registryAddr);
      try {
        payers = await r.getPayers(merchant);
        console.log(`Loaded ${payers.length} payers from registry ${registryAddr}`);
      } catch (e) {
        console.warn("Registry load failed, will fallback:", (e as any)?.message ?? e);
      }
    }
    if (!payers) {
      payers = parseCsv(args.payers || process.env.PAYERS || "");
    }
    if (!payers || payers.length === 0) throw new Error("No payers resolved; provide registry/subgraph/CSV");

    const now = Math.floor(Date.now() / 1000);
    const results: { payer: string; charged: boolean; tx?: string; reason?: string }[] = [];
    for (const payer of payers) {
      try {
        const dueAt = await c.nextChargeDueAt(payer);
        if (dueAt.toNumber() > now) {
          results.push({ payer, charged: false, reason: "not due" });
          continue;
        }
        const tx = await wrapped.charge(payer);
        const rc = await tx.wait();
        results.push({ payer, charged: true, tx: rc.transactionHash });
        console.log(`Charged ${payer} in ${rc.transactionHash}`);
      } catch (e) {
        results.push({ payer, charged: false, reason: (e as any)?.message ?? String(e) });
      }
    }
    console.log(JSON.stringify(results, null, 2));
  });

task("registry:seed", "Add payers to a PayerRegistry (deploys if omitted)")
  .addOptionalParam("registry", "Payer registry address (deploy new if omitted)", undefined, types.string)
  .addOptionalParam("merchant", "Merchant address (defaults to signer[0])", undefined, types.string)
  .addOptionalParam("payers", "Comma separated list of payer addresses", undefined, types.string)
  .setAction(async ({ registry, merchant, payers }, hre) => {
    const { ethers } = hre;
    let registryAddr = registry;
    if (!registryAddr) {
      const R = await ethers.getContractFactory("PayerRegistry");
      const r = await R.deploy();
      await r.deployed();
      registryAddr = r.address;
      console.log("Deployed PayerRegistry:", registryAddr);
    }
    const Registry = await ethers.getContractFactory("PayerRegistry");
    const r = Registry.attach(registryAddr);
    const signers = await ethers.getSigners();
    const m = merchant || signers[0].address;
    let list = parseCsv(payers || process.env.PAYERS || "");
    if (!list || list.length === 0) {
      // Try to use additional signer addresses if present; otherwise generate placeholder addresses
      if (signers.length > 1) {
        list = signers.slice(1, Math.min(signers.length, 3)).map((s) => s.address);
      } else {
        // Generate two deterministic placeholder addresses (not funded), registry-only
        const base = m.toLowerCase().replace(/^0x/, "");
        list = [
          ("0x" + base.substring(0, 38) + "01"),
          ("0x" + base.substring(0, 38) + "02"),
        ];
      }
    }
    for (const p of list) {
      await (await r.connect(await ethers.getSigner(m)).addPayer(p)).wait();
      console.log(`Added payer ${p} for merchant ${m}`);
    }
    const file = setEnvVars({ PAYER_REGISTRY_ADDRESS: registryAddr });
    console.log("Updated:", file);
  });

task("subscription:setup", "Create a subscription plan for a payer and deposit ETH")
  .addOptionalParam("subscription", "Subscription contract address (defaults .env)", undefined, types.string)
  .addOptionalParam("payer", "Payer address (defaults signer[1])", undefined, types.string)
  .addOptionalParam("merchant", "Merchant address (defaults signer[0])", undefined, types.string)
  .addOptionalParam("cents", "USD cents per period", 999, types.int)
  .addOptionalParam("period", "Period seconds", 60, types.int)
  .addOptionalParam("maxwei", "Max wei per charge (0 = uncapped)", 0, types.string)
  .addOptionalParam("deposit", "ETH to deposit (e.g. 0.1)", "0.1", types.string)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const subAddr = args.subscription || process.env.SUBSCRIPTION_ADDRESS;
    if (!subAddr) throw new Error("Provide --subscription or set SUBSCRIPTION_ADDRESS in .env");
    const F = await ethers.getContractFactory("UsdSubscriptionProd");
    const c = F.attach(subAddr);
    const signers = await ethers.getSigners();
    const payAddr = args.payer || (signers[1] ? signers[1].address : signers[0].address);
    const merAddr = args.merchant || signers[0].address;
    const payerSigner = await ethers.getSigner(payAddr);
    await (await c.connect(payerSigner).subscribe(merAddr, Number(args.cents), Number(args.period), args.maxwei ? ethers.BigNumber.from(args.maxwei) : 0)).wait();
    await (await c.connect(payerSigner).depositETH({ value: ethers.utils.parseEther(String(args.deposit)) })).wait();
    console.log(`Subscribed payer ${payAddr} to ${merAddr} for ${args.cents} cents / ${args.period}s and deposited ${args.deposit} ETH`);
  });

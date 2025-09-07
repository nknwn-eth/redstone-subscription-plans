**RedStone-Powered USD Subscriptions**

- Purpose: USD-denominated, non-custodial subscriptions that charge accounts using RedStone price data embedded in calldata. Payers deposit ETH and set a plan in USD cents; anyone can trigger a due charge by attaching a fresh ETH/USD price from RedStone.

**Why RedStone**

- On-demand calldata: Prices arrive only when needed, keeping storage minimal and saving gas.
- Multi-signer security: Threshold-signed packages validated on-chain (prod uses 3-of-N).
- Composable: Works with any executor/bot; no price storage or cron in the contract.

**Repo Layout**

- `contracts/UsdSubscription.sol`: Demo contract using RedStone mock signers (great for local dev/tests).
- `contracts/UsdSubscriptionProd.sol`: Production variant using `redstone-primary-prod` service (3-of-N signers).
- `scripts/demo-subscription.ts`: End-to-end demo script that deploys, subscribes, deposits, injects a mock ETH/USD price, and charges.
- `scripts/charge-live.ts`: Live charging using RedStone data service (fetches ETH/USD from gateways).
- `scripts/batch-charge-live.ts`: Simple keeper/executor that charges multiple payers if due.
- `hardhat.config.ts`: Hardhat v2 + Ethers v5 (required for RedStone wrapper compatibility).

**Quick Start**

- Install deps (already done here): `npm i`
- Compile: `npm run build`
- Run demo: `npx hardhat run scripts/demo-subscription.ts`
  - Prints addresses, gas used, expected vs actual charged wei, and next due timestamp.

One-liners with npm scripts:

- Mock demo: `npm run demo:mock`
- Live charge: `npm run charge:live` (set `.env` first)
- Batch charge: `npm run charge:batch` (set `.env` first)
- Seed registry: `npm run seed:registry` (local sample)
- Deploy + write .env: `npx hardhat deploy:save` or `npx hardhat run scripts/deploy-and-save.ts`
- Serve UI + payload endpoint: `npm run server` (opens http://localhost:3001; serves `/payload`, `/addresses`, and static UI from `/`)
- Dev UI (server + auto-open): `npm run dev:ui`
- Deploy & seed demo (sample payers + deposits): `npm run deploy:demo`
- Update subgraph with deployed addresses: `npm run subgraph:set-addresses`
- End‑to‑end local post‑deploy: `npm run postdeploy:local` (deploy + set addresses + start server + open UI)

Plan catalog:

- Deploy task also deploys `PlanCatalog` and writes `PLAN_CATALOG_ADDRESS` to `addresses.json`.

Expected output excerpt:

- `Expected ETH wei charged: 3330000000000000`
- `Merchant received: 3330000000000000`

This corresponds to $9.99 at 3000 USD/ETH: 9.99 / 3000 ≈ 0.00333 ETH.

**How It Works**

- Contract inherits `RedstoneConsumerNumericBase` and validates signatures/timestamp from appended RedStone payload.
- Demo inherits `AuthorisedMockSignersBase` so RedStone’s wrapper can inject mock data from Hardhat well-known signers.
- Production variant inherits `PrimaryProdDataServiceConsumerBase` (dataServiceId=`redstone-primary-prod`, threshold=3) to validate real packages.

Key call in `UsdSubscription`:

- `getOracleNumericValueFromTxMsg(bytes32("ETH"))` → returns ETH/USD with 8 decimals, validated on-chain.

Charge math (wei):

- `ethWeiOwed = usdCents * 1e24 / priceEthUsd_8`
  - USD cents → dollars: `/ 100`, USD/ETH price has 8 decimals; combine to keep full precision in wei.

RedStone wrapper used in the demo:

- `WrapperBuilder.wrap(contract).usingSimpleNumericMock({ mockSignersCount: 1, timestampMilliseconds: Date.now(), dataPoints: [{ dataFeedId: "ETH", value: 3000, decimals: 8 }] })`

Notes:

- Use `value: 3000` and `decimals: 8`. The wrapper serializes using the decimals provided.
- Always pass a fresh timestamp to satisfy `validateTimestamp`.

**Going Production**

- Use `UsdSubscriptionProd` and RedStone’s on-demand wrapper to fetch live data and attach it to the tx:

Live price fetch via data service:

- `npx hardhat run scripts/charge-live.ts`
  - Env: `REDSTONE_URLS` (comma-separated) to override gateways; `USD_CENTS`, `PERIOD_SEC` optional.

Batch keeper/executor:

- `npx hardhat run scripts/batch-charge-live.ts`
  - Env: `SUBSCRIPTION_ADDRESS` to attach to existing deployment
  - Env: `PAYERS` CSV of addresses to charge (optional; otherwise demo creates/falls back)
  - Env: `REDSTONE_URLS` CSV to override gateways

Using a payer registry (on-chain index):

- Deploy and seed a simple registry locally: `npm run seed:registry`
- Set in `.env`:
  - `PAYER_REGISTRY_ADDRESS` to your registry
  - `MERCHANT_ADDRESS` to the owner of the payer list
- Run: `npm run charge:batch` (will load payers from the registry)

**Hardhat Tasks (CLI)**

- `npx hardhat deploy:save` — deploys `UsdSubscriptionProd` and `PayerRegistry`, updates `.env`
- `npx hardhat charge --payer 0xPAYER [--subscription 0xSUB] [--urls url1,url2]`
- `npx hardhat batch:charge [--subscription 0xSUB] [--registry 0xREG] [--merchant 0xMERCHANT] [--payers 0xA,0xB] [--urls url1,url2]`

Linting & Formatting:

- `npm run lint` / `npm run lint:fix`
- `npm run format`
- A pre-push hook runs `npm run lint` via Husky

Subgraph build (optional):

- `npm run graph:codegen`
- `npm run graph:build`

Optional subgraph source for batch charging:

- Set `SUBGRAPH_URL` in `.env` that returns `{ payers(where:{merchant}) { address } }`. The batch task will try subgraph → registry → CSV.

**UI Notes**

- Start server: `npm run server` (serves UI at `/`), or `npm run dev:ui` to start and open automatically
- UI will auto-fill addresses from `/addresses` if `addresses.json` exists (created by `deploy:save` or `deploy:demo`).
- To charge from the browser directly, the UI fetches a payload from `/payload` and appends it to the `charge(payer)` call.
- Use the Subgraph URL field to load recent `Charge` events for a merchant.
- Use the Status button to query `/status` for data-service freshness (latest timestamps and age per feed).

- Replace `ETH` with other feeds (e.g. `WBTC`, `BTC`, `ARB`), or charge in tokenized currency by quoting and doing an AMM swap in the executor before paying the merchant in the desired asset.

**Ideas to Extend**

- Multi-asset pricing: Subscribe in USD but pay in any ERC-20; executor handles swap using the price feed as a guardrail.
- Consumer protections: Payer-defined `maxEthPerChargeWei` already included; add per-period max slippage or TWAP windows.
- Prepaid vouchers: Issue ERC-1155 vouchers representing N prepaid periods; redeem burns a voucher per charge.
- Merchant webhooks: Emit events the merchant backend listens to for provisioning/cancelation.
- Batch charging: Executor charges many payers in one tx for the same merchant/plan (gas amortization).

**Why This Is A Strong Fit**

- Creativity: Turns RedStone’s calldata model into a pull-payment primitive with USD pricing and no oracle storage.
- Technical readiness: Fully working local demo, clean separation between mock and production variants, and gas-aware design.
- Expansion potential: Clear path to bots/executors, multi-asset support, batching, and consumer safeguards.

**Notes**

- This repo slightly extends `@redstone-finance/evm-connector` package.json to export Solidity contracts (`"./contracts/*"`). That’s to keep Hardhat resolution simple in this workspace.
- If you prefer, you can copy the few base contracts you need into your repo or use remappings.

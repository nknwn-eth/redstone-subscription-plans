const fs = require('fs');
const path = require('path');

function main() {
  const subgraphPath = path.join(process.cwd(), 'subgraph', 'subgraph.yaml');
  if (!fs.existsSync(subgraphPath)) throw new Error('subgraph/subgraph.yaml not found');
  const envAddr = {
    SUBSCRIPTION_ADDRESS: process.env.SUBSCRIPTION_ADDRESS,
    PAYER_REGISTRY_ADDRESS: process.env.PAYER_REGISTRY_ADDRESS,
  };
  const addrJsonPath = path.join(process.cwd(), 'addresses.json');
  const addrJson = fs.existsSync(addrJsonPath) ? JSON.parse(fs.readFileSync(addrJsonPath, 'utf8')) : {};
  const subscription = envAddr.SUBSCRIPTION_ADDRESS || addrJson.SUBSCRIPTION_ADDRESS;
  const registry = envAddr.PAYER_REGISTRY_ADDRESS || addrJson.PAYER_REGISTRY_ADDRESS;
  if (!subscription || !registry) {
    throw new Error('Missing addresses: set SUBSCRIPTION_ADDRESS and PAYER_REGISTRY_ADDRESS or create addresses.json');
  }
  let content = fs.readFileSync(subgraphPath, 'utf8');
  content = content.replace(/REPLACE_WITH_SUBSCRIPTION_ADDRESS/g, subscription);
  content = content.replace(/REPLACE_WITH_PAYER_REGISTRY_ADDRESS/g, registry);
  fs.writeFileSync(subgraphPath, content);
  console.log('Updated', subgraphPath);
}

try { main(); } catch (e) { console.error(e); process.exit(1); }


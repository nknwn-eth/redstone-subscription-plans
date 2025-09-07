// Simple Express server that returns a RedStone calldata payload for manual use
// Usage: npm run server (see README). Configure via .env or query params.
require('dotenv/config');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { requestDataPackages, convertDataPackagesResponse, getSignersForDataServiceId } = require('@redstone-finance/sdk');

const app = express();
app.use(cors());

const PORT = process.env.PAYLOAD_SERVER_PORT ? Number(process.env.PAYLOAD_SERVER_PORT) : 3001;

// Serve static UI and expose addresses from addresses.json if present
app.use(express.static(path.join(process.cwd(), 'ui')));
app.get('/addresses', (req, res) => {
  const file = path.join(process.cwd(), 'addresses.json');
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: 'addresses.json not found' });
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Config endpoint: returns demo/UX flags and merges with addresses
app.get('/config', (req, res) => {
  try {
    const addrPath = path.join(process.cwd(), 'addresses.json');
    const cfgPath = path.join(process.cwd(), 'server', 'config.json');
    const base = { demo: true, autoFindPlans: true, hideAdvanced: true };
    let cfg = { ...base };
    if (fs.existsSync(cfgPath)) {
      try { cfg = { ...base, ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')) }; } catch {}
    }
    if (fs.existsSync(addrPath)) {
      try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(addrPath, 'utf8')) }; } catch {}
    }
    res.json({ ok: true, ...cfg });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Helper: build padded payload so its byte-size is a multiple of 32
async function buildPaddedPayloadHex(reqParams) {
  // first try with empty unsigned metadata
  let hex = convertDataPackagesResponse(await requestDataPackages(reqParams), 'hex', '');
  let remainder = (hex.length / 2) % 32;
  if (remainder === 0) return '0x' + hex;
  const bytesToAdd = 32 - remainder;
  const unsignedMetadata = '_'.repeat(bytesToAdd);
  hex = convertDataPackagesResponse(await requestDataPackages(reqParams), 'hex', unsignedMetadata);
  return '0x' + hex;
}

app.get('/payload', async (req, res) => {
  try {
    const feedsCsv = (req.query.feeds || process.env.PAYLOAD_FEEDS || 'ETH').toString();
    const feeds = feedsCsv.split(',').map((s) => s.trim()).filter(Boolean);
    const dataServiceId = (req.query.serviceId || process.env.DATA_SERVICE_ID || 'redstone-primary-prod').toString();
    const urls = ((req.query.urls || process.env.REDSTONE_URLS || '').toString())
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueSignersCount = Number(req.query.uniqueSignersCount || process.env.UNIQUE_SIGNERS_COUNT || 3);

    const authorizedSigners = getSignersForDataServiceId(dataServiceId);

    const reqParams = {
      dataServiceId,
      dataPackagesIds: feeds,
      uniqueSignersCount,
      authorizedSigners,
      ...(urls.length ? { urls } : {}),
    };

    const payloadHex = await buildPaddedPayloadHex(reqParams);
    res.json({
      ok: true,
      dataServiceId,
      feeds,
      uniqueSignersCount,
      urls: urls.length ? urls : undefined,
      payloadHex,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e && e.message) || String(e) });
  }
});
// Lightweight status endpoint to check data service freshness
app.get('/status', async (req, res) => {
  try {
    const feedsCsv = (req.query.feeds || process.env.PAYLOAD_FEEDS || 'ETH').toString();
    const feeds = feedsCsv.split(',').map((s) => s.trim()).filter(Boolean);
    const dataServiceId = (req.query.serviceId || process.env.DATA_SERVICE_ID || 'redstone-primary-prod').toString();
    const urls = ((req.query.urls || process.env.REDSTONE_URLS || '').toString())
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueSignersCount = Number(req.query.uniqueSignersCount || process.env.UNIQUE_SIGNERS_COUNT || 3);

    const authorizedSigners = getSignersForDataServiceId(dataServiceId);
    const reqParams = {
      dataServiceId,
      dataPackagesIds: feeds,
      uniqueSignersCount,
      authorizedSigners,
      ...(urls.length ? { urls } : {}),
    };

    const response = await requestDataPackages(reqParams);
    const byFeed = {};
    for (const f of feeds) {
      const arr = response[f] || [];
      const ts = arr.map((p) => p.dataPackage.timestampMilliseconds);
      const latest = ts.length ? Math.max.apply(null, ts) : 0;
      const earliest = ts.length ? Math.min.apply(null, ts) : 0;
      byFeed[f] = {
        packages: arr.length,
        earliestTimestampMs: earliest,
        latestTimestampMs: latest,
        ageMs: latest ? Date.now() - latest : null,
      };
    }
    res.json({ ok: true, dataServiceId, feeds, uniqueSignersCount, byFeed });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e && e.message) || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`RedStone payload server listening on http://localhost:${PORT}`);
});

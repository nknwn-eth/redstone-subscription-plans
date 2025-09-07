import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { requestDataPackages, convertDataPackagesResponse, getSignersForDataServiceId } from '@redstone-finance/sdk';

const app = express();
app.use(cors());

const PORT = process.env.PAYLOAD_SERVER_PORT ? Number(process.env.PAYLOAD_SERVER_PORT) : 3001;

// Serve static UI and addresses
app.use(express.static(path.join(process.cwd(), 'ui')));
app.get('/addresses', (_req: express.Request, res: express.Response) => {
  const file = path.join(process.cwd(), 'addresses.json');
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: 'addresses.json not found' });
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
    res.json({ ok: true, ...data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

async function buildPaddedPayloadHex(reqParams: any): Promise<string> {
  let hex = convertDataPackagesResponse(await requestDataPackages(reqParams), 'hex', '');
  const remainder = (hex.length / 2) % 32;
  if (remainder === 0) return '0x' + hex;
  const bytesToAdd = 32 - remainder;
  const unsignedMetadata = '_'.repeat(bytesToAdd);
  hex = convertDataPackagesResponse(await requestDataPackages(reqParams), 'hex', unsignedMetadata);
  return '0x' + hex;
}

app.get('/payload', async (req: express.Request, res: express.Response) => {
  try {
    const feedsCsv = (req.query.feeds || process.env.PAYLOAD_FEEDS || 'ETH').toString();
    const feeds = feedsCsv.split(',').map((s) => s.trim()).filter(Boolean);
    const dataServiceId = (req.query.serviceId || process.env.DATA_SERVICE_ID || 'redstone-primary-prod').toString() as any;
    const urls = ((req.query.urls || process.env.REDSTONE_URLS || '').toString())
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const uniqueSignersCount = Number(req.query.uniqueSignersCount || process.env.UNIQUE_SIGNERS_COUNT || 3);

    const authorizedSigners = getSignersForDataServiceId(dataServiceId);
    const reqParams = {
      dataServiceId,
      dataPackagesIds: feeds,
      uniqueSignersCount,
      authorizedSigners,
      ...(urls.length ? { urls } : {}),
    } as any;

    const payloadHex = await buildPaddedPayloadHex(reqParams);
    res.json({ ok: true, dataServiceId, feeds, uniqueSignersCount, urls: urls.length ? urls : undefined, payloadHex });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Lightweight status endpoint to check data service freshness
app.get('/status', async (req: express.Request, res: express.Response) => {
  try {
    const feedsCsv = (req.query.feeds || process.env.PAYLOAD_FEEDS || 'ETH').toString();
    const feeds = feedsCsv.split(',').map((s: string) => s.trim()).filter(Boolean);
    const dataServiceId = (req.query.serviceId || process.env.DATA_SERVICE_ID || 'redstone-primary-prod').toString() as any;
    const urls = ((req.query.urls || process.env.REDSTONE_URLS || '').toString())
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const uniqueSignersCount = Number(req.query.uniqueSignersCount || process.env.UNIQUE_SIGNERS_COUNT || 3);

    const authorizedSigners = getSignersForDataServiceId(dataServiceId);
    const reqParams: any = {
      dataServiceId,
      dataPackagesIds: feeds,
      uniqueSignersCount,
      authorizedSigners,
      ...(urls.length ? { urls } : {}),
    };

    const response = await requestDataPackages(reqParams);
    const byFeed: Record<string, any> = {};
    for (const f of feeds) {
      const arr = (response as any)[f] || [];
      const ts = arr.map((p: any) => p.dataPackage.timestampMilliseconds);
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
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`RedStone payload server listening on http://localhost:${PORT}`);
});

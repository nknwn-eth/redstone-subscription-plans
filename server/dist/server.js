"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sdk_1 = require("@redstone-finance/sdk");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const PORT = process.env.PAYLOAD_SERVER_PORT ? Number(process.env.PAYLOAD_SERVER_PORT) : 3001;
// Serve static UI and addresses
app.use(express_1.default.static(path_1.default.join(process.cwd(), 'ui')));
app.get('/addresses', (_req, res) => {
    const file = path_1.default.join(process.cwd(), 'addresses.json');
    if (!fs_1.default.existsSync(file))
        return res.status(404).json({ ok: false, error: 'addresses.json not found' });
    try {
        const data = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
        res.json({ ok: true, ...data });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
async function buildPaddedPayloadHex(reqParams) {
    let hex = (0, sdk_1.convertDataPackagesResponse)(await (0, sdk_1.requestDataPackages)(reqParams), 'hex', '');
    const remainder = (hex.length / 2) % 32;
    if (remainder === 0)
        return '0x' + hex;
    const bytesToAdd = 32 - remainder;
    const unsignedMetadata = '_'.repeat(bytesToAdd);
    hex = (0, sdk_1.convertDataPackagesResponse)(await (0, sdk_1.requestDataPackages)(reqParams), 'hex', unsignedMetadata);
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
        const authorizedSigners = (0, sdk_1.getSignersForDataServiceId)(dataServiceId);
        const reqParams = {
            dataServiceId,
            dataPackagesIds: feeds,
            uniqueSignersCount,
            authorizedSigners,
            ...(urls.length ? { urls } : {}),
        };
        const payloadHex = await buildPaddedPayloadHex(reqParams);
        res.json({ ok: true, dataServiceId, feeds, uniqueSignersCount, urls: urls.length ? urls : undefined, payloadHex });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || String(e) });
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
        const authorizedSigners = (0, sdk_1.getSignersForDataServiceId)(dataServiceId);
        const reqParams = {
            dataServiceId,
            dataPackagesIds: feeds,
            uniqueSignersCount,
            authorizedSigners,
            ...(urls.length ? { urls } : {}),
        };
        const response = await (0, sdk_1.requestDataPackages)(reqParams);
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
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
app.listen(PORT, () => {
    console.log(`RedStone payload server listening on http://localhost:${PORT}`);
});

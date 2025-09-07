require('dotenv/config');
const { exec } = require('child_process');

const port = process.env.PAYLOAD_SERVER_PORT ? Number(process.env.PAYLOAD_SERVER_PORT) : 3001;
const url = `http://localhost:${port}/`;

async function openUrl(u) {
  try {
    // Prefer the ESM-only 'open' package via dynamic import
    const mod = await import('open');
    const fn = mod && (mod.default || mod.open || mod);
    if (typeof fn === 'function') {
      await fn(u);
      console.log('Opened UI at', u);
      return;
    }
  } catch (_) {
    // fall through to shell-based open
  }
  // Fallback by OS
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') cmd = `open "${u}"`;
  else if (platform === 'win32') cmd = `start "" "${u}"`;
  else cmd = `xdg-open "${u}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error('Failed to open browser. Visit:', u, err.message || err);
    } else {
      console.log('Opened UI at', u);
    }
  });
}

openUrl(url);

require('dotenv/config');
const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  // 0) Start a local Hardhat node if not running
  const node = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit', shell: process.platform === 'win32' });

  // Wait for JSON-RPC to be ready on 127.0.0.1:8545
  try {
    const waitOn = require('wait-on');
    await waitOn({ resources: ['tcp:127.0.0.1:8545'], timeout: 15000 });
  } catch (e) {
    console.error('Hardhat node did not start in time:', e.message || e);
    process.exit(1);
  }

  // 1) Deploy and write addresses to localhost network
  await run('npx', ['hardhat', '--network', 'localhost', 'deploy:save']);

  // 2) Update subgraph addresses
  await run('npm', ['run', 'subgraph:set-addresses']);

  // 3) Start server and open UI
  const server = spawn('npm', ['run', 'server'], { stdio: 'inherit', shell: process.platform === 'win32' });
  // give server a moment to boot
  setTimeout(() => {
    run('npm', ['run', 'open:ui']).catch((e) => console.error('Failed to open UI:', e.message || e));
  }, 1500);

  function cleanup() {
    try { server.kill('SIGINT'); } catch {}
    try { node.kill('SIGINT'); } catch {}
  }
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // keep this script running while server is alive
  server.on('close', (code) => {
    console.log('Server exited with code', code);
    cleanup();
    process.exit(code || 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

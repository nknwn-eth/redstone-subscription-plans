declare var ethers: any;

(() => {
  // Suppress noisy wallet collision errors from third-party injectors
  window.addEventListener('error', (ev: any) => {
    const msg = ev?.error?.message || ev?.message || '';
    if (typeof msg === 'string' && msg.includes('Cannot redefine property: ethereum')) {
      ev.preventDefault?.();
      console.warn('[ui] Ignored wallet collision error:', msg);
    }
  });

  function showToast(msg: string, ms = 3000) {
    const el = document.getElementById('toast') as HTMLElement;
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, ms);
  }

  function isUserRejected(e: any): boolean {
    const code = e?.code;
    const msg = (e?.message || e || '').toString().toLowerCase();
    return code === 4001 || msg.includes('user rejected');
  }

  let provider: any;
  let signer: any;
  let currentAccount: string | null = null;
  let demoMode = true;

  function updateNetBanner(show: boolean, text?: string) {
    const wrap = document.getElementById('netBanner') as HTMLElement | null;
    const txt = document.getElementById('netBannerText') as HTMLElement | null;
    if (!wrap) return;
    if (typeof text === 'string' && txt) txt.textContent = text;
    wrap.style.display = show ? 'flex' : 'none';
  }

  async function enumerateProviders(): Promise<{ provider: any; label: string }[]> {
    const results: { provider: any; label: string }[] = [];
    const w = window as any;
    if (w.ethereum) results.push({ provider: w.ethereum, label: 'Injected (ethereum)' });
    const candidates: any[] = [];
    function onAnnounce(e: any) { candidates.push(e.detail); }
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise((r) => setTimeout(r, 300));
    window.removeEventListener('eip6963:announceProvider', onAnnounce);
    for (const c of candidates) {
      const name = (c?.info?.name || c?.info?.rdns || 'wallet').toString();
      results.push({ provider: c.provider, label: name });
    }
    return results;
  }

  const subAbi = [
    "function subscribe(address merchant,uint256 usdCentsPerPeriod,uint256 period,uint256 maxEthPerChargeWei)",
    "function depositETH() payable",
    "function ethBalances(address) view returns (uint256)",
  ];
  const regAbi = [
    "function getPayers(address merchant) view returns (address[])"
  ];

  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

  function isAddress(addr: string): boolean {
    try { return (ethers as any).utils.isAddress(addr); } catch { return false; }
  }

  function requireAddress(addr: string, label: string) {
    if (!addr || !isAddress(addr)) {
      throw new Error(`${label} is not a valid address`);
    }
  }

  ($("connect") as any).onclick = async () => {
    try {
      const list = await enumerateProviders();
      if (list.length === 0) {
        (document.getElementById('providerRow') as HTMLElement).style.display = 'block';
        return showToast('No wallet detected. You can enable Read-only Mode.');
      }
      if (list.length === 1) {
        await useProvider(list[0].provider);
        return;
      }
      const sel = document.getElementById('providerSelect') as HTMLSelectElement;
      sel.innerHTML = '';
      list.forEach((p, i) => {
        const opt = document.createElement('option');
        (opt as any).value = i.toString();
        opt.textContent = p.label;
        sel.appendChild(opt);
      });
      (document.getElementById('providerRow') as HTMLElement).style.display = 'block';
      ;(document.getElementById('useProvider') as any).onclick = async () => {
        const idx = Number((document.getElementById('providerSelect') as HTMLSelectElement).value || '0');
        await useProvider(list[idx].provider);
      };
    } catch (e: any) {
      if (isUserRejected(e)) return showToast('You canceled the wallet request');
      showToast('Connect failed: ' + (e?.message || e));
    }
  };

  async function useProvider(pv: any) {
    try {
      provider = new ethers.providers.Web3Provider(pv, 'any');
      await provider.send('eth_requestAccounts', []);
      signer = provider.getSigner();
      const addr = await signer.getAddress();
      (document.getElementById("account") as any).textContent = addr;
      const payerEl = document.getElementById('payer') as HTMLInputElement | null;
      if (payerEl) payerEl.value = addr;
      (document.getElementById('providerRow') as HTMLElement).style.display = 'none';
      currentAccount = addr;
      try {
        const net = await (provider as any).getNetwork();
        const cid = Number(net?.chainId || 0);
        if (cid !== 31337 && cid !== 11155111) {
          updateNetBanner(true, 'No PlanCatalog on this network. Switch to Sepolia.');
        } else {
          updateNetBanner(false);
        }
      } catch {}
      // Default merchant fields to connected wallet for a smoother UX
      const merch = document.getElementById('merchant') as HTMLInputElement | null;
      const merchSub = document.getElementById('merchantSub') as HTMLInputElement | null;
      if (merch) { merch.value = addr; merch.disabled = true; }
      if (merchSub && (!merchSub.value || !isAddress(merchSub.value))) { merchSub.value = addr; }
      // Auto-load merchant plans if button exists
      const loadPlansBtn = document.getElementById('loadPlans') as HTMLButtonElement | null;
      loadPlansBtn && loadPlansBtn.click();
      // Auto-populate subscriber plans if button exists
      const findPlansBtn = document.getElementById('findPlansSub') as HTMLButtonElement | null;
      findPlansBtn && findPlansBtn.click();
    } catch (e: any) {
      if (isUserRejected(e)) return showToast('You canceled the wallet request');
      showToast('Provider failed: ' + (e?.message || e));
    }
  }

  (document.getElementById('readOnly') as any).onclick = async () => {
    try {
      const rpc = 'http://127.0.0.1:8545';
      const p = new (ethers as any).providers.JsonRpcProvider(rpc);
      await p.getBlockNumber();
      provider = p;
      signer = undefined;
      (document.getElementById("account") as any).textContent = '(read-only)';
      (document.getElementById('providerRow') as HTMLElement).style.display = 'none';
      showToast('Read-only mode enabled');
      updateNetBanner(false);
    } catch (e: any) {
      showToast('Read-only failed: ' + (e?.message || e));
    }
  };

  const btnLoadPayers = document.getElementById('loadPayers');
  btnLoadPayers && ((btnLoadPayers as any).onclick = async () => {
    if (!signer || !provider) return alert('Connect wallet first');
    const regAddr = $("regAddr").value;
    // Prefer connected wallet as merchant; fallback to field
    let merchant = (currentAccount || $("merchant").value || '').trim();
    try {
      requireAddress(regAddr, 'Registry address');
      if (!merchant || !isAddress(merchant)) {
        // Avoid noisy validation in demo mode
        if (demoMode) { showToast('Connect wallet to load payers'); return; }
        return alert('Merchant address required (connect wallet).');
      }
    } catch (e: any) { return alert(e?.message || e); }
    const reg = new ethers.Contract(regAddr, regAbi, provider);
    const list = await reg.getPayers(merchant);
    const container = document.getElementById("payers") as HTMLElement;
    container.innerHTML = '';
  for (const addr of list as string[]) {
      const row = document.createElement('div');
      row.className = 'payer';
      const cmd = `npx hardhat charge --payer ${addr} --subscription ${$("subAddr").value}`;
      // Fetch on-chain info: next due and inner ETH balance
      try {
        const cView = new (ethers as any).Contract($("subAddr").value, [
          "function nextChargeDueAt(address) view returns (uint256)",
          "function ethBalances(address) view returns (uint256)",
        ], provider);
        const [due, bal] = await Promise.all([
          cView.nextChargeDueAt(addr),
          cView.ethBalances(addr),
        ]);
        const dueTs = Number(due.toString());
        const dueIso = dueTs && dueTs < 1e12 ? new Date(dueTs * 1000).toISOString() : new Date(dueTs).toISOString();
        const balEth = (ethers as any).utils.formatEther(bal);
        row.innerHTML = `<div><b>${addr}</b> — next due: ${dueIso} — inner balance: ${balEth} ETH</div>
        <div>Charge CLI: <code>${cmd}</code> <button class=\"copy\">Copy</button>
        <button class=\"browser\">Charge via Browser</button></div>`;
      } catch (e) {
        row.innerHTML = `<div><b>${addr}</b></div>
        <div>Charge CLI: <code>${cmd}</code> <button class=\"copy\">Copy</button>
        <button class=\"browser\">Charge via Browser</button></div>`;
      }
      (row.querySelector('button.copy') as any).onclick = async () => {
        await (navigator as any).clipboard.writeText(cmd);
        alert('Copied');
      };
      (row.querySelector('button.browser') as any).onclick = async () => {
        try {
          await chargeViaBrowser(addr);
          showToast('Charged');
          const btn = document.getElementById('loadCharges') as HTMLButtonElement | null;
          btn && btn.click();
          document.getElementById('charges')?.scrollIntoView({ behavior: 'smooth' });
        } catch (e: any) {
          alert('Charge failed: ' + (e && e.message ? e.message : e));
        }
      };
      container.appendChild(row);
    }
  });

  // Removed legacy basic subscribe handler (replaced by Simple and Advanced flows)

  const btnDeposit = document.getElementById('deposit');
  btnDeposit && ((btnDeposit as any).onclick = async () => {
    try {
      if (!signer) return showToast('Connect wallet first');
      const c = new ethers.Contract($("subAddr").value, subAbi, signer);
      const value = ethers.utils.parseEther($("eth").value);
      const tx = await c.depositETH({ value });
      await tx.wait();
      showToast('ETH deposited');
    } catch (e: any) {
      if (isUserRejected(e)) return showToast('You canceled the wallet request');
      showToast('Deposit failed: ' + (e?.message || e));
    }
  });

  // Approve & deposit token
  const btnApproveDeposit = document.getElementById('approveDeposit');
  btnApproveDeposit && ((btnApproveDeposit as any).onclick = async () => {
    try {
      if (!signer) return showToast('Connect wallet first');
      const token = ($("tokenAddr").value || '').trim();
      const amt = ($("tokenAmt").value || '').trim();
      if (!token || !amt) return showToast('Provide token address and amount');
      try {
        requireAddress($("subAddr").value, 'Subscription address');
        requireAddress(token, 'Token address');
      } catch (e: any) { return showToast(e?.message || e); }
      const erc20 = new (ethers as any).Contract(token, [
        "function decimals() view returns (uint8)",
        "function approve(address,uint256) returns (bool)",
      ], signer);
      const d = await erc20.decimals();
      const units = (ethers as any).utils.parseUnits(amt, d);
      const sub = $("subAddr").value;
      const approveTx = await erc20.approve(sub, units);
      await approveTx.wait();
      const c = new (ethers as any).Contract(sub, [
        "function depositToken(address token,uint256 amount)",
      ], signer);
      const depTx = await c.depositToken(token, units);
      await depTx.wait();
      showToast('Token deposited');
    } catch (e: any) {
      if (isUserRejected(e)) return showToast('You canceled the wallet request');
      showToast('Token deposit failed: ' + (e?.message || e));
    }
  });

  // Load recent charges from subgraph if provided, otherwise from on-chain logs (last 5000 blocks)
  const btnLoadCharges = document.getElementById('loadCharges');
  btnLoadCharges && ((btnLoadCharges as any).onclick = async () => {
    const subgraph = (document.getElementById('subgraphUrl') as HTMLInputElement).value.trim();
    const merchant = ($("merchant").value || '').toLowerCase();
    const wrap = document.getElementById('charges') as HTMLElement;
    wrap.innerHTML = '';

    if (subgraph) {
      const body = {
        query: `query($merchant: String!) { charges(where: { merchant: $merchant }, orderBy: timestamp, orderDirection: desc, first: 10) {
          payer merchant usdCents priceEthUsd_8 paidEthWei nextChargeAt timestamp txHash
        } }`,
        variables: { merchant },
      };
      const r = await fetch(subgraph, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const charges = (j && j.data && j.data.charges) || [];
      charges.forEach((c: any) => {
        const div = document.createElement('div');
        div.className = 'payer';
        const eth = (ethers as any).utils.formatEther(c.paidEthWei);
        const ts = new Date(Number(c.timestamp) * 1000).toISOString();
        div.innerHTML = `<b>Payer:</b> ${c.payer} <b>Paid:</b> ${eth} ETH <b>USD Cents:</b> ${c.usdCents} <b>At:</b> ${ts} <b>Tx:</b> ${c.txHash}`;
        wrap.appendChild(div);
      });
      return;
    }

    try {
      if (!provider) {
        const list = await enumerateProviders();
        if (list.length) provider = new (ethers as any).providers.Web3Provider(list[0].provider, 'any');
      }
      requireAddress($("subAddr").value, 'Subscription address');
      const subAddr = $("subAddr").value;
      const iface = new (ethers as any).utils.Interface([
        'event Charged(address indexed payer,address indexed merchant,uint256 usdCents,uint256 price_8,uint256 paidUnits,uint256 nextChargeAt)'
      ]);
      const topic = (ethers as any).utils.id('Charged(address,address,uint256,uint256,uint256,uint256)');
      const latest = await (provider as any).getBlockNumber();
      const from = Math.max(0, latest - 5000);
      const logs = await (provider as any).getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [topic] });
      const last = logs.slice(-10).reverse();
      for (const lg of last) {
        const ev = iface.parseLog(lg);
        const block = await (provider as any).getBlock(lg.blockNumber);
        const ts = new Date(Number(block.timestamp) * 1000).toISOString();
        const div = document.createElement('div');
        div.className = 'payer';
        div.innerHTML = `<b>Payer:</b> ${ev.args.payer} <b>Paid Units:</b> ${ev.args.paidUnits.toString()} <b>USD Cents:</b> ${ev.args.usdCents.toString()} <b>At:</b> ${ts} <b>Tx:</b> ${lg.transactionHash}`;
        wrap.appendChild(div);
      }
    } catch (e: any) {
      alert('Failed to load charges: ' + (e?.message || e));
    }
  });

  // Check data service status via server /status
  const btnCheckStatus = document.getElementById('checkStatus');
  btnCheckStatus && ((btnCheckStatus as any).onclick = async () => {
    const server = (document.getElementById('serverUrl') as HTMLInputElement).value || 'http://localhost:3001';
    const r = await fetch(server.replace(/\/$/, '') + '/status');
    const j = await r.json();
    (document.getElementById('status') as HTMLElement).textContent = JSON.stringify(j, null, 2);
  });

  async function chargeViaBrowser(payerAddr: string) {
    if (!signer || !provider) throw new Error('Connect wallet first');
    const subAddr = $("subAddr").value;
    const server = $("serverUrl").value || 'http://localhost:3001';
    const url = new URL(server.replace(/\/$/, '') + '/payload');
    url.searchParams.set('feeds', 'ETH');
    url.searchParams.set('uniqueSignersCount', '3');
    const resp = await fetch(url.toString());
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || 'Payload error');
    const payloadHex = json.payloadHex as string;
    const iface = new ethers.utils.Interface(['function charge(address payer)']);
    const data = iface.encodeFunctionData('charge', [payerAddr]);
    const tx = await signer.sendTransaction({ to: subAddr, data: data + payloadHex.slice(2) });
    await tx.wait();
    return tx.hash as string;
  }

  window.addEventListener('DOMContentLoaded', async () => {
    // Default to demo mode
    document.body.classList.add('demo');
    try {
      const server = $("serverUrl").value || 'http://localhost:3001';
      const resp = await fetch(server.replace(/\/$/, '') + '/addresses');
      if (resp.ok) {
        const json = await resp.json();
        if (json.PLAN_CATALOG_ADDRESS) (document.getElementById('catalogAddr') as HTMLInputElement).value = json.PLAN_CATALOG_ADDRESS;
        if (json.SUBSCRIPTION_ADDRESS) $("subAddr").value = json.SUBSCRIPTION_ADDRESS;
        if (json.PAYER_REGISTRY_ADDRESS) $("regAddr").value = json.PAYER_REGISTRY_ADDRESS;
        const mEl0 = document.getElementById('merchant') as HTMLInputElement | null;
        if (mEl0 && json.MERCHANT_ADDRESS) mEl0.value = json.MERCHANT_ADDRESS;
        const mSub = document.getElementById('merchantSub') as HTMLInputElement | null;
        if (mSub && json.MERCHANT_ADDRESS) mSub.value = json.MERCHANT_ADDRESS;
        // Lock fields if we have server-supplied addresses
        if (json.PLAN_CATALOG_ADDRESS) (document.getElementById('catalogAddr') as HTMLInputElement).disabled = true;
        if (json.SUBSCRIPTION_ADDRESS) (document.getElementById('subAddr') as HTMLInputElement).disabled = true;
        if (json.PAYER_REGISTRY_ADDRESS) (document.getElementById('regAddr') as HTMLInputElement).disabled = true;
        const mEl1 = document.getElementById('merchant') as HTMLInputElement | null;
        if (mEl1 && json.MERCHANT_ADDRESS) mEl1.disabled = true;
      } else {
        // Fallback to chain defaults (networks.json)
        try {
          const nets = await (await fetch('./networks.json')).json();
          let chainId = '31337';
          try {
            const list = await enumerateProviders();
            if (list.length) {
              const p = new (ethers as any).providers.Web3Provider(list[0].provider, 'any');
              const net = await p.getNetwork();
              chainId = net.chainId.toString();
            }
          } catch {}
          const cfg = nets[chainId];
          if (cfg) {
            if (cfg.PLAN_CATALOG_ADDRESS) (document.getElementById('catalogAddr') as HTMLInputElement).value = cfg.PLAN_CATALOG_ADDRESS;
            if (cfg.SUBSCRIPTION_ADDRESS) $("subAddr").value = cfg.SUBSCRIPTION_ADDRESS;
            if (cfg.PAYER_REGISTRY_ADDRESS) $("regAddr").value = cfg.PAYER_REGISTRY_ADDRESS;
            const mEl2 = document.getElementById('merchant') as HTMLInputElement | null;
            if (mEl2 && cfg.MERCHANT_ADDRESS) mEl2.value = cfg.MERCHANT_ADDRESS;
            const mSub2 = document.getElementById('merchantSub') as HTMLInputElement | null;
            if (mSub2 && cfg.MERCHANT_ADDRESS) mSub2.value = cfg.MERCHANT_ADDRESS;
          }
        } catch {}
      }
    } catch {}
    try {
      // Load token presets: server config -> chain presets -> tokens.json
      let presets: any[] | null = null;
      try {
        const cfg = await (await fetch('/config')).json();
        if (cfg && cfg.ok && Array.isArray(cfg.PRESET_TOKENS) && cfg.PRESET_TOKENS.length) {
          presets = cfg.PRESET_TOKENS;
        }
      } catch {}
      if (!presets) {
        try {
          const nets = await (await fetch('./presets.json')).json();
          let chainId = '31337';
          try {
            const list = await enumerateProviders();
            if (list.length) {
              const p = new (ethers as any).providers.Web3Provider(list[0].provider, 'any');
              const net = await p.getNetwork();
              chainId = net.chainId.toString();
            }
          } catch {}
          presets = nets[chainId] || null;
        } catch {}
      }
      if (!presets) {
        const tResp = await fetch('./tokens.json');
        if (tResp.ok) presets = await tResp.json();
      }
      if (presets) {
        const sel1 = document.getElementById('tokenPreset') as HTMLSelectElement | null;
        const sel2 = document.getElementById('simpleToken') as HTMLSelectElement | null;
        const sel3 = document.getElementById('planPreset') as HTMLSelectElement | null;
        if (sel1) {
          sel1.innerHTML = '';
          for (const t of presets) {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(t);
            opt.textContent = t.label;
            sel1.appendChild(opt);
          }
        }
        if (sel2) {
          sel2.innerHTML = '';
          for (const t of presets) {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(t);
            opt.textContent = t.label;
            sel2.appendChild(opt);
          }
        }
        if (sel3) {
          sel3.innerHTML = '';
          for (const t of presets) {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(t);
            opt.textContent = t.label;
            sel3.appendChild(opt);
          }
        }
      }
    } catch {}
    // Apply query params
    const q = new URLSearchParams(location.search);
    if (q.get('server')) ($("serverUrl").value = q.get('server') as string);
    if (q.get('sub')) ($("subAddr").value = q.get('sub') as string);
    if (q.get('reg')) ($("regAddr").value = q.get('reg') as string);
    if (q.get('merchant')) {
      const mElQ = document.getElementById('merchant') as HTMLInputElement | null;
      if (mElQ) mElQ.value = q.get('merchant') as string;
    }
    if (q.get('asset')) ($("advAsset").value = q.get('asset') as string);
    if (q.get('feed')) ((document.getElementById('advFeedId') as HTMLSelectElement).value = q.get('feed') as string);
    if (q.get('cents')) ($("advCents").value = q.get('cents') as string);
    if (q.get('period')) ($("advPeriod").value = q.get('period') as string);
    if (q.get('max')) ($("advMaxUnits").value = q.get('max') as string);
    if (q.get('feeBps')) ($("advFeeBps").value = q.get('feeBps') as string);
    // Bind tab buttons after DOM is ready
    const btnSubTab2 = document.getElementById('tabBtnSub') as HTMLButtonElement | null;
    const btnMerchTab2 = document.getElementById('tabBtnMerch') as HTMLButtonElement | null;
    btnSubTab2 && (btnSubTab2.onclick = () => activateTab('sub'));
    btnMerchTab2 && (btnMerchTab2.onclick = () => activateTab('merch'));

    // Role hero buttons
    const goSub = document.getElementById('goSubscriber') as HTMLButtonElement | null;
    const goMer = document.getElementById('goMerchant') as HTMLButtonElement | null;
    goSub && (goSub.onclick = () => {
      activateTab('sub');
      document.getElementById('plansSubList')?.scrollIntoView({ behavior: 'smooth' });
    });
    goMer && (goMer.onclick = () => {
      activateTab('merch');
      document.getElementById('planName')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Demo toggle
    const demoBtn = document.getElementById('toggleDemo') as HTMLButtonElement | null;
    if (demoBtn) {
      demoBtn.onclick = () => {
        demoMode = !demoMode;
        if (demoMode) {
          document.body.classList.add('demo');
          demoBtn.textContent = 'Demo Mode: ON';
          showToast('Demo Mode enabled');
        } else {
          document.body.classList.remove('demo');
          demoBtn.textContent = 'Demo Mode: OFF';
          showToast('Demo Mode disabled');
        }
      };
    }

    // Auto-show plans for subscribers on load (uses real catalog if available, else demo plans)
    const autoFind = document.getElementById('findPlansSub') as HTMLButtonElement | null;
    // Auto-refresh plans on load without showing fields
    autoFind && autoFind.click();

    // Bind network switch button
    const btnSwitch = document.getElementById('switchSepolia') as HTMLButtonElement | null;
    btnSwitch && (btnSwitch.onclick = async () => {
      try {
        const cid = '0xaa36a7';
        await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cid }] });
        location.reload();
      } catch (e: any) {
        if (e && (e.code === 4902 || (e.data && e.data.originalError && e.data.originalError.code === 4902))) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
            location.reload();
          } catch (e2: any) { showToast(e2?.message || e2); }
        } else {
          showToast(e?.message || e);
        }
      }
    });
  });

  // Advanced plan: quote using contract view with appended RedStone payload
  async function getPayloadHex(feedsCsv: string): Promise<string> {
    const server = ($("serverUrl").value || 'http://localhost:3001').replace(/\/$/, '');
    const url = new URL(server + '/payload');
    url.searchParams.set('feeds', feedsCsv);
    url.searchParams.set('uniqueSignersCount', '3');
    const resp = await fetch(url.toString());
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || 'Payload error');
    return json.payloadHex as string;
  }

  function toBytes32(feedId: string): string {
    return (ethers as any).utils.formatBytes32String(feedId);
  }

  function fromBytes32ToStringSafe(b32: string): string | null {
    try {
      return (ethers as any).utils.parseBytes32String(b32);
    } catch { return null; }
  }

  // Helper to render a plan card with Subscribe action
  function renderPlanCard(container: HTMLElement, merchant: string, asset: string, feedBytes32OrStr: any, usdCents: string | number, period: string | number, name: string) {
    const feedStr = typeof feedBytes32OrStr === 'string' && (feedBytes32OrStr as string).startsWith('0x')
      ? fromBytes32ToStringSafe(feedBytes32OrStr) || 'ETH'
      : (feedBytes32OrStr as string);
    const price = (Number(usdCents)/100).toFixed(2);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h4>${name}</h4>
      <div class=\"price\">$${price} per ${Math.round(Number(period)/86400)} day(s)</div>
      <div class=\"muted\">Token: ${asset === '0x0000000000000000000000000000000000000000' ? 'ETH' : asset} — Feed: ${feedStr}</div>
      <div class=\"row\"><button class=\"btn splanSub\">Subscribe</button></div>`;
    (card.querySelector('.splanSub') as any).onclick = async () => {
      try {
        await ensureProviderReady();
        const subAddr = $("subAddr").value;
        requireAddress(subAddr, 'Subscription address');
        let merchantUse = merchant;
        if (!isAddress(merchantUse) && currentAccount) merchantUse = currentAccount;
        if (!merchantUse || !isAddress(merchantUse)) { showToast('Connect wallet to subscribe'); return; }
        const c2 = new (ethers as any).Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
        const feedBytes = (typeof feedBytes32OrStr === 'string' && (feedBytes32OrStr as string).startsWith('0x')) ? feedBytes32OrStr : toBytes32(feedBytes32OrStr);
        const tx = await c2.subscribeAdvanced(merchantUse, asset, feedBytes, usdCents, period, 0, 0);
        await tx.wait();
        // Offer prepay 1 period now
        try {
          const iface = new (ethers as any).utils.Interface([
            'function quoteEthForUsdCents(uint256) view returns (uint256)',
            'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
          ]);
          let data;
          if (asset === '0x0000000000000000000000000000000000000000') data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
          else data = iface.encodeFunctionData('quoteTokenForUsdCents', [feedBytes, asset, usdCents]);
          const payloadHex = await getPayloadHex(feedStr || 'ETH');
          const callData = data + payloadHex.slice(2);
          const raw = await (provider as any).call({ to: subAddr, data: callData });
          const units = (asset === '0x0000000000000000000000000000000000000000'
            ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
            : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
          const yes = confirm('Subscribed! Prepay 1 period now?');
          if (yes) {
            if (asset === '0x0000000000000000000000000000000000000000') {
              const dc = new (ethers as any).Contract(subAddr, ['function depositETH() payable'], signer);
              await (await dc.depositETH({ value: units })).wait();
            } else {
              const erc20 = new (ethers as any).Contract(asset, ['function approve(address,uint256) returns (bool)'], signer);
              await (await erc20.approve(subAddr, units)).wait();
              const dc = new (ethers as any).Contract(subAddr, ['function depositToken(address,uint256)'], signer);
              await (await dc.depositToken(asset, units)).wait();
            }
          }
        } catch {}
        showToast('Subscribed to plan');
      } catch (e: any) { showToast(e?.message || e); }
    };
    container.appendChild(card);
  }

  async function ensureCatalog(): Promise<any> {
    const catAddr = (document.getElementById('catalogAddr') as HTMLInputElement).value;
    requireAddress(catAddr, 'PlanCatalog address');
    await ensureProviderReady();
    const code = await (provider as any).getCode(catAddr);
    if (!code || code === '0x') {
      try {
        const net = await (provider as any).getNetwork();
        const cid = Number(net?.chainId || 0);
        if (cid !== 31337) updateNetBanner(true, 'No PlanCatalog on this network. Switch to Sepolia.');
      } catch {}
      throw new Error('No contract found at PlanCatalog address. Please deploy or set the correct address.');
    }
    const cat = new (ethers as any).Contract(catAddr, [
      'function getPlanCount(address) view returns (uint256)',
      'function getPlan(address,uint256) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,string,bool)'
    ], provider || (new (ethers as any).providers.Web3Provider((window as any).ethereum, 'any')));
    return cat;
  }

  const btnAdvQuote = document.getElementById('advQuote');
  // Hidden in simple demo; keep handler no-op if element missing
  btnAdvQuote && ((btnAdvQuote as any).onclick = async () => {
    try {
      const subAddr = $("subAddr").value;
      const asset = ($("advAsset").value || '').trim();
      const feedIdStr = ($("advFeedId") as any).value;
      const usdCents = $("advCents").value;
      requireAddress(subAddr, 'Subscription address');
      if (asset) requireAddress(asset, 'Asset token');
      const iface = new (ethers as any).utils.Interface([
        'function quoteEthForUsdCents(uint256) view returns (uint256)',
        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
      ]);
      let data: string;
      let feeds = feedIdStr;
      if (!asset) {
        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
      } else {
        data = iface.encodeFunctionData('quoteTokenForUsdCents', [toBytes32(feedIdStr), asset, usdCents]);
      }
      const payloadHex = await getPayloadHex(feeds);
      const callData = data + payloadHex.slice(2);
      const raw = await (provider as any).call({ to: subAddr, data: callData });
      const decoded = !asset
        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0];
      const units = (decoded as any).toString();
      let pretty = units;
      if (!asset) {
        pretty = (ethers as any).utils.formatEther(units) + ' ETH';
      } else {
        try {
          const d = await new (ethers as any).Contract(asset, ['function decimals() view returns (uint8)'], provider).decimals();
          pretty = (ethers as any).utils.formatUnits(units, d) + ' tokens';
        } catch { /* ignore */ }
      }
      (document.getElementById('advQuoteOut') as HTMLElement).textContent = `~ ${pretty} for 1 period`;
    } catch (e: any) {
      alert('Quote failed: ' + (e?.message || e));
    }
  });

  // Load plans for the merchant from PlanCatalog (Merchant tab)
  const btnLoadPlans = document.getElementById('loadPlans');
  btnLoadPlans && ((btnLoadPlans as any).onclick = async () => {
    try {
      let cat: any = null;
      try { cat = await ensureCatalog(); } catch (e) {}
      // Pick merchant from connected wallet; fallback to field
      let merchant = (currentAccount || ((document.getElementById('merchant') as HTMLInputElement | null)?.value) || '').trim();
      if (!merchant || !isAddress(merchant)) {
        const listWrap = document.getElementById('plansList') as HTMLElement;
        listWrap.innerHTML = '';
        // Silent, friendly fallback in demo mode (no validation error)
        listWrap.textContent = 'Connect wallet to load your plans.';
        return;
      }
      if (!cat) {
        const listWrap = document.getElementById('plansList') as HTMLElement;
        listWrap.innerHTML = '';
        listWrap.textContent = 'PlanCatalog not available on this network.';
        return;
      }
      const count = await cat.getPlanCount(merchant);
      const listWrap = document.getElementById('plansList') as HTMLElement;
      listWrap.innerHTML = '';
      for (let i = 0; i < Number(count.toString()); i++) {
        const p = await cat.getPlan(merchant, i);
        if (!p[8]) continue; // active
        const feedStr = fromBytes32ToStringSafe(p[2]) || 'ETH';
        const name = p[7];
        const usdCents = p[4].toString();
        const period = p[5].toString();
        const asset = p[1];
        const feeBps = p[3].toString();
        const maxUnits = p[6].toString();
        const div = document.createElement('div');
        div.className = 'card';
        const price = (Number(usdCents)/100).toFixed(2);
        div.innerHTML = `<h4>${name}</h4>
          <div class=\"price\">$${price} per ${Math.round(Number(period)/86400)} day(s)</div>
          <div class=\"muted\">Token: ${asset === '0x0000000000000000000000000000000000000000' ? 'ETH' : asset} — Feed: ${feedStr} — Caller fee: ${feeBps} bps</div>
          <div class=\"row\"><button class=\"btn splan\">Subscribe</button></div>`;
        (div.querySelector('.splan') as any).onclick = async () => {
          try {
            await ensureProviderReady();
            const subAddr = $("subAddr").value;
            requireAddress(subAddr, 'Subscription address');
            // Subscribe with plan
            const c2 = new (ethers as any).Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
            const tx = await c2.subscribeAdvanced(merchant, asset, p[2], usdCents, period, maxUnits, feeBps);
            await tx.wait();
            showToast('Subscribed to plan');
          } catch (e: any) { showToast(e?.message || e); }
        };
        listWrap.appendChild(div);
      }
    } catch (e: any) {
      alert('Load plans failed: ' + (e?.message || e));
    }
  });

  // (removed) Trim plans button and handler

  // Find plans for subscribers (Subscriber tab)
  const btnFindPlansSub = document.getElementById('findPlansSub');
  btnFindPlansSub && ((btnFindPlansSub as any).onclick = async () => {
    try {
      let cat: any = null;
      try { cat = await ensureCatalog(); } catch (e) { /* no catalog on this network */ }
      let merchantAddr = (document.getElementById('merchantSub') as HTMLInputElement | null)?.value || '';
      if (!merchantAddr || !isAddress(merchantAddr)) {
        const mEl = document.getElementById('merchant') as HTMLInputElement | null;
        merchantAddr = (mEl?.value || '');
      }
      if ((!merchantAddr || !isAddress(merchantAddr)) && currentAccount) {
        merchantAddr = currentAccount;
        const mSub = document.getElementById('merchantSub') as HTMLInputElement | null;
        mSub && (mSub.value = currentAccount);
      }
      const listWrap = document.getElementById('plansSubList') as HTMLElement;
      const notice = document.getElementById('plansNotice') as HTMLElement | null;
      listWrap.innerHTML = '';
      if (cat) {
        if (!merchantAddr || !isAddress(merchantAddr)) {
          if (notice) notice.textContent = 'Enter a merchant address or connect your wallet.';
          return;
        }
        const merchant = merchantAddr;
        const count = await cat.getPlanCount(merchant);
        for (let i = 0; i < Number(count.toString()); i++) {
          const p = await cat.getPlan(merchant, i);
          if (!p[8]) continue; // active
          renderPlanCard(listWrap, merchant, p[1], p[2], p[4].toString(), p[5].toString(), p[7]);
        }
        if (notice) notice.textContent = '';
      } else {
        const demo = await (await fetch('./demo-plans.json')).json();
        for (const dp of demo) {
          renderPlanCard(listWrap, merchantAddr, dp.asset, dp.feedId, dp.usdCents, dp.period, dp.name);
        }
        if (notice) notice.textContent = 'Demo plans shown (no PlanCatalog deployed).';
      }
      if (!listWrap.innerHTML) listWrap.textContent = 'No active plans published yet.';
    } catch (e: any) {
      showToast('Find plans failed: ' + (e?.message || e));
    }
  });

  const btnAdvSubscribe = document.getElementById('advSubscribe');
  // Hidden in simple demo; keep handler no-op if element missing
  btnAdvSubscribe && ((btnAdvSubscribe as any).onclick = async () => {
    try {
      if (!signer) return alert('Connect wallet first');
      const subAddr = $("subAddr").value;
      const asset = ($("advAsset").value || '').trim();
      const feedIdStr = ($("advFeedId") as any).value;
      const usdCents = $("advCents").value;
      const period = $("advPeriod").value;
      const maxUnits = $("advMaxUnits").value;
      const feeBps = $("advFeeBps").value;
      requireAddress(subAddr, 'Subscription address');
      const merchant = currentAccount || '';
      if (!merchant || !isAddress(merchant)) return alert('Connect wallet first');
      if (asset) requireAddress(asset, 'Asset token');
      const c = new (ethers as any).Contract(subAddr, [
        'function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'
      ], signer);
      const tx = await c.subscribeAdvanced(
        merchant,
        asset || '0x0000000000000000000000000000000000000000',
        toBytes32(feedIdStr),
        usdCents,
        period,
        maxUnits,
        feeBps
      );
      await tx.wait();
      alert('Subscribed (advanced)');
    } catch (e: any) {
      alert('Subscribe failed: ' + (e?.message || e));
    }
  });

  // Merchant: Create Starter / Pro plans (ETH)
  const catCreateAbi = [
    'function createPlan(address asset,bytes32 feedId,uint256 usdCentsPerPeriod,uint256 period,uint256 maxUnitsPerCharge,uint16 callerFeeBps,string name) returns (uint256)'
  ];
  const btnCreateStarter = document.getElementById('createStarter');
  btnCreateStarter && ((btnCreateStarter as any).onclick = async () => {
    try {
      await ensureProviderReady();
      const catAddr = (document.getElementById('catalogAddr') as HTMLInputElement).value;
      requireAddress(catAddr, 'PlanCatalog address');
      const cat = new (ethers as any).Contract(catAddr, catCreateAbi, signer);
      // Read token preset (if present), default to ETH
      const sel = document.getElementById('planPreset') as HTMLSelectElement | null;
      let preset: any = { address: '0x0000000000000000000000000000000000000000', feedId: 'ETH' };
      try { if (sel && sel.value) preset = JSON.parse(sel.value); } catch {}
      const tx = await cat.createPlan(preset.address, toBytes32(preset.feedId || 'ETH'), 499, 30*24*60*60, 0, 0, 'Starter');
      await tx.wait();
      showToast('Starter plan created');
      try {
        const n = await seedRegistryFromRecent();
        if (n) showToast(`Seeded ${n} payers from recent subscribers`);
      } catch {}
    } catch (e: any) { showToast(e?.message || e); }
  });
  const btnCreatePro = document.getElementById('createPro');
  btnCreatePro && ((btnCreatePro as any).onclick = async () => {
    try {
      await ensureProviderReady();
      const catAddr = (document.getElementById('catalogAddr') as HTMLInputElement).value;
      requireAddress(catAddr, 'PlanCatalog address');
      const cat = new (ethers as any).Contract(catAddr, catCreateAbi, signer);
      const sel = document.getElementById('planPreset') as HTMLSelectElement | null;
      let preset: any = { address: '0x0000000000000000000000000000000000000000', feedId: 'ETH' };
      try { if (sel && sel.value) preset = JSON.parse(sel.value); } catch {}
      const tx = await cat.createPlan(preset.address, toBytes32(preset.feedId || 'ETH'), 999, 30*24*60*60, 0, 0, 'Pro');
      await tx.wait();
      showToast('Pro plan created');
      try {
        const n = await seedRegistryFromRecent();
        if (n) showToast(`Seeded ${n} payers from recent subscribers`);
      } catch {}
    } catch (e: any) { showToast(e?.message || e); }
  });

  // Demo: Subscribe as the connected wallet using first active plan
  const btnSubscribeSelf = document.getElementById('subscribeSelf');
  btnSubscribeSelf && ((btnSubscribeSelf as any).onclick = async () => {
    try {
      await ensureProviderReady();
      requireAddress($("subAddr").value, 'Subscription address');
      const merchant = currentAccount || '';
      if (!merchant || !isAddress(merchant)) return alert('Connect wallet first');
      const subAddr = $("subAddr").value;
      const cat = await ensureCatalog();
      const count = await cat.getPlanCount(merchant);
      let picked: any = null;
      for (let i = 0; i < Number(count.toString()); i++) {
        const p = await cat.getPlan(merchant, i);
        if (p[8]) { picked = p; break; }
      }
      if (!picked) return showToast('No active plans to subscribe');
      const asset = picked[1] as string;
      const feedBytes = picked[2] as string;
      const usdCents = picked[4].toString();
      const period = picked[5].toString();
      const maxUnits = picked[6].toString();
      const feeBps = picked[3].toString();
      const iface = new (ethers as any).utils.Interface([
        'function quoteEthForUsdCents(uint256) view returns (uint256)',
        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
      ]);
      let data: string;
      if (asset === '0x0000000000000000000000000000000000000000') data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
      else data = iface.encodeFunctionData('quoteTokenForUsdCents', [feedBytes, asset, usdCents]);
      const feedStr = fromBytes32ToStringSafe(feedBytes) || 'ETH';
      const payloadHex = await getPayloadHex(feedStr);
      const callData = data + payloadHex.slice(2);
      const raw = await (provider as any).call({ to: subAddr, data: callData });
      const unitsOne = (asset === '0x0000000000000000000000000000000000000000'
        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]) as any;
      // Deposit for 1 period
      if (asset === '0x0000000000000000000000000000000000000000') {
        const c = new (ethers as any).Contract(subAddr, ['function depositETH() payable'], signer);
        await (await c.depositETH({ value: unitsOne })).wait();
      } else {
        const erc20 = new (ethers as any).Contract(asset, ['function approve(address,uint256) returns (bool)'], signer);
        await (await erc20.approve(subAddr, unitsOne)).wait();
        const c = new (ethers as any).Contract(subAddr, ['function depositToken(address,uint256)'], signer);
        await (await c.depositToken(asset, unitsOne)).wait();
      }
      const c2 = new (ethers as any).Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
      await (await c2.subscribeAdvanced(merchant, asset, feedBytes, usdCents, period, maxUnits, feeBps)).wait();
      showToast('Subscribed self (demo)');
      try {
        const n = await seedRegistryFromRecent();
        if (n) showToast(`Seeded ${n} payers from recent subscribers`);
      } catch {}
      // Auto-open Due Now and refresh
      const btn = document.getElementById('refreshDue') as HTMLButtonElement | null;
      btn && btn.click();
      document.getElementById('dueNow')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e: any) {
      showToast(e?.message || e);
    }
  });

  // Cancel my subscription (demo)
  const btnCancelSelf = document.getElementById('cancelSelf');
  btnCancelSelf && ((btnCancelSelf as any).onclick = async () => {
    try {
      await ensureProviderReady();
      requireAddress($("subAddr").value, 'Subscription address');
      const c = new (ethers as any).Contract($("subAddr").value, ['function cancel()'], signer);
      await (await c.cancel()).wait();
      showToast('Subscription canceled');
      const btn = document.getElementById('refreshDue') as HTMLButtonElement | null;
      btn && btn.click();
      document.getElementById('dueNow')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e: any) {
      showToast(e?.message || e);
    }
  });

  // Reset demo: cancel + withdraw ETH/token (for current plan asset)
  const btnReset = document.getElementById('resetDemo');
  btnReset && ((btnReset as any).onclick = async () => {
    try {
      await ensureProviderReady();
      const payer = currentAccount || '';
      if (!payer || !isAddress(payer)) return alert('Connect wallet first');
      requireAddress($("subAddr").value, 'Subscription address');
      const subAddr = $("subAddr").value;
      const view = new (ethers as any).Contract(subAddr, [
        'function plans(address) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,uint256,bool)',
        'function ethBalances(address) view returns (uint256)',
        'function tokenBalances(address,address) view returns (uint256)'
      ], provider);
      const plan = await view.plans(payer);
      const asset = plan[1] as string;
      // cancel if active
      if (plan[8]) {
        const c = new (ethers as any).Contract(subAddr, ['function cancel()'], signer);
        await (await c.cancel()).wait();
      }
      // withdraw ETH
      const ethBal = await view.ethBalances(payer);
      if (ethBal && ethBal.toString() !== '0') {
        const c = new (ethers as any).Contract(subAddr, ['function withdrawETH(uint256)'], signer);
        await (await c.withdrawETH(ethBal)).wait();
      }
      // withdraw token for current plan asset
      if (asset && asset !== '0x0000000000000000000000000000000000000000') {
        const tBal = await view.tokenBalances(payer, asset);
        if (tBal && tBal.toString() !== '0') {
          const c = new (ethers as any).Contract(subAddr, ['function withdrawToken(address,uint256)'], signer);
          await (await c.withdrawToken(asset, tBal)).wait();
        }
      }
      showToast('Reset complete');
      const btnDue = document.getElementById('refreshDue') as HTMLButtonElement | null;
      btnDue && btnDue.click();
      const btnCharges = document.getElementById('loadCharges') as HTMLButtonElement | null;
      btnCharges && btnCharges.click();
    } catch (e: any) {
      showToast(e?.message || e);
    }
  });

  const btnCopyLink = document.getElementById('copyLink');
  btnCopyLink && ((btnCopyLink as any).onclick = async () => {
    const params = new URLSearchParams();
    const server = $("serverUrl").value;
    const sub = $("subAddr").value;
    const reg = $("regAddr").value;
    const merchant = $("merchant").value;
    const asset = ($("advAsset").value || '').trim();
    const feed = (document.getElementById('advFeedId') as HTMLSelectElement).value;
    const cents = $("advCents").value;
    const period = $("advPeriod").value;
    const max = $("advMaxUnits").value;
    const feeBps = $("advFeeBps").value;
    if (server) params.set('server', server);
    if (sub) params.set('sub', sub);
    if (reg) params.set('reg', reg);
    if (merchant) params.set('merchant', merchant);
    if (asset) params.set('asset', asset);
    if (feed) params.set('feed', feed);
    if (cents) params.set('cents', cents);
    if (period) params.set('period', period);
    if (max) params.set('max', max);
    if (feeBps) params.set('feeBps', feeBps);
    const url = location.origin + location.pathname + '?' + params.toString();
    try { await (navigator as any).clipboard.writeText(url); alert('Link copied'); } catch { alert(url); }
  });

  // Seed registry helper and button
  async function seedRegistryFromRecent(): Promise<number> {
    await ensureProviderReady();
    requireAddress($("regAddr").value, 'Registry address');
    requireAddress($("subAddr").value, 'Subscription address');
    const merchant = currentAccount || '';
    if (!merchant || !isAddress(merchant)) throw new Error('Connect wallet first');
    const subAddr = $("subAddr").value;
    const regAddr = $("regAddr").value;
    const ifaceAdv = new (ethers as any).utils.Interface([
      'event SubscribedAdvanced(address indexed payer,address indexed merchant,address asset,bytes32 feedId,uint256 usdCents,uint256 period,uint256 maxUnitsPerCharge,uint16 callerFeeBps)'
    ]);
    const ifaceBasic = new (ethers as any).utils.Interface([
      'event Subscribed(address indexed payer,address indexed merchant,uint256 usdCents,uint256 period,uint256 maxEthPerChargeWei)'
    ]);
    const advTopic = (ethers as any).utils.id('SubscribedAdvanced(address,address,address,bytes32,uint256,uint256,uint256,uint16)');
    const basicTopic = (ethers as any).utils.id('Subscribed(address,address,uint256,uint256,uint256)');
    const merchantTopic = (ethers as any).utils.hexZeroPad(merchant, 32);
    const latest = await (provider as any).getBlockNumber();
    const from = Math.max(0, latest - 50000);
    const [logsAdv, logsBasic] = await Promise.all([
      (provider as any).getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [advTopic, null, merchantTopic] }),
      (provider as any).getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [basicTopic, null, merchantTopic] }),
    ]);
    const payersSet = new Set<string>();
    for (const lg of logsAdv) { try { const ev = ifaceAdv.parseLog(lg); payersSet.add(ev.args.payer); } catch {} }
    for (const lg of logsBasic) { try { const ev = ifaceBasic.parseLog(lg); payersSet.add(ev.args.payer); } catch {} }
    const payers = Array.from(payersSet);
    if (!payers.length) return 0;
    const reg = new (ethers as any).Contract(regAddr, ['function addPayer(address)'], signer);
    for (const p of payers) { try { await (await reg.addPayer(p)).wait(); } catch {} }
    return payers.length;
  }
  const btnSeedFromSubs = document.getElementById('seedFromSubs');
  btnSeedFromSubs && ((btnSeedFromSubs as any).onclick = async () => {
    try {
      const n = await seedRegistryFromRecent();
      showToast(n ? `Seeded ${n} payers from recent subscribers` : 'No recent subscribers found for your merchant');
    } catch (e: any) { alert('Seed failed: ' + (e?.message || e)); }
  });

  // Tabs: Subscriber vs Merchant
  const tabSub = document.getElementById('tabSubscriber') as HTMLElement;
  const tabMerch = document.getElementById('tabMerchant') as HTMLElement;
  const btnSub = document.getElementById('tabBtnSub') as HTMLButtonElement;
  const btnMerch = document.getElementById('tabBtnMerch') as HTMLButtonElement;
  function activateTab(which: 'sub' | 'merch') {
    if (which === 'sub') {
      tabSub.style.display = '';
      tabMerch.style.display = 'none';
      btnSub.classList.add('active');
      btnMerch.classList.remove('active');
    } else {
      tabSub.style.display = 'none';
      tabMerch.style.display = '';
      btnSub.classList.remove('active');
      btnMerch.classList.add('active');
    }
  }
  // Legacy tab binds moved to DOMContentLoaded guarded section

  const btnApplyPreset = document.getElementById('applyPreset');
  btnApplyPreset && ((btnApplyPreset as any).onclick = () => {
    const sel = document.getElementById('tokenPreset') as HTMLSelectElement;
    try {
      const t = JSON.parse(sel.value);
      if (t.address && t.address !== '0x0000000000000000000000000000000000000000') {
        ($("advAsset").value as any) = t.address;
      } else {
        ($("advAsset").value as any) = '';
      }
      (document.getElementById('advFeedId') as HTMLSelectElement).value = t.feedId || 'ETH';
    } catch {}
  });

  // Due Now (Bounties)
  const btnRefreshDue = document.getElementById('refreshDue');
  btnRefreshDue && ((btnRefreshDue as any).onclick = async () => {
    try {
      requireAddress($("regAddr").value, 'Registry address');
      requireAddress($("subAddr").value, 'Subscription address');
    } catch (e: any) { return alert(e?.message || e); }
    // Prefer connected wallet as merchant; fallback to field
    let merchant = (currentAccount || ((document.getElementById('merchant') as HTMLInputElement | null)?.value) || '').trim();
    if (!merchant || !isAddress(merchant)) {
      const dueWrap = document.getElementById('dueNow') as HTMLElement;
      dueWrap.innerHTML = '';
      dueWrap.textContent = 'Connect wallet to view due payers.';
      return;
    }
    const reg = new (ethers as any).Contract($("regAddr").value, [
      'function getPayers(address) view returns (address[])'
    ], provider || (new (ethers as any).providers.Web3Provider((window as any).ethereum, 'any')));
    const payers: string[] = await reg.getPayers(merchant);
    const subAddr = $("subAddr").value;
    const subView = new (ethers as any).Contract(subAddr, [
      'function nextChargeDueAt(address) view returns (uint256)',
      'function plans(address) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,uint256,bool)'
    ], provider || (new (ethers as any).providers.Web3Provider((window as any).ethereum, 'any')));
    const now = Math.floor(Date.now()/1000);
    const dueWrap = document.getElementById('dueNow') as HTMLElement;
    dueWrap.innerHTML = '';
    for (const p of payers) {
      try {
        const [dueBn, plan] = await Promise.all([subView.nextChargeDueAt(p), subView.plans(p)]);
        const due = Number(dueBn.toString());
        if (due > now) continue;
        const feedStr = fromBytes32ToStringSafe(plan[2]) || 'ETH';
        const usdCents = plan[4].toString();
        // compute owed units and reward
        const isEth = plan[1] === '0x0000000000000000000000000000000000000000';
        const iface = new (ethers as any).utils.Interface([
          'function quoteEthForUsdCents(uint256) view returns (uint256)',
          'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
        ]);
        let data;
        if (isEth) data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
        else data = iface.encodeFunctionData('quoteTokenForUsdCents', [plan[2], plan[1], usdCents]);
        const payloadHex = await getPayloadHex(feedStr);
        const callData = data + payloadHex.slice(2);
        const raw = await (provider as any).call({ to: subAddr, data: callData });
        const units = (isEth ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0] : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
        const unitsStr = units.toString();
        const feeUnits = (units.mul(plan[3]).div(10000)).toString();
        const row = document.createElement('div');
        row.className = 'payer';
        row.innerHTML = `<div><b>${p}</b> — USD cents: ${usdCents} — feed: ${feedStr} — caller fee: ${plan[3]} bps — reward ~ ${feeUnits} units</div>
          <div><button class=\"bcharge\">Charge Now</button></div>`;
        (row.querySelector('.bcharge') as any).onclick = async () => {
          try {
            await chargeViaBrowser(p);
            showToast('Charged');
            const btn = document.getElementById('loadCharges') as HTMLButtonElement | null;
            btn && btn.click();
            document.getElementById('charges')?.scrollIntoView({ behavior: 'smooth' });
          } catch (e: any) { alert(e?.message || e); }
        };
        dueWrap.appendChild(row);
      } catch {}
    }
  });

  // Simple subscribe flow
  async function ensureProviderReady() {
    if (!provider) {
      const list = await enumerateProviders();
      if (list.length) await useProvider(list[0].provider);
    }
    if (!provider) throw new Error('No provider');
  }

  // Populate simple token select
  (async () => {
    try {
      const tResp = await fetch('./tokens.json');
      if (tResp.ok) {
        const list = await tResp.json();
        const sel = document.getElementById('simpleToken') as HTMLSelectElement;
        sel.innerHTML = '';
        for (const t of list as any[]) {
          const opt = document.createElement('option');
          opt.value = JSON.stringify(t);
          opt.textContent = t.label;
          sel.appendChild(opt);
        }
      }
    } catch {}
  })();

  const btnSimpleSubscribe = document.getElementById('simpleSubscribe');
  btnSimpleSubscribe && ((btnSimpleSubscribe as any).onclick = async () => {
    try {
      await ensureProviderReady();
      requireAddress($("subAddr").value, 'Subscription address');
      const subAddr = $("subAddr").value;
      const merchant = currentAccount || '';
      if (!merchant || !isAddress(merchant)) return alert('Connect wallet first');
      const centsStr = ($("simpleCents").value || '9.99').toString();
      // Convert to cents integer
      const usdCents = Math.round(parseFloat(centsStr) * 100);
      const period = parseInt((document.getElementById('simplePeriod') as HTMLSelectElement).value, 10);
      const preset = JSON.parse((document.getElementById('simpleToken') as HTMLSelectElement).value);
      const asset = preset.address;
      const feedIdStr = preset.feedId || 'ETH';
      const periodsCount = parseInt(($("simplePeriodsCount").value || '1').toString(), 10);
      const iface = new (ethers as any).utils.Interface([
        'function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)',
        'function quoteEthForUsdCents(uint256) view returns (uint256)',
        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
      ]);

      // compute owed units for 1 period
      let data;
      if (asset === '0x0000000000000000000000000000000000000000') {
        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
      } else {
        data = iface.encodeFunctionData('quoteTokenForUsdCents', [toBytes32(feedIdStr), asset, usdCents]);
      }
      const payloadHex = await getPayloadHex(feedIdStr);
      const callData = data + payloadHex.slice(2);
      const raw = await (provider as any).call({ to: subAddr, data: callData });
      const unitsOne = (asset === '0x0000000000000000000000000000000000000000'
        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]) as any;
      const totalUnits = (unitsOne.mul ? unitsOne.mul(periodsCount) : (BigInt(unitsOne.toString()) * BigInt(periodsCount))).toString();

      // Deposit funds
      if (asset === '0x0000000000000000000000000000000000000000') {
        const c = new (ethers as any).Contract(subAddr, ['function depositETH() payable'], signer);
        const tx1 = await c.depositETH({ value: totalUnits });
        await tx1.wait();
      } else {
        const erc20 = new (ethers as any).Contract(asset, [
          'function decimals() view returns (uint8)',
          'function approve(address,uint256) returns (bool)'
        ], signer);
        const approveTx = await erc20.approve(subAddr, totalUnits);
        await approveTx.wait();
        const c = new (ethers as any).Contract(subAddr, ['function depositToken(address,uint256)'], signer);
        const depTx = await c.depositToken(asset, totalUnits);
        await depTx.wait();
      }

      // Subscribe advanced with zero caps and fee for simplicity
      const c2 = new (ethers as any).Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
      const tx2 = await c2.subscribeAdvanced(merchant, asset, toBytes32(feedIdStr), usdCents, period, 0, 0);
      await tx2.wait();
      alert('Subscribed successfully');
    } catch (e: any) {
      alert('Simple subscribe failed: ' + (e?.message || e));
    }
  });
})();

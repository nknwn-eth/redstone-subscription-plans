var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
(function () {
    // Suppress noisy wallet collision errors from third-party injectors
    window.addEventListener('error', function (ev) {
        var _a, _b;
        var msg = ((_a = ev === null || ev === void 0 ? void 0 : ev.error) === null || _a === void 0 ? void 0 : _a.message) || (ev === null || ev === void 0 ? void 0 : ev.message) || '';
        if (typeof msg === 'string' && msg.includes('Cannot redefine property: ethereum')) {
            (_b = ev.preventDefault) === null || _b === void 0 ? void 0 : _b.call(ev);
            console.warn('[ui] Ignored wallet collision error:', msg);
        }
    });
    function showToast(msg, ms) {
        if (ms === void 0) { ms = 3000; }
        var el = document.getElementById('toast');
        if (!el) {
            alert(msg);
            return;
        }
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(function () { el.style.display = 'none'; }, ms);
    }
    function isUserRejected(e) {
        var code = e === null || e === void 0 ? void 0 : e.code;
        var msg = ((e === null || e === void 0 ? void 0 : e.message) || e || '').toString().toLowerCase();
        return code === 4001 || msg.includes('user rejected');
    }
    var provider;
    var signer;
    var currentAccount = null;
    var demoMode = true;
    function enumerateProviders() {
        return __awaiter(this, void 0, void 0, function () {
            function onAnnounce(e) { candidates.push(e.detail); }
            var results, w, candidates, _i, candidates_1, c, name_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        results = [];
                        w = window;
                        if (w.ethereum)
                            results.push({ provider: w.ethereum, label: 'Injected (ethereum)' });
                        candidates = [];
                        window.addEventListener('eip6963:announceProvider', onAnnounce);
                        window.dispatchEvent(new Event('eip6963:requestProvider'));
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 300); })];
                    case 1:
                        _c.sent();
                        window.removeEventListener('eip6963:announceProvider', onAnnounce);
                        for (_i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                            c = candidates_1[_i];
                            name_1 = (((_a = c === null || c === void 0 ? void 0 : c.info) === null || _a === void 0 ? void 0 : _a.name) || ((_b = c === null || c === void 0 ? void 0 : c.info) === null || _b === void 0 ? void 0 : _b.rdns) || 'wallet').toString();
                            results.push({ provider: c.provider, label: name_1 });
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    }
    var subAbi = [
        "function subscribe(address merchant,uint256 usdCentsPerPeriod,uint256 period,uint256 maxEthPerChargeWei)",
        "function depositETH() payable",
        "function ethBalances(address) view returns (uint256)",
    ];
    var regAbi = [
        "function getPayers(address merchant) view returns (address[])"
    ];
    var $ = function (id) { return document.getElementById(id); };
    function isAddress(addr) {
        try {
            return ethers.utils.isAddress(addr);
        }
        catch (_a) {
            return false;
        }
    }
    function requireAddress(addr, label) {
        if (!addr || !isAddress(addr)) {
            throw new Error("".concat(label, " is not a valid address"));
        }
    }
    $("connect").onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var list_1, sel_1, e_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, enumerateProviders()];
                case 1:
                    list_1 = _a.sent();
                    if (list_1.length === 0) {
                        document.getElementById('providerRow').style.display = 'block';
                        return [2 /*return*/, showToast('No wallet detected. You can enable Read-only Mode.')];
                    }
                    if (!(list_1.length === 1)) return [3 /*break*/, 3];
                    return [4 /*yield*/, useProvider(list_1[0].provider)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3:
                    sel_1 = document.getElementById('providerSelect');
                    sel_1.innerHTML = '';
                    list_1.forEach(function (p, i) {
                        var opt = document.createElement('option');
                        opt.value = i.toString();
                        opt.textContent = p.label;
                        sel_1.appendChild(opt);
                    });
                    document.getElementById('providerRow').style.display = 'block';
                    ;
                    document.getElementById('useProvider').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                        var idx;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    idx = Number(document.getElementById('providerSelect').value || '0');
                                    return [4 /*yield*/, useProvider(list_1[idx].provider)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    if (isUserRejected(e_1))
                        return [2 /*return*/, showToast('You canceled the wallet request')];
                    showToast('Connect failed: ' + ((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    function useProvider(pv) {
        return __awaiter(this, void 0, void 0, function () {
            var addr, payerEl, merch, merchSub, loadPlansBtn, findPlansBtn, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        provider = new ethers.providers.Web3Provider(pv, 'any');
                        return [4 /*yield*/, provider.send('eth_requestAccounts', [])];
                    case 1:
                        _a.sent();
                        signer = provider.getSigner();
                        return [4 /*yield*/, signer.getAddress()];
                    case 2:
                        addr = _a.sent();
                        document.getElementById("account").textContent = addr;
                        payerEl = document.getElementById('payer');
                        if (payerEl)
                            payerEl.value = addr;
                        document.getElementById('providerRow').style.display = 'none';
                        currentAccount = addr;
                        merch = document.getElementById('merchant');
                        merchSub = document.getElementById('merchantSub');
                        if (merch) {
                            merch.value = addr;
                            merch.disabled = true;
                        }
                        if (merchSub && (!merchSub.value || !isAddress(merchSub.value))) {
                            merchSub.value = addr;
                        }
                        loadPlansBtn = document.getElementById('loadPlans');
                        loadPlansBtn && loadPlansBtn.click();
                        findPlansBtn = document.getElementById('findPlansSub');
                        findPlansBtn && findPlansBtn.click();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        if (isUserRejected(e_2))
                            return [2 /*return*/, showToast('You canceled the wallet request')];
                        showToast('Provider failed: ' + ((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    document.getElementById('readOnly').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var rpc, p, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    rpc = 'http://127.0.0.1:8545';
                    p = new ethers.providers.JsonRpcProvider(rpc);
                    return [4 /*yield*/, p.getBlockNumber()];
                case 1:
                    _a.sent();
                    provider = p;
                    signer = undefined;
                    document.getElementById("account").textContent = '(read-only)';
                    document.getElementById('providerRow').style.display = 'none';
                    showToast('Read-only mode enabled');
                    return [3 /*break*/, 3];
                case 2:
                    e_3 = _a.sent();
                    showToast('Read-only failed: ' + ((e_3 === null || e_3 === void 0 ? void 0 : e_3.message) || e_3));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var btnLoadPayers = document.getElementById('loadPayers');
    btnLoadPayers && (btnLoadPayers.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var regAddr, merchant, reg, list, container, _loop_1, _i, _a, addr;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!signer || !provider)
                        return [2 /*return*/, alert('Connect wallet first')];
                    regAddr = $("regAddr").value;
                    merchant = (currentAccount || $("merchant").value || '').trim();
                    try {
                        requireAddress(regAddr, 'Registry address');
                        if (!merchant || !isAddress(merchant)) {
                            // Avoid noisy validation in demo mode
                            if (demoMode) {
                                showToast('Connect wallet to load payers');
                                return [2 /*return*/];
                            }
                            return [2 /*return*/, alert('Merchant address required (connect wallet).')];
                        }
                    }
                    catch (e) {
                        return [2 /*return*/, alert((e === null || e === void 0 ? void 0 : e.message) || e)];
                    }
                    reg = new ethers.Contract(regAddr, regAbi, provider);
                    return [4 /*yield*/, reg.getPayers(merchant)];
                case 1:
                    list = _b.sent();
                    container = document.getElementById("payers");
                    container.innerHTML = '';
                    _loop_1 = function (addr) {
                        var row, cmd, cView, _c, due, bal, dueTs, dueIso, balEth, e_4;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    row = document.createElement('div');
                                    row.className = 'payer';
                                    cmd = "npx hardhat charge --payer ".concat(addr, " --subscription ").concat($("subAddr").value);
                                    _d.label = 1;
                                case 1:
                                    _d.trys.push([1, 3, , 4]);
                                    cView = new ethers.Contract($("subAddr").value, [
                                        "function nextChargeDueAt(address) view returns (uint256)",
                                        "function ethBalances(address) view returns (uint256)",
                                    ], provider);
                                    return [4 /*yield*/, Promise.all([
                                            cView.nextChargeDueAt(addr),
                                            cView.ethBalances(addr),
                                        ])];
                                case 2:
                                    _c = _d.sent(), due = _c[0], bal = _c[1];
                                    dueTs = Number(due.toString());
                                    dueIso = dueTs && dueTs < 1e12 ? new Date(dueTs * 1000).toISOString() : new Date(dueTs).toISOString();
                                    balEth = ethers.utils.formatEther(bal);
                                    row.innerHTML = "<div><b>".concat(addr, "</b> \u2014 next due: ").concat(dueIso, " \u2014 inner balance: ").concat(balEth, " ETH</div>\n        <div>Charge CLI: <code>").concat(cmd, "</code> <button class=\"copy\">Copy</button>\n        <button class=\"browser\">Charge via Browser</button></div>");
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_4 = _d.sent();
                                    row.innerHTML = "<div><b>".concat(addr, "</b></div>\n        <div>Charge CLI: <code>").concat(cmd, "</code> <button class=\"copy\">Copy</button>\n        <button class=\"browser\">Charge via Browser</button></div>");
                                    return [3 /*break*/, 4];
                                case 4:
                                    row.querySelector('button.copy').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, navigator.clipboard.writeText(cmd)];
                                                case 1:
                                                    _a.sent();
                                                    alert('Copied');
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    row.querySelector('button.browser').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                                        var btn, e_5;
                                        var _a;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    _b.trys.push([0, 2, , 3]);
                                                    return [4 /*yield*/, chargeViaBrowser(addr)];
                                                case 1:
                                                    _b.sent();
                                                    showToast('Charged');
                                                    btn = document.getElementById('loadCharges');
                                                    btn && btn.click();
                                                    (_a = document.getElementById('charges')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    e_5 = _b.sent();
                                                    alert('Charge failed: ' + (e_5 && e_5.message ? e_5.message : e_5));
                                                    return [3 /*break*/, 3];
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    container.appendChild(row);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = list;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    addr = _a[_i];
                    return [5 /*yield**/, _loop_1(addr)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // Removed legacy basic subscribe handler (replaced by Simple and Advanced flows)
    var btnDeposit = document.getElementById('deposit');
    btnDeposit && (btnDeposit.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var c, value, tx, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!signer)
                        return [2 /*return*/, showToast('Connect wallet first')];
                    c = new ethers.Contract($("subAddr").value, subAbi, signer);
                    value = ethers.utils.parseEther($("eth").value);
                    return [4 /*yield*/, c.depositETH({ value: value })];
                case 1:
                    tx = _a.sent();
                    return [4 /*yield*/, tx.wait()];
                case 2:
                    _a.sent();
                    showToast('ETH deposited');
                    return [3 /*break*/, 4];
                case 3:
                    e_6 = _a.sent();
                    if (isUserRejected(e_6))
                        return [2 /*return*/, showToast('You canceled the wallet request')];
                    showToast('Deposit failed: ' + ((e_6 === null || e_6 === void 0 ? void 0 : e_6.message) || e_6));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Approve & deposit token
    var btnApproveDeposit = document.getElementById('approveDeposit');
    btnApproveDeposit && (btnApproveDeposit.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var token, amt, erc20, d, units, sub, approveTx, c, depTx, e_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    if (!signer)
                        return [2 /*return*/, showToast('Connect wallet first')];
                    token = ($("tokenAddr").value || '').trim();
                    amt = ($("tokenAmt").value || '').trim();
                    if (!token || !amt)
                        return [2 /*return*/, showToast('Provide token address and amount')];
                    try {
                        requireAddress($("subAddr").value, 'Subscription address');
                        requireAddress(token, 'Token address');
                    }
                    catch (e) {
                        return [2 /*return*/, showToast((e === null || e === void 0 ? void 0 : e.message) || e)];
                    }
                    erc20 = new ethers.Contract(token, [
                        "function decimals() view returns (uint8)",
                        "function approve(address,uint256) returns (bool)",
                    ], signer);
                    return [4 /*yield*/, erc20.decimals()];
                case 1:
                    d = _a.sent();
                    units = ethers.utils.parseUnits(amt, d);
                    sub = $("subAddr").value;
                    return [4 /*yield*/, erc20.approve(sub, units)];
                case 2:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 3:
                    _a.sent();
                    c = new ethers.Contract(sub, [
                        "function depositToken(address token,uint256 amount)",
                    ], signer);
                    return [4 /*yield*/, c.depositToken(token, units)];
                case 4:
                    depTx = _a.sent();
                    return [4 /*yield*/, depTx.wait()];
                case 5:
                    _a.sent();
                    showToast('Token deposited');
                    return [3 /*break*/, 7];
                case 6:
                    e_7 = _a.sent();
                    if (isUserRejected(e_7))
                        return [2 /*return*/, showToast('You canceled the wallet request')];
                    showToast('Token deposit failed: ' + ((e_7 === null || e_7 === void 0 ? void 0 : e_7.message) || e_7));
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    // Load recent charges from subgraph if provided, otherwise from on-chain logs (last 5000 blocks)
    var btnLoadCharges = document.getElementById('loadCharges');
    btnLoadCharges && (btnLoadCharges.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var subgraph, merchant, wrap, body, r, j, charges, list, subAddr, iface, topic, latest, from, logs, last, _i, last_1, lg, ev, block, ts, div, e_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    subgraph = document.getElementById('subgraphUrl').value.trim();
                    merchant = ($("merchant").value || '').toLowerCase();
                    wrap = document.getElementById('charges');
                    wrap.innerHTML = '';
                    if (!subgraph) return [3 /*break*/, 3];
                    body = {
                        query: "query($merchant: String!) { charges(where: { merchant: $merchant }, orderBy: timestamp, orderDirection: desc, first: 10) {\n          payer merchant usdCents priceEthUsd_8 paidEthWei nextChargeAt timestamp txHash\n        } }",
                        variables: { merchant: merchant },
                    };
                    return [4 /*yield*/, fetch(subgraph, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    j = _a.sent();
                    charges = (j && j.data && j.data.charges) || [];
                    charges.forEach(function (c) {
                        var div = document.createElement('div');
                        div.className = 'payer';
                        var eth = ethers.utils.formatEther(c.paidEthWei);
                        var ts = new Date(Number(c.timestamp) * 1000).toISOString();
                        div.innerHTML = "<b>Payer:</b> ".concat(c.payer, " <b>Paid:</b> ").concat(eth, " ETH <b>USD Cents:</b> ").concat(c.usdCents, " <b>At:</b> ").concat(ts, " <b>Tx:</b> ").concat(c.txHash);
                        wrap.appendChild(div);
                    });
                    return [2 /*return*/];
                case 3:
                    _a.trys.push([3, 12, , 13]);
                    if (!!provider) return [3 /*break*/, 5];
                    return [4 /*yield*/, enumerateProviders()];
                case 4:
                    list = _a.sent();
                    if (list.length)
                        provider = new ethers.providers.Web3Provider(list[0].provider, 'any');
                    _a.label = 5;
                case 5:
                    requireAddress($("subAddr").value, 'Subscription address');
                    subAddr = $("subAddr").value;
                    iface = new ethers.utils.Interface([
                        'event Charged(address indexed payer,address indexed merchant,uint256 usdCents,uint256 price_8,uint256 paidUnits,uint256 nextChargeAt)'
                    ]);
                    topic = ethers.utils.id('Charged(address,address,uint256,uint256,uint256,uint256)');
                    return [4 /*yield*/, provider.getBlockNumber()];
                case 6:
                    latest = _a.sent();
                    from = Math.max(0, latest - 5000);
                    return [4 /*yield*/, provider.getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [topic] })];
                case 7:
                    logs = _a.sent();
                    last = logs.slice(-10).reverse();
                    _i = 0, last_1 = last;
                    _a.label = 8;
                case 8:
                    if (!(_i < last_1.length)) return [3 /*break*/, 11];
                    lg = last_1[_i];
                    ev = iface.parseLog(lg);
                    return [4 /*yield*/, provider.getBlock(lg.blockNumber)];
                case 9:
                    block = _a.sent();
                    ts = new Date(Number(block.timestamp) * 1000).toISOString();
                    div = document.createElement('div');
                    div.className = 'payer';
                    div.innerHTML = "<b>Payer:</b> ".concat(ev.args.payer, " <b>Paid Units:</b> ").concat(ev.args.paidUnits.toString(), " <b>USD Cents:</b> ").concat(ev.args.usdCents.toString(), " <b>At:</b> ").concat(ts, " <b>Tx:</b> ").concat(lg.transactionHash);
                    wrap.appendChild(div);
                    _a.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 8];
                case 11: return [3 /*break*/, 13];
                case 12:
                    e_8 = _a.sent();
                    alert('Failed to load charges: ' + ((e_8 === null || e_8 === void 0 ? void 0 : e_8.message) || e_8));
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    }); });
    // Check data service status via server /status
    var btnCheckStatus = document.getElementById('checkStatus');
    btnCheckStatus && (btnCheckStatus.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var server, r, j;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    server = document.getElementById('serverUrl').value || 'http://localhost:3001';
                    return [4 /*yield*/, fetch(server.replace(/\/$/, '') + '/status')];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    j = _a.sent();
                    document.getElementById('status').textContent = JSON.stringify(j, null, 2);
                    return [2 /*return*/];
            }
        });
    }); });
    function chargeViaBrowser(payerAddr) {
        return __awaiter(this, void 0, void 0, function () {
            var subAddr, server, url, resp, json, payloadHex, iface, data, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!signer || !provider)
                            throw new Error('Connect wallet first');
                        subAddr = $("subAddr").value;
                        server = $("serverUrl").value || 'http://localhost:3001';
                        url = new URL(server.replace(/\/$/, '') + '/payload');
                        url.searchParams.set('feeds', 'ETH');
                        url.searchParams.set('uniqueSignersCount', '3');
                        return [4 /*yield*/, fetch(url.toString())];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        json = _a.sent();
                        if (!json.ok)
                            throw new Error(json.error || 'Payload error');
                        payloadHex = json.payloadHex;
                        iface = new ethers.utils.Interface(['function charge(address payer)']);
                        data = iface.encodeFunctionData('charge', [payerAddr]);
                        return [4 /*yield*/, signer.sendTransaction({ to: subAddr, data: data + payloadHex.slice(2) })];
                    case 3:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, tx.hash];
                }
            });
        });
    }
    window.addEventListener('DOMContentLoaded', function () { return __awaiter(_this, void 0, void 0, function () {
        var server, resp, json, mEl0, mSub, mEl1, nets, chainId, list, p, net, _a, cfg, mEl2, mSub2, _b, _c, presets, cfg, _d, nets, chainId, list, p, net, _e, _f, tResp, sel1, sel2, sel3, _i, presets_1, t, opt, _g, presets_2, t, opt, _h, presets_3, t, opt, _j, q, mElQ, btnSubTab2, btnMerchTab2, goSub, goMer, demoBtn, autoFind;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    // Default to demo mode
                    document.body.classList.add('demo');
                    _k.label = 1;
                case 1:
                    _k.trys.push([1, 15, , 16]);
                    server = $("serverUrl").value || 'http://localhost:3001';
                    return [4 /*yield*/, fetch(server.replace(/\/$/, '') + '/addresses')];
                case 2:
                    resp = _k.sent();
                    if (!resp.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, resp.json()];
                case 3:
                    json = _k.sent();
                    if (json.PLAN_CATALOG_ADDRESS)
                        document.getElementById('catalogAddr').value = json.PLAN_CATALOG_ADDRESS;
                    if (json.SUBSCRIPTION_ADDRESS)
                        $("subAddr").value = json.SUBSCRIPTION_ADDRESS;
                    if (json.PAYER_REGISTRY_ADDRESS)
                        $("regAddr").value = json.PAYER_REGISTRY_ADDRESS;
                    mEl0 = document.getElementById('merchant');
                    if (mEl0 && json.MERCHANT_ADDRESS)
                        mEl0.value = json.MERCHANT_ADDRESS;
                    mSub = document.getElementById('merchantSub');
                    if (mSub && json.MERCHANT_ADDRESS)
                        mSub.value = json.MERCHANT_ADDRESS;
                    // Lock fields if we have server-supplied addresses
                    if (json.PLAN_CATALOG_ADDRESS)
                        document.getElementById('catalogAddr').disabled = true;
                    if (json.SUBSCRIPTION_ADDRESS)
                        document.getElementById('subAddr').disabled = true;
                    if (json.PAYER_REGISTRY_ADDRESS)
                        document.getElementById('regAddr').disabled = true;
                    mEl1 = document.getElementById('merchant');
                    if (mEl1 && json.MERCHANT_ADDRESS)
                        mEl1.disabled = true;
                    return [3 /*break*/, 14];
                case 4:
                    _k.trys.push([4, 13, , 14]);
                    return [4 /*yield*/, fetch('./networks.json')];
                case 5: return [4 /*yield*/, (_k.sent()).json()];
                case 6:
                    nets = _k.sent();
                    chainId = '31337';
                    _k.label = 7;
                case 7:
                    _k.trys.push([7, 11, , 12]);
                    return [4 /*yield*/, enumerateProviders()];
                case 8:
                    list = _k.sent();
                    if (!list.length) return [3 /*break*/, 10];
                    p = new ethers.providers.Web3Provider(list[0].provider, 'any');
                    return [4 /*yield*/, p.getNetwork()];
                case 9:
                    net = _k.sent();
                    chainId = net.chainId.toString();
                    _k.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    _a = _k.sent();
                    return [3 /*break*/, 12];
                case 12:
                    cfg = nets[chainId];
                    if (cfg) {
                        if (cfg.PLAN_CATALOG_ADDRESS)
                            document.getElementById('catalogAddr').value = cfg.PLAN_CATALOG_ADDRESS;
                        if (cfg.SUBSCRIPTION_ADDRESS)
                            $("subAddr").value = cfg.SUBSCRIPTION_ADDRESS;
                        if (cfg.PAYER_REGISTRY_ADDRESS)
                            $("regAddr").value = cfg.PAYER_REGISTRY_ADDRESS;
                        mEl2 = document.getElementById('merchant');
                        if (mEl2 && cfg.MERCHANT_ADDRESS)
                            mEl2.value = cfg.MERCHANT_ADDRESS;
                        mSub2 = document.getElementById('merchantSub');
                        if (mSub2 && cfg.MERCHANT_ADDRESS)
                            mSub2.value = cfg.MERCHANT_ADDRESS;
                    }
                    return [3 /*break*/, 14];
                case 13:
                    _b = _k.sent();
                    return [3 /*break*/, 14];
                case 14: return [3 /*break*/, 16];
                case 15:
                    _c = _k.sent();
                    return [3 /*break*/, 16];
                case 16:
                    _k.trys.push([16, 36, , 37]);
                    presets = null;
                    _k.label = 17;
                case 17:
                    _k.trys.push([17, 20, , 21]);
                    return [4 /*yield*/, fetch('/config')];
                case 18: return [4 /*yield*/, (_k.sent()).json()];
                case 19:
                    cfg = _k.sent();
                    if (cfg && cfg.ok && Array.isArray(cfg.PRESET_TOKENS) && cfg.PRESET_TOKENS.length) {
                        presets = cfg.PRESET_TOKENS;
                    }
                    return [3 /*break*/, 21];
                case 20:
                    _d = _k.sent();
                    return [3 /*break*/, 21];
                case 21:
                    if (!!presets) return [3 /*break*/, 32];
                    _k.label = 22;
                case 22:
                    _k.trys.push([22, 31, , 32]);
                    return [4 /*yield*/, fetch('./presets.json')];
                case 23: return [4 /*yield*/, (_k.sent()).json()];
                case 24:
                    nets = _k.sent();
                    chainId = '31337';
                    _k.label = 25;
                case 25:
                    _k.trys.push([25, 29, , 30]);
                    return [4 /*yield*/, enumerateProviders()];
                case 26:
                    list = _k.sent();
                    if (!list.length) return [3 /*break*/, 28];
                    p = new ethers.providers.Web3Provider(list[0].provider, 'any');
                    return [4 /*yield*/, p.getNetwork()];
                case 27:
                    net = _k.sent();
                    chainId = net.chainId.toString();
                    _k.label = 28;
                case 28: return [3 /*break*/, 30];
                case 29:
                    _e = _k.sent();
                    return [3 /*break*/, 30];
                case 30:
                    presets = nets[chainId] || null;
                    return [3 /*break*/, 32];
                case 31:
                    _f = _k.sent();
                    return [3 /*break*/, 32];
                case 32:
                    if (!!presets) return [3 /*break*/, 35];
                    return [4 /*yield*/, fetch('./tokens.json')];
                case 33:
                    tResp = _k.sent();
                    if (!tResp.ok) return [3 /*break*/, 35];
                    return [4 /*yield*/, tResp.json()];
                case 34:
                    presets = _k.sent();
                    _k.label = 35;
                case 35:
                    if (presets) {
                        sel1 = document.getElementById('tokenPreset');
                        sel2 = document.getElementById('simpleToken');
                        sel3 = document.getElementById('planPreset');
                        if (sel1) {
                            sel1.innerHTML = '';
                            for (_i = 0, presets_1 = presets; _i < presets_1.length; _i++) {
                                t = presets_1[_i];
                                opt = document.createElement('option');
                                opt.value = JSON.stringify(t);
                                opt.textContent = t.label;
                                sel1.appendChild(opt);
                            }
                        }
                        if (sel2) {
                            sel2.innerHTML = '';
                            for (_g = 0, presets_2 = presets; _g < presets_2.length; _g++) {
                                t = presets_2[_g];
                                opt = document.createElement('option');
                                opt.value = JSON.stringify(t);
                                opt.textContent = t.label;
                                sel2.appendChild(opt);
                            }
                        }
                        if (sel3) {
                            sel3.innerHTML = '';
                            for (_h = 0, presets_3 = presets; _h < presets_3.length; _h++) {
                                t = presets_3[_h];
                                opt = document.createElement('option');
                                opt.value = JSON.stringify(t);
                                opt.textContent = t.label;
                                sel3.appendChild(opt);
                            }
                        }
                    }
                    return [3 /*break*/, 37];
                case 36:
                    _j = _k.sent();
                    return [3 /*break*/, 37];
                case 37:
                    q = new URLSearchParams(location.search);
                    if (q.get('server'))
                        ($("serverUrl").value = q.get('server'));
                    if (q.get('sub'))
                        ($("subAddr").value = q.get('sub'));
                    if (q.get('reg'))
                        ($("regAddr").value = q.get('reg'));
                    if (q.get('merchant')) {
                        mElQ = document.getElementById('merchant');
                        if (mElQ)
                            mElQ.value = q.get('merchant');
                    }
                    if (q.get('asset'))
                        ($("advAsset").value = q.get('asset'));
                    if (q.get('feed'))
                        (document.getElementById('advFeedId').value = q.get('feed'));
                    if (q.get('cents'))
                        ($("advCents").value = q.get('cents'));
                    if (q.get('period'))
                        ($("advPeriod").value = q.get('period'));
                    if (q.get('max'))
                        ($("advMaxUnits").value = q.get('max'));
                    if (q.get('feeBps'))
                        ($("advFeeBps").value = q.get('feeBps'));
                    btnSubTab2 = document.getElementById('tabBtnSub');
                    btnMerchTab2 = document.getElementById('tabBtnMerch');
                    btnSubTab2 && (btnSubTab2.onclick = function () { return activateTab('sub'); });
                    btnMerchTab2 && (btnMerchTab2.onclick = function () { return activateTab('merch'); });
                    goSub = document.getElementById('goSubscriber');
                    goMer = document.getElementById('goMerchant');
                    goSub && (goSub.onclick = function () {
                        var _a;
                        activateTab('sub');
                        (_a = document.getElementById('plansSubList')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                    });
                    goMer && (goMer.onclick = function () {
                        var _a;
                        activateTab('merch');
                        (_a = document.getElementById('planName')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                    });
                    demoBtn = document.getElementById('toggleDemo');
                    if (demoBtn) {
                        demoBtn.onclick = function () {
                            demoMode = !demoMode;
                            if (demoMode) {
                                document.body.classList.add('demo');
                                demoBtn.textContent = 'Demo Mode: ON';
                                showToast('Demo Mode enabled');
                            }
                            else {
                                document.body.classList.remove('demo');
                                demoBtn.textContent = 'Demo Mode: OFF';
                                showToast('Demo Mode disabled');
                            }
                        };
                    }
                    autoFind = document.getElementById('findPlansSub');
                    // Auto-refresh plans on load without showing fields
                    autoFind && autoFind.click();
                    return [2 /*return*/];
            }
        });
    }); });
    // Advanced plan: quote using contract view with appended RedStone payload
    function getPayloadHex(feedsCsv) {
        return __awaiter(this, void 0, void 0, function () {
            var server, url, resp, json;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        server = ($("serverUrl").value || 'http://localhost:3001').replace(/\/$/, '');
                        url = new URL(server + '/payload');
                        url.searchParams.set('feeds', feedsCsv);
                        url.searchParams.set('uniqueSignersCount', '3');
                        return [4 /*yield*/, fetch(url.toString())];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        json = _a.sent();
                        if (!json.ok)
                            throw new Error(json.error || 'Payload error');
                        return [2 /*return*/, json.payloadHex];
                }
            });
        });
    }
    function toBytes32(feedId) {
        return ethers.utils.formatBytes32String(feedId);
    }
    function fromBytes32ToStringSafe(b32) {
        try {
            return ethers.utils.parseBytes32String(b32);
        }
        catch (_a) {
            return null;
        }
    }
    // Helper to render a plan card with Subscribe action
    function renderPlanCard(container, merchant, asset, feedBytes32OrStr, usdCents, period, name) {
        var _this = this;
        var feedStr = typeof feedBytes32OrStr === 'string' && feedBytes32OrStr.startsWith('0x')
            ? fromBytes32ToStringSafe(feedBytes32OrStr) || 'ETH'
            : feedBytes32OrStr;
        var price = (Number(usdCents) / 100).toFixed(2);
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = "<h4>".concat(name, "</h4>\n      <div class=\"price\">$").concat(price, " per ").concat(Math.round(Number(period) / 86400), " day(s)</div>\n      <div class=\"muted\">Token: ").concat(asset === '0x0000000000000000000000000000000000000000' ? 'ETH' : asset, " \u2014 Feed: ").concat(feedStr, "</div>\n      <div class=\"row\"><button class=\"btn splanSub\">Subscribe</button></div>");
        card.querySelector('.splanSub').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
            var subAddr, merchantUse, c2, feedBytes, tx, iface, data, payloadHex, callData, raw, units, yes, dc, erc20, dc, _a, e_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 17, , 18]);
                        return [4 /*yield*/, ensureProviderReady()];
                    case 1:
                        _b.sent();
                        subAddr = $("subAddr").value;
                        requireAddress(subAddr, 'Subscription address');
                        merchantUse = merchant;
                        if (!isAddress(merchantUse) && currentAccount)
                            merchantUse = currentAccount;
                        if (!merchantUse || !isAddress(merchantUse)) {
                            showToast('Connect wallet to subscribe');
                            return [2 /*return*/];
                        }
                        c2 = new ethers.Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
                        feedBytes = (typeof feedBytes32OrStr === 'string' && feedBytes32OrStr.startsWith('0x')) ? feedBytes32OrStr : toBytes32(feedBytes32OrStr);
                        return [4 /*yield*/, c2.subscribeAdvanced(merchantUse, asset, feedBytes, usdCents, period, 0, 0)];
                    case 2:
                        tx = _b.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 15, , 16]);
                        iface = new ethers.utils.Interface([
                            'function quoteEthForUsdCents(uint256) view returns (uint256)',
                            'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
                        ]);
                        data = void 0;
                        if (asset === '0x0000000000000000000000000000000000000000')
                            data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
                        else
                            data = iface.encodeFunctionData('quoteTokenForUsdCents', [feedBytes, asset, usdCents]);
                        return [4 /*yield*/, getPayloadHex(feedStr || 'ETH')];
                    case 5:
                        payloadHex = _b.sent();
                        callData = data + payloadHex.slice(2);
                        return [4 /*yield*/, provider.call({ to: subAddr, data: callData })];
                    case 6:
                        raw = _b.sent();
                        units = (asset === '0x0000000000000000000000000000000000000000'
                            ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
                            : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
                        yes = confirm('Subscribed! Prepay 1 period now?');
                        if (!yes) return [3 /*break*/, 14];
                        if (!(asset === '0x0000000000000000000000000000000000000000')) return [3 /*break*/, 9];
                        dc = new ethers.Contract(subAddr, ['function depositETH() payable'], signer);
                        return [4 /*yield*/, dc.depositETH({ value: units })];
                    case 7: return [4 /*yield*/, (_b.sent()).wait()];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 9:
                        erc20 = new ethers.Contract(asset, ['function approve(address,uint256) returns (bool)'], signer);
                        return [4 /*yield*/, erc20.approve(subAddr, units)];
                    case 10: return [4 /*yield*/, (_b.sent()).wait()];
                    case 11:
                        _b.sent();
                        dc = new ethers.Contract(subAddr, ['function depositToken(address,uint256)'], signer);
                        return [4 /*yield*/, dc.depositToken(asset, units)];
                    case 12: return [4 /*yield*/, (_b.sent()).wait()];
                    case 13:
                        _b.sent();
                        _b.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        _a = _b.sent();
                        return [3 /*break*/, 16];
                    case 16:
                        showToast('Subscribed to plan');
                        return [3 /*break*/, 18];
                    case 17:
                        e_9 = _b.sent();
                        showToast((e_9 === null || e_9 === void 0 ? void 0 : e_9.message) || e_9);
                        return [3 /*break*/, 18];
                    case 18: return [2 /*return*/];
                }
            });
        }); };
        container.appendChild(card);
    }
    function ensureCatalog() {
        return __awaiter(this, void 0, void 0, function () {
            var catAddr, code, cat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        catAddr = document.getElementById('catalogAddr').value;
                        requireAddress(catAddr, 'PlanCatalog address');
                        return [4 /*yield*/, ensureProviderReady()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getCode(catAddr)];
                    case 2:
                        code = _a.sent();
                        if (!code || code === '0x') {
                            throw new Error('No contract found at PlanCatalog address. Please deploy or set the correct address.');
                        }
                        cat = new ethers.Contract(catAddr, [
                            'function getPlanCount(address) view returns (uint256)',
                            'function getPlan(address,uint256) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,string,bool)'
                        ], provider || (new ethers.providers.Web3Provider(window.ethereum, 'any')));
                        return [2 /*return*/, cat];
                }
            });
        });
    }
    var btnAdvQuote = document.getElementById('advQuote');
    // Hidden in simple demo; keep handler no-op if element missing
    btnAdvQuote && (btnAdvQuote.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var subAddr, asset, feedIdStr, usdCents, iface, data, feeds, payloadHex, callData, raw, decoded, units, pretty, d, _a, e_10;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    subAddr = $("subAddr").value;
                    asset = ($("advAsset").value || '').trim();
                    feedIdStr = $("advFeedId").value;
                    usdCents = $("advCents").value;
                    requireAddress(subAddr, 'Subscription address');
                    if (asset)
                        requireAddress(asset, 'Asset token');
                    iface = new ethers.utils.Interface([
                        'function quoteEthForUsdCents(uint256) view returns (uint256)',
                        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
                    ]);
                    data = void 0;
                    feeds = feedIdStr;
                    if (!asset) {
                        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
                    }
                    else {
                        data = iface.encodeFunctionData('quoteTokenForUsdCents', [toBytes32(feedIdStr), asset, usdCents]);
                    }
                    return [4 /*yield*/, getPayloadHex(feeds)];
                case 1:
                    payloadHex = _b.sent();
                    callData = data + payloadHex.slice(2);
                    return [4 /*yield*/, provider.call({ to: subAddr, data: callData })];
                case 2:
                    raw = _b.sent();
                    decoded = !asset
                        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
                        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0];
                    units = decoded.toString();
                    pretty = units;
                    if (!!asset) return [3 /*break*/, 3];
                    pretty = ethers.utils.formatEther(units) + ' ETH';
                    return [3 /*break*/, 6];
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, new ethers.Contract(asset, ['function decimals() view returns (uint8)'], provider).decimals()];
                case 4:
                    d = _b.sent();
                    pretty = ethers.utils.formatUnits(units, d) + ' tokens';
                    return [3 /*break*/, 6];
                case 5:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 6:
                    document.getElementById('advQuoteOut').textContent = "~ ".concat(pretty, " for 1 period");
                    return [3 /*break*/, 8];
                case 7:
                    e_10 = _b.sent();
                    alert('Quote failed: ' + ((e_10 === null || e_10 === void 0 ? void 0 : e_10.message) || e_10));
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    // Load plans for the merchant from PlanCatalog (Merchant tab)
    var btnLoadPlans = document.getElementById('loadPlans');
    btnLoadPlans && (btnLoadPlans.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var cat, e_11, merchant_1, listWrap_1, listWrap_2, count, listWrap, _loop_2, i, e_12;
        var _this = this;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 10, , 11]);
                    cat = null;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, ensureCatalog()];
                case 2:
                    cat = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_11 = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    merchant_1 = (currentAccount || ((_a = document.getElementById('merchant')) === null || _a === void 0 ? void 0 : _a.value) || '').trim();
                    if (!merchant_1 || !isAddress(merchant_1)) {
                        listWrap_1 = document.getElementById('plansList');
                        listWrap_1.innerHTML = '';
                        // Silent, friendly fallback in demo mode (no validation error)
                        listWrap_1.textContent = 'Connect wallet to load your plans.';
                        return [2 /*return*/];
                    }
                    if (!cat) {
                        listWrap_2 = document.getElementById('plansList');
                        listWrap_2.innerHTML = '';
                        listWrap_2.textContent = 'PlanCatalog not available on this network.';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, cat.getPlanCount(merchant_1)];
                case 5:
                    count = _b.sent();
                    listWrap = document.getElementById('plansList');
                    listWrap.innerHTML = '';
                    _loop_2 = function (i) {
                        var p, feedStr, name_2, usdCents, period, asset, feeBps, maxUnits, div, price;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, cat.getPlan(merchant_1, i)];
                                case 1:
                                    p = _c.sent();
                                    if (!p[8])
                                        return [2 /*return*/, "continue"]; // active
                                    feedStr = fromBytes32ToStringSafe(p[2]) || 'ETH';
                                    name_2 = p[7];
                                    usdCents = p[4].toString();
                                    period = p[5].toString();
                                    asset = p[1];
                                    feeBps = p[3].toString();
                                    maxUnits = p[6].toString();
                                    div = document.createElement('div');
                                    div.className = 'card';
                                    price = (Number(usdCents) / 100).toFixed(2);
                                    div.innerHTML = "<h4>".concat(name_2, "</h4>\n          <div class=\"price\">$").concat(price, " per ").concat(Math.round(Number(period) / 86400), " day(s)</div>\n          <div class=\"muted\">Token: ").concat(asset === '0x0000000000000000000000000000000000000000' ? 'ETH' : asset, " \u2014 Feed: ").concat(feedStr, " \u2014 Caller fee: ").concat(feeBps, " bps</div>\n          <div class=\"row\"><button class=\"btn splan\">Subscribe</button></div>");
                                    div.querySelector('.splan').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                                        var subAddr, c2, tx, e_13;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 4, , 5]);
                                                    return [4 /*yield*/, ensureProviderReady()];
                                                case 1:
                                                    _a.sent();
                                                    subAddr = $("subAddr").value;
                                                    requireAddress(subAddr, 'Subscription address');
                                                    c2 = new ethers.Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
                                                    return [4 /*yield*/, c2.subscribeAdvanced(merchant_1, asset, p[2], usdCents, period, maxUnits, feeBps)];
                                                case 2:
                                                    tx = _a.sent();
                                                    return [4 /*yield*/, tx.wait()];
                                                case 3:
                                                    _a.sent();
                                                    showToast('Subscribed to plan');
                                                    return [3 /*break*/, 5];
                                                case 4:
                                                    e_13 = _a.sent();
                                                    showToast((e_13 === null || e_13 === void 0 ? void 0 : e_13.message) || e_13);
                                                    return [3 /*break*/, 5];
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    listWrap.appendChild(div);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _b.label = 6;
                case 6:
                    if (!(i < Number(count.toString()))) return [3 /*break*/, 9];
                    return [5 /*yield**/, _loop_2(i)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 6];
                case 9: return [3 /*break*/, 11];
                case 10:
                    e_12 = _b.sent();
                    alert('Load plans failed: ' + ((e_12 === null || e_12 === void 0 ? void 0 : e_12.message) || e_12));
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); });
    
    // Find plans for subscribers (Subscriber tab)
    var btnFindPlansSub = document.getElementById('findPlansSub');
    btnFindPlansSub && (btnFindPlansSub.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var cat, e_14, merchantAddr, mEl, mSub, listWrap, notice, merchant, count, i, p, demo, _i, demo_1, dp, e_15;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 14, , 15]);
                    cat = null;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, ensureCatalog()];
                case 2:
                    cat = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_14 = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    merchantAddr = ((_a = document.getElementById('merchantSub')) === null || _a === void 0 ? void 0 : _a.value) || '';
                    if (!merchantAddr || !isAddress(merchantAddr)) {
                        mEl = document.getElementById('merchant');
                        merchantAddr = ((mEl === null || mEl === void 0 ? void 0 : mEl.value) || '');
                    }
                    if ((!merchantAddr || !isAddress(merchantAddr)) && currentAccount) {
                        merchantAddr = currentAccount;
                        mSub = document.getElementById('merchantSub');
                        mSub && (mSub.value = currentAccount);
                    }
                    listWrap = document.getElementById('plansSubList');
                    notice = document.getElementById('plansNotice');
                    listWrap.innerHTML = '';
                    if (!cat) return [3 /*break*/, 10];
                    if (!merchantAddr || !isAddress(merchantAddr)) {
                        if (notice)
                            notice.textContent = 'Enter a merchant address or connect your wallet.';
                        return [2 /*return*/];
                    }
                    merchant = merchantAddr;
                    return [4 /*yield*/, cat.getPlanCount(merchant)];
                case 5:
                    count = _b.sent();
                    i = 0;
                    _b.label = 6;
                case 6:
                    if (!(i < Number(count.toString()))) return [3 /*break*/, 9];
                    return [4 /*yield*/, cat.getPlan(merchant, i)];
                case 7:
                    p = _b.sent();
                    if (!p[8])
                        return [3 /*break*/, 8]; // active
                    renderPlanCard(listWrap, merchant, p[1], p[2], p[4].toString(), p[5].toString(), p[7]);
                    _b.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 6];
                case 9:
                    if (notice)
                        notice.textContent = '';
                    return [3 /*break*/, 13];
                case 10: return [4 /*yield*/, fetch('./demo-plans.json')];
                case 11: return [4 /*yield*/, (_b.sent()).json()];
                case 12:
                    demo = _b.sent();
                    for (_i = 0, demo_1 = demo; _i < demo_1.length; _i++) {
                        dp = demo_1[_i];
                        renderPlanCard(listWrap, merchantAddr, dp.asset, dp.feedId, dp.usdCents, dp.period, dp.name);
                    }
                    if (notice)
                        notice.textContent = 'Demo plans shown (no PlanCatalog deployed).';
                    _b.label = 13;
                case 13:
                    if (!listWrap.innerHTML)
                        listWrap.textContent = 'No active plans published yet.';
                    return [3 /*break*/, 15];
                case 14:
                    e_15 = _b.sent();
                    showToast('Find plans failed: ' + ((e_15 === null || e_15 === void 0 ? void 0 : e_15.message) || e_15));
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    }); });
    var btnAdvSubscribe = document.getElementById('advSubscribe');
    // Hidden in simple demo; keep handler no-op if element missing
    btnAdvSubscribe && (btnAdvSubscribe.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var subAddr, asset, feedIdStr, usdCents, period, maxUnits, feeBps, merchant, c, tx, e_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!signer)
                        return [2 /*return*/, alert('Connect wallet first')];
                    subAddr = $("subAddr").value;
                    asset = ($("advAsset").value || '').trim();
                    feedIdStr = $("advFeedId").value;
                    usdCents = $("advCents").value;
                    period = $("advPeriod").value;
                    maxUnits = $("advMaxUnits").value;
                    feeBps = $("advFeeBps").value;
                    requireAddress(subAddr, 'Subscription address');
                    merchant = currentAccount || '';
                    if (!merchant || !isAddress(merchant))
                        return [2 /*return*/, alert('Connect wallet first')];
                    if (asset)
                        requireAddress(asset, 'Asset token');
                    c = new ethers.Contract(subAddr, [
                        'function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'
                    ], signer);
                    return [4 /*yield*/, c.subscribeAdvanced(merchant, asset || '0x0000000000000000000000000000000000000000', toBytes32(feedIdStr), usdCents, period, maxUnits, feeBps)];
                case 1:
                    tx = _a.sent();
                    return [4 /*yield*/, tx.wait()];
                case 2:
                    _a.sent();
                    alert('Subscribed (advanced)');
                    return [3 /*break*/, 4];
                case 3:
                    e_16 = _a.sent();
                    alert('Subscribe failed: ' + ((e_16 === null || e_16 === void 0 ? void 0 : e_16.message) || e_16));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Merchant: Create Starter / Pro plans (ETH)
    var catCreateAbi = [
        'function createPlan(address asset,bytes32 feedId,uint256 usdCentsPerPeriod,uint256 period,uint256 maxUnitsPerCharge,uint16 callerFeeBps,string name) returns (uint256)'
    ];
    var btnCreateStarter = document.getElementById('createStarter');
    btnCreateStarter && (btnCreateStarter.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var catAddr, cat, sel, preset, tx, n, _a, e_17;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _b.sent();
                    catAddr = document.getElementById('catalogAddr').value;
                    requireAddress(catAddr, 'PlanCatalog address');
                    cat = new ethers.Contract(catAddr, catCreateAbi, signer);
                    sel = document.getElementById('planPreset');
                    preset = { address: '0x0000000000000000000000000000000000000000', feedId: 'ETH' };
                    try {
                        if (sel && sel.value)
                            preset = JSON.parse(sel.value);
                    }
                    catch (_c) { }
                    return [4 /*yield*/, cat.createPlan(preset.address, toBytes32(preset.feedId || 'ETH'), 499, 30 * 24 * 60 * 60, 0, 0, 'Starter')];
                case 2:
                    tx = _b.sent();
                    return [4 /*yield*/, tx.wait()];
                case 3:
                    _b.sent();
                    showToast('Starter plan created');
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, seedRegistryFromRecent()];
                case 5:
                    n = _b.sent();
                    if (n)
                        showToast("Seeded ".concat(n, " payers from recent subscribers"));
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    e_17 = _b.sent();
                    showToast((e_17 === null || e_17 === void 0 ? void 0 : e_17.message) || e_17);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); });
    var btnCreatePro = document.getElementById('createPro');
    btnCreatePro && (btnCreatePro.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var catAddr, cat, sel, preset, tx, n, _a, e_18;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _b.sent();
                    catAddr = document.getElementById('catalogAddr').value;
                    requireAddress(catAddr, 'PlanCatalog address');
                    cat = new ethers.Contract(catAddr, catCreateAbi, signer);
                    sel = document.getElementById('planPreset');
                    preset = { address: '0x0000000000000000000000000000000000000000', feedId: 'ETH' };
                    try {
                        if (sel && sel.value)
                            preset = JSON.parse(sel.value);
                    }
                    catch (_c) { }
                    return [4 /*yield*/, cat.createPlan(preset.address, toBytes32(preset.feedId || 'ETH'), 999, 30 * 24 * 60 * 60, 0, 0, 'Pro')];
                case 2:
                    tx = _b.sent();
                    return [4 /*yield*/, tx.wait()];
                case 3:
                    _b.sent();
                    showToast('Pro plan created');
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, seedRegistryFromRecent()];
                case 5:
                    n = _b.sent();
                    if (n)
                        showToast("Seeded ".concat(n, " payers from recent subscribers"));
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    e_18 = _b.sent();
                    showToast((e_18 === null || e_18 === void 0 ? void 0 : e_18.message) || e_18);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); });
    // Demo: Subscribe as the connected wallet using first active plan
    var btnSubscribeSelf = document.getElementById('subscribeSelf');
    btnSubscribeSelf && (btnSubscribeSelf.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var merchant, subAddr, cat, count, picked, i, p, asset, feedBytes, usdCents, period, maxUnits, feeBps, iface, data, feedStr, payloadHex, callData, raw, unitsOne, c, erc20, c, c2, n, _a, btn, e_19;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 24, , 25]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _c.sent();
                    requireAddress($("subAddr").value, 'Subscription address');
                    merchant = currentAccount || '';
                    if (!merchant || !isAddress(merchant))
                        return [2 /*return*/, alert('Connect wallet first')];
                    subAddr = $("subAddr").value;
                    return [4 /*yield*/, ensureCatalog()];
                case 2:
                    cat = _c.sent();
                    return [4 /*yield*/, cat.getPlanCount(merchant)];
                case 3:
                    count = _c.sent();
                    picked = null;
                    i = 0;
                    _c.label = 4;
                case 4:
                    if (!(i < Number(count.toString()))) return [3 /*break*/, 7];
                    return [4 /*yield*/, cat.getPlan(merchant, i)];
                case 5:
                    p = _c.sent();
                    if (p[8]) {
                        picked = p;
                        return [3 /*break*/, 7];
                    }
                    _c.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 4];
                case 7:
                    if (!picked)
                        return [2 /*return*/, showToast('No active plans to subscribe')];
                    asset = picked[1];
                    feedBytes = picked[2];
                    usdCents = picked[4].toString();
                    period = picked[5].toString();
                    maxUnits = picked[6].toString();
                    feeBps = picked[3].toString();
                    iface = new ethers.utils.Interface([
                        'function quoteEthForUsdCents(uint256) view returns (uint256)',
                        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
                    ]);
                    data = void 0;
                    if (asset === '0x0000000000000000000000000000000000000000')
                        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
                    else
                        data = iface.encodeFunctionData('quoteTokenForUsdCents', [feedBytes, asset, usdCents]);
                    feedStr = fromBytes32ToStringSafe(feedBytes) || 'ETH';
                    return [4 /*yield*/, getPayloadHex(feedStr)];
                case 8:
                    payloadHex = _c.sent();
                    callData = data + payloadHex.slice(2);
                    return [4 /*yield*/, provider.call({ to: subAddr, data: callData })];
                case 9:
                    raw = _c.sent();
                    unitsOne = (asset === '0x0000000000000000000000000000000000000000'
                        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
                        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
                    if (!(asset === '0x0000000000000000000000000000000000000000')) return [3 /*break*/, 12];
                    c = new ethers.Contract(subAddr, ['function depositETH() payable'], signer);
                    return [4 /*yield*/, c.depositETH({ value: unitsOne })];
                case 10: return [4 /*yield*/, (_c.sent()).wait()];
                case 11:
                    _c.sent();
                    return [3 /*break*/, 17];
                case 12:
                    erc20 = new ethers.Contract(asset, ['function approve(address,uint256) returns (bool)'], signer);
                    return [4 /*yield*/, erc20.approve(subAddr, unitsOne)];
                case 13: return [4 /*yield*/, (_c.sent()).wait()];
                case 14:
                    _c.sent();
                    c = new ethers.Contract(subAddr, ['function depositToken(address,uint256)'], signer);
                    return [4 /*yield*/, c.depositToken(asset, unitsOne)];
                case 15: return [4 /*yield*/, (_c.sent()).wait()];
                case 16:
                    _c.sent();
                    _c.label = 17;
                case 17:
                    c2 = new ethers.Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
                    return [4 /*yield*/, c2.subscribeAdvanced(merchant, asset, feedBytes, usdCents, period, maxUnits, feeBps)];
                case 18: return [4 /*yield*/, (_c.sent()).wait()];
                case 19:
                    _c.sent();
                    showToast('Subscribed self (demo)');
                    _c.label = 20;
                case 20:
                    _c.trys.push([20, 22, , 23]);
                    return [4 /*yield*/, seedRegistryFromRecent()];
                case 21:
                    n = _c.sent();
                    if (n)
                        showToast("Seeded ".concat(n, " payers from recent subscribers"));
                    return [3 /*break*/, 23];
                case 22:
                    _a = _c.sent();
                    return [3 /*break*/, 23];
                case 23:
                    btn = document.getElementById('refreshDue');
                    btn && btn.click();
                    (_b = document.getElementById('dueNow')) === null || _b === void 0 ? void 0 : _b.scrollIntoView({ behavior: 'smooth' });
                    return [3 /*break*/, 25];
                case 24:
                    e_19 = _c.sent();
                    showToast((e_19 === null || e_19 === void 0 ? void 0 : e_19.message) || e_19);
                    return [3 /*break*/, 25];
                case 25: return [2 /*return*/];
            }
        });
    }); });
    // Cancel my subscription (demo)
    var btnCancelSelf = document.getElementById('cancelSelf');
    btnCancelSelf && (btnCancelSelf.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var c, btn, e_20;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _b.sent();
                    requireAddress($("subAddr").value, 'Subscription address');
                    c = new ethers.Contract($("subAddr").value, ['function cancel()'], signer);
                    return [4 /*yield*/, c.cancel()];
                case 2: return [4 /*yield*/, (_b.sent()).wait()];
                case 3:
                    _b.sent();
                    showToast('Subscription canceled');
                    btn = document.getElementById('refreshDue');
                    btn && btn.click();
                    (_a = document.getElementById('dueNow')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                    return [3 /*break*/, 5];
                case 4:
                    e_20 = _b.sent();
                    showToast((e_20 === null || e_20 === void 0 ? void 0 : e_20.message) || e_20);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // Reset demo: cancel + withdraw ETH/token (for current plan asset)
    var btnReset = document.getElementById('resetDemo');
    btnReset && (btnReset.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var payer, subAddr, view, plan, asset, c, ethBal, c, tBal, c, btnDue, btnCharges, e_21;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 14, , 15]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _a.sent();
                    payer = currentAccount || '';
                    if (!payer || !isAddress(payer))
                        return [2 /*return*/, alert('Connect wallet first')];
                    requireAddress($("subAddr").value, 'Subscription address');
                    subAddr = $("subAddr").value;
                    view = new ethers.Contract(subAddr, [
                        'function plans(address) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,uint256,bool)',
                        'function ethBalances(address) view returns (uint256)',
                        'function tokenBalances(address,address) view returns (uint256)'
                    ], provider);
                    return [4 /*yield*/, view.plans(payer)];
                case 2:
                    plan = _a.sent();
                    asset = plan[1];
                    if (!plan[8]) return [3 /*break*/, 5];
                    c = new ethers.Contract(subAddr, ['function cancel()'], signer);
                    return [4 /*yield*/, c.cancel()];
                case 3: return [4 /*yield*/, (_a.sent()).wait()];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, view.ethBalances(payer)];
                case 6:
                    ethBal = _a.sent();
                    if (!(ethBal && ethBal.toString() !== '0')) return [3 /*break*/, 9];
                    c = new ethers.Contract(subAddr, ['function withdrawETH(uint256)'], signer);
                    return [4 /*yield*/, c.withdrawETH(ethBal)];
                case 7: return [4 /*yield*/, (_a.sent()).wait()];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    if (!(asset && asset !== '0x0000000000000000000000000000000000000000')) return [3 /*break*/, 13];
                    return [4 /*yield*/, view.tokenBalances(payer, asset)];
                case 10:
                    tBal = _a.sent();
                    if (!(tBal && tBal.toString() !== '0')) return [3 /*break*/, 13];
                    c = new ethers.Contract(subAddr, ['function withdrawToken(address,uint256)'], signer);
                    return [4 /*yield*/, c.withdrawToken(asset, tBal)];
                case 11: return [4 /*yield*/, (_a.sent()).wait()];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13:
                    showToast('Reset complete');
                    btnDue = document.getElementById('refreshDue');
                    btnDue && btnDue.click();
                    btnCharges = document.getElementById('loadCharges');
                    btnCharges && btnCharges.click();
                    return [3 /*break*/, 15];
                case 14:
                    e_21 = _a.sent();
                    showToast((e_21 === null || e_21 === void 0 ? void 0 : e_21.message) || e_21);
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    }); });
    var btnCopyLink = document.getElementById('copyLink');
    btnCopyLink && (btnCopyLink.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var params, server, sub, reg, merchant, asset, feed, cents, period, max, feeBps, url, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    params = new URLSearchParams();
                    server = $("serverUrl").value;
                    sub = $("subAddr").value;
                    reg = $("regAddr").value;
                    merchant = $("merchant").value;
                    asset = ($("advAsset").value || '').trim();
                    feed = document.getElementById('advFeedId').value;
                    cents = $("advCents").value;
                    period = $("advPeriod").value;
                    max = $("advMaxUnits").value;
                    feeBps = $("advFeeBps").value;
                    if (server)
                        params.set('server', server);
                    if (sub)
                        params.set('sub', sub);
                    if (reg)
                        params.set('reg', reg);
                    if (merchant)
                        params.set('merchant', merchant);
                    if (asset)
                        params.set('asset', asset);
                    if (feed)
                        params.set('feed', feed);
                    if (cents)
                        params.set('cents', cents);
                    if (period)
                        params.set('period', period);
                    if (max)
                        params.set('max', max);
                    if (feeBps)
                        params.set('feeBps', feeBps);
                    url = location.origin + location.pathname + '?' + params.toString();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, navigator.clipboard.writeText(url)];
                case 2:
                    _b.sent();
                    alert('Link copied');
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    alert(url);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Seed registry helper and button
    function seedRegistryFromRecent() {
        return __awaiter(this, void 0, void 0, function () {
            var merchant, subAddr, regAddr, ifaceAdv, ifaceBasic, advTopic, basicTopic, merchantTopic, latest, from, _a, logsAdv, logsBasic, payersSet, _i, logsAdv_1, lg, ev, _b, logsBasic_1, lg, ev, payers, reg, _c, payers_1, p, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, ensureProviderReady()];
                    case 1:
                        _e.sent();
                        requireAddress($("regAddr").value, 'Registry address');
                        requireAddress($("subAddr").value, 'Subscription address');
                        merchant = currentAccount || '';
                        if (!merchant || !isAddress(merchant))
                            throw new Error('Connect wallet first');
                        subAddr = $("subAddr").value;
                        regAddr = $("regAddr").value;
                        ifaceAdv = new ethers.utils.Interface([
                            'event SubscribedAdvanced(address indexed payer,address indexed merchant,address asset,bytes32 feedId,uint256 usdCents,uint256 period,uint256 maxUnitsPerCharge,uint16 callerFeeBps)'
                        ]);
                        ifaceBasic = new ethers.utils.Interface([
                            'event Subscribed(address indexed payer,address indexed merchant,uint256 usdCents,uint256 period,uint256 maxEthPerChargeWei)'
                        ]);
                        advTopic = ethers.utils.id('SubscribedAdvanced(address,address,address,bytes32,uint256,uint256,uint256,uint16)');
                        basicTopic = ethers.utils.id('Subscribed(address,address,uint256,uint256,uint256)');
                        merchantTopic = ethers.utils.hexZeroPad(merchant, 32);
                        return [4 /*yield*/, provider.getBlockNumber()];
                    case 2:
                        latest = _e.sent();
                        from = Math.max(0, latest - 50000);
                        return [4 /*yield*/, Promise.all([
                                provider.getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [advTopic, null, merchantTopic] }),
                                provider.getLogs({ address: subAddr, fromBlock: from, toBlock: latest, topics: [basicTopic, null, merchantTopic] }),
                            ])];
                    case 3:
                        _a = _e.sent(), logsAdv = _a[0], logsBasic = _a[1];
                        payersSet = new Set();
                        for (_i = 0, logsAdv_1 = logsAdv; _i < logsAdv_1.length; _i++) {
                            lg = logsAdv_1[_i];
                            try {
                                ev = ifaceAdv.parseLog(lg);
                                payersSet.add(ev.args.payer);
                            }
                            catch (_f) { }
                        }
                        for (_b = 0, logsBasic_1 = logsBasic; _b < logsBasic_1.length; _b++) {
                            lg = logsBasic_1[_b];
                            try {
                                ev = ifaceBasic.parseLog(lg);
                                payersSet.add(ev.args.payer);
                            }
                            catch (_g) { }
                        }
                        payers = Array.from(payersSet);
                        if (!payers.length)
                            return [2 /*return*/, 0];
                        reg = new ethers.Contract(regAddr, ['function addPayer(address)'], signer);
                        _c = 0, payers_1 = payers;
                        _e.label = 4;
                    case 4:
                        if (!(_c < payers_1.length)) return [3 /*break*/, 10];
                        p = payers_1[_c];
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 8, , 9]);
                        return [4 /*yield*/, reg.addPayer(p)];
                    case 6: return [4 /*yield*/, (_e.sent()).wait()];
                    case 7:
                        _e.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        _d = _e.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _c++;
                        return [3 /*break*/, 4];
                    case 10: return [2 /*return*/, payers.length];
                }
            });
        });
    }
    var btnSeedFromSubs = document.getElementById('seedFromSubs');
    btnSeedFromSubs && (btnSeedFromSubs.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var n, e_22;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, seedRegistryFromRecent()];
                case 1:
                    n = _a.sent();
                    showToast(n ? "Seeded ".concat(n, " payers from recent subscribers") : 'No recent subscribers found for your merchant');
                    return [3 /*break*/, 3];
                case 2:
                    e_22 = _a.sent();
                    alert('Seed failed: ' + ((e_22 === null || e_22 === void 0 ? void 0 : e_22.message) || e_22));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Tabs: Subscriber vs Merchant
    var tabSub = document.getElementById('tabSubscriber');
    var tabMerch = document.getElementById('tabMerchant');
    var btnSub = document.getElementById('tabBtnSub');
    var btnMerch = document.getElementById('tabBtnMerch');
    function activateTab(which) {
        if (which === 'sub') {
            tabSub.style.display = '';
            tabMerch.style.display = 'none';
            btnSub.classList.add('active');
            btnMerch.classList.remove('active');
        }
        else {
            tabSub.style.display = 'none';
            tabMerch.style.display = '';
            btnSub.classList.remove('active');
            btnMerch.classList.add('active');
        }
    }
    // Legacy tab binds moved to DOMContentLoaded guarded section
    var btnApplyPreset = document.getElementById('applyPreset');
    btnApplyPreset && (btnApplyPreset.onclick = function () {
        var sel = document.getElementById('tokenPreset');
        try {
            var t = JSON.parse(sel.value);
            if (t.address && t.address !== '0x0000000000000000000000000000000000000000') {
                $("advAsset").value = t.address;
            }
            else {
                $("advAsset").value = '';
            }
            document.getElementById('advFeedId').value = t.feedId || 'ETH';
        }
        catch (_a) { }
    });
    // Due Now (Bounties)
    var btnRefreshDue = document.getElementById('refreshDue');
    btnRefreshDue && (btnRefreshDue.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var merchant, dueWrap_1, reg, payers, subAddr, subView, now, dueWrap, _loop_3, _i, payers_2, p;
        var _this = this;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    try {
                        requireAddress($("regAddr").value, 'Registry address');
                        requireAddress($("subAddr").value, 'Subscription address');
                    }
                    catch (e) {
                        return [2 /*return*/, alert((e === null || e === void 0 ? void 0 : e.message) || e)];
                    }
                    merchant = (currentAccount || ((_a = document.getElementById('merchant')) === null || _a === void 0 ? void 0 : _a.value) || '').trim();
                    if (!merchant || !isAddress(merchant)) {
                        dueWrap_1 = document.getElementById('dueNow');
                        dueWrap_1.innerHTML = '';
                        dueWrap_1.textContent = 'Connect wallet to view due payers.';
                        return [2 /*return*/];
                    }
                    reg = new ethers.Contract($("regAddr").value, [
                        'function getPayers(address) view returns (address[])'
                    ], provider || (new ethers.providers.Web3Provider(window.ethereum, 'any')));
                    return [4 /*yield*/, reg.getPayers(merchant)];
                case 1:
                    payers = _b.sent();
                    subAddr = $("subAddr").value;
                    subView = new ethers.Contract(subAddr, [
                        'function nextChargeDueAt(address) view returns (uint256)',
                        'function plans(address) view returns (address,address,bytes32,uint16,uint256,uint256,uint256,uint256,bool)'
                    ], provider || (new ethers.providers.Web3Provider(window.ethereum, 'any')));
                    now = Math.floor(Date.now() / 1000);
                    dueWrap = document.getElementById('dueNow');
                    dueWrap.innerHTML = '';
                    _loop_3 = function (p) {
                        var _c, dueBn, plan, due, feedStr, usdCents, isEth, iface, data, payloadHex, callData, raw, units, unitsStr, feeUnits, row, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    _e.trys.push([0, 4, , 5]);
                                    return [4 /*yield*/, Promise.all([subView.nextChargeDueAt(p), subView.plans(p)])];
                                case 1:
                                    _c = _e.sent(), dueBn = _c[0], plan = _c[1];
                                    due = Number(dueBn.toString());
                                    if (due > now)
                                        return [2 /*return*/, "continue"];
                                    feedStr = fromBytes32ToStringSafe(plan[2]) || 'ETH';
                                    usdCents = plan[4].toString();
                                    isEth = plan[1] === '0x0000000000000000000000000000000000000000';
                                    iface = new ethers.utils.Interface([
                                        'function quoteEthForUsdCents(uint256) view returns (uint256)',
                                        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
                                    ]);
                                    data = void 0;
                                    if (isEth)
                                        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
                                    else
                                        data = iface.encodeFunctionData('quoteTokenForUsdCents', [plan[2], plan[1], usdCents]);
                                    return [4 /*yield*/, getPayloadHex(feedStr)];
                                case 2:
                                    payloadHex = _e.sent();
                                    callData = data + payloadHex.slice(2);
                                    return [4 /*yield*/, provider.call({ to: subAddr, data: callData })];
                                case 3:
                                    raw = _e.sent();
                                    units = (isEth ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0] : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
                                    unitsStr = units.toString();
                                    feeUnits = (units.mul(plan[3]).div(10000)).toString();
                                    row = document.createElement('div');
                                    row.className = 'payer';
                                    row.innerHTML = "<div><b>".concat(p, "</b> \u2014 USD cents: ").concat(usdCents, " \u2014 feed: ").concat(feedStr, " \u2014 caller fee: ").concat(plan[3], " bps \u2014 reward ~ ").concat(feeUnits, " units</div>\n          <div><button class=\"bcharge\">Charge Now</button></div>");
                                    row.querySelector('.bcharge').onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                                        var btn, e_23;
                                        var _a;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    _b.trys.push([0, 2, , 3]);
                                                    return [4 /*yield*/, chargeViaBrowser(p)];
                                                case 1:
                                                    _b.sent();
                                                    showToast('Charged');
                                                    btn = document.getElementById('loadCharges');
                                                    btn && btn.click();
                                                    (_a = document.getElementById('charges')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    e_23 = _b.sent();
                                                    alert((e_23 === null || e_23 === void 0 ? void 0 : e_23.message) || e_23);
                                                    return [3 /*break*/, 3];
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    dueWrap.appendChild(row);
                                    return [3 /*break*/, 5];
                                case 4:
                                    _d = _e.sent();
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, payers_2 = payers;
                    _b.label = 2;
                case 2:
                    if (!(_i < payers_2.length)) return [3 /*break*/, 5];
                    p = payers_2[_i];
                    return [5 /*yield**/, _loop_3(p)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // Simple subscribe flow
    function ensureProviderReady() {
        return __awaiter(this, void 0, void 0, function () {
            var list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!provider) return [3 /*break*/, 3];
                        return [4 /*yield*/, enumerateProviders()];
                    case 1:
                        list = _a.sent();
                        if (!list.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, useProvider(list[0].provider)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!provider)
                            throw new Error('No provider');
                        return [2 /*return*/];
                }
            });
        });
    }
    // Populate simple token select
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var tResp, list, sel, _i, _a, t, opt, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch('./tokens.json')];
                case 1:
                    tResp = _c.sent();
                    if (!tResp.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, tResp.json()];
                case 2:
                    list = _c.sent();
                    sel = document.getElementById('simpleToken');
                    sel.innerHTML = '';
                    for (_i = 0, _a = list; _i < _a.length; _i++) {
                        t = _a[_i];
                        opt = document.createElement('option');
                        opt.value = JSON.stringify(t);
                        opt.textContent = t.label;
                        sel.appendChild(opt);
                    }
                    _c.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    _b = _c.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); })();
    var btnSimpleSubscribe = document.getElementById('simpleSubscribe');
    btnSimpleSubscribe && (btnSimpleSubscribe.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
        var subAddr, merchant, centsStr, usdCents, period, preset, asset, feedIdStr, periodsCount, iface, data, payloadHex, callData, raw, unitsOne, totalUnits, c, tx1, erc20, approveTx, c, depTx, c2, tx2, e_24;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 14, , 15]);
                    return [4 /*yield*/, ensureProviderReady()];
                case 1:
                    _a.sent();
                    requireAddress($("subAddr").value, 'Subscription address');
                    subAddr = $("subAddr").value;
                    merchant = currentAccount || '';
                    if (!merchant || !isAddress(merchant))
                        return [2 /*return*/, alert('Connect wallet first')];
                    centsStr = ($("simpleCents").value || '9.99').toString();
                    usdCents = Math.round(parseFloat(centsStr) * 100);
                    period = parseInt(document.getElementById('simplePeriod').value, 10);
                    preset = JSON.parse(document.getElementById('simpleToken').value);
                    asset = preset.address;
                    feedIdStr = preset.feedId || 'ETH';
                    periodsCount = parseInt(($("simplePeriodsCount").value || '1').toString(), 10);
                    iface = new ethers.utils.Interface([
                        'function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)',
                        'function quoteEthForUsdCents(uint256) view returns (uint256)',
                        'function quoteTokenForUsdCents(bytes32,address,uint256) view returns (uint256)'
                    ]);
                    data = void 0;
                    if (asset === '0x0000000000000000000000000000000000000000') {
                        data = iface.encodeFunctionData('quoteEthForUsdCents', [usdCents]);
                    }
                    else {
                        data = iface.encodeFunctionData('quoteTokenForUsdCents', [toBytes32(feedIdStr), asset, usdCents]);
                    }
                    return [4 /*yield*/, getPayloadHex(feedIdStr)];
                case 2:
                    payloadHex = _a.sent();
                    callData = data + payloadHex.slice(2);
                    return [4 /*yield*/, provider.call({ to: subAddr, data: callData })];
                case 3:
                    raw = _a.sent();
                    unitsOne = (asset === '0x0000000000000000000000000000000000000000'
                        ? iface.decodeFunctionResult('quoteEthForUsdCents', raw)[0]
                        : iface.decodeFunctionResult('quoteTokenForUsdCents', raw)[0]);
                    totalUnits = (unitsOne.mul ? unitsOne.mul(periodsCount) : (BigInt(unitsOne.toString()) * BigInt(periodsCount))).toString();
                    if (!(asset === '0x0000000000000000000000000000000000000000')) return [3 /*break*/, 6];
                    c = new ethers.Contract(subAddr, ['function depositETH() payable'], signer);
                    return [4 /*yield*/, c.depositETH({ value: totalUnits })];
                case 4:
                    tx1 = _a.sent();
                    return [4 /*yield*/, tx1.wait()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 6:
                    erc20 = new ethers.Contract(asset, [
                        'function decimals() view returns (uint8)',
                        'function approve(address,uint256) returns (bool)'
                    ], signer);
                    return [4 /*yield*/, erc20.approve(subAddr, totalUnits)];
                case 7:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 8:
                    _a.sent();
                    c = new ethers.Contract(subAddr, ['function depositToken(address,uint256)'], signer);
                    return [4 /*yield*/, c.depositToken(asset, totalUnits)];
                case 9:
                    depTx = _a.sent();
                    return [4 /*yield*/, depTx.wait()];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    c2 = new ethers.Contract(subAddr, ['function subscribeAdvanced(address,address,bytes32,uint256,uint256,uint256,uint16)'], signer);
                    return [4 /*yield*/, c2.subscribeAdvanced(merchant, asset, toBytes32(feedIdStr), usdCents, period, 0, 0)];
                case 12:
                    tx2 = _a.sent();
                    return [4 /*yield*/, tx2.wait()];
                case 13:
                    _a.sent();
                    alert('Subscribed successfully');
                    return [3 /*break*/, 15];
                case 14:
                    e_24 = _a.sent();
                    alert('Simple subscribe failed: ' + ((e_24 === null || e_24 === void 0 ? void 0 : e_24.message) || e_24));
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    }); });
})();

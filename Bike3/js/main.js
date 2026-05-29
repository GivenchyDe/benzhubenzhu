/* ============================================
   main.js - Bike3 主交互逻辑
   页面渲染、Tab切换、事件处理、弹窗管理
   ============================================ */

// ===== 工具函数 =====

/** Toast 消息提示 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/** 格式化时间戳 */
function formatTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 截断地址显示 */
function shortAddress(addr) {
    if (!addr) return '-';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

/** 截断哈希 */
function shortHash(hash) {
    if (!hash) return '-';
    return hash.substring(0, 10) + '...' + hash.substring(hash.length - 8);
}

/** 获取状态文本 */
function getStatusText(status) {
    const map = { 0: '不可用', 1: '可用', 2: '租用中', 3: '故障' };
    return map[status] || '未知';
}

/** 获取状态CSS类 */
function getStatusClass(status) {
    const map = { 0: 'status-unavailable', 1: 'status-available', 2: 'status-rented', 3: 'status-fault' };
    return map[status] || '';
}

/** 获取日志类型文本 */
function getEventTypeText(type) {
    const map = {
        'BikeAdded': '添加单车',
        'BikeRented': '租用单车',
        'BikeReturned': '归还单车',
        'BikeStatusChanged': '状态变更',
        'FaultReported': '故障上报',
        'WalletRecharged': '钱包充值'
    };
    return map[type] || type;
}

/** 获取日志类型CSS类 */
function getEventTypeClass(type) {
    const map = {
        'BikeAdded': 'log-type-bike-added',
        'BikeRented': 'log-type-bike-rented',
        'BikeReturned': 'log-type-bike-returned',
        'BikeStatusChanged': 'log-type-bike-status',
        'FaultReported': 'log-type-fault-reported'
    };
    return map[type] || '';
}

// ===== 弹窗管理 =====

function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// ===== Tab 切换 =====

function switchTab(tabName) {
    // 更新tab按钮状态
    document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tabName);
    });
    // 更新内容区
    document.querySelectorAll('.tab-pane-custom').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });
    // 刷新对应内容
    switch (tabName) {
        case 'dashboard': refreshDashboard(); break;
        case 'bikes': refreshBikeList(); break;
        case 'orders': refreshOrderList(); break;
        case 'admin': refreshAdminPanel(); break;
        case 'logs': refreshLogList(); break;
    }
}

// ===== 钱包状态栏刷新 =====

function refreshWalletBar() {
    const wallet = WalletMock.getCurrentWallet();
    const addrEl = document.getElementById('walletAddress');
    const balanceEl = document.getElementById('walletBalance');
    const roleEl = document.getElementById('walletRole');

    if (wallet) {
        addrEl.textContent = shortAddress(wallet.address);
        addrEl.title = wallet.address;
        balanceEl.textContent = `${wallet.balance.toFixed(4)} ETH`;

        const state = ContractMock.loadContractState();
        const isAdmin = ContractMock.isOwner(wallet.address, state);
        roleEl.textContent = isAdmin ? '管理员' : '普通用户';
        roleEl.className = `role-badge ${isAdmin ? 'role-admin' : 'role-user'}`;
    } else {
        addrEl.textContent = '未连接';
        balanceEl.textContent = '0 ETH';
        roleEl.textContent = '普通用户';
        roleEl.className = 'role-badge role-user';
    }
}

// ===== Tab 1: 首页仪表盘 =====

function refreshDashboard() {
    const stats = ContractMock.getStats();
    const wallet = WalletMock.getCurrentWallet();

    document.getElementById('statTotalBikes').textContent = stats.totalBikes;
    document.getElementById('statAvailable').textContent = stats.availableBikes;
    document.getElementById('statRented').textContent = stats.rentedBikes;
    document.getElementById('statFault').textContent = stats.faultBikes;
    document.getElementById('statIncome').textContent = stats.totalIncome.toFixed(4);
    document.getElementById('statOrders').textContent = stats.totalOrders;

    document.getElementById('dashOwner').textContent = stats.owner ? shortAddress(stats.owner) : '未设置';
    document.getElementById('dashEventsCount').textContent = stats.eventsCount;
}

// ===== Tab 2: 单车列表 =====

let currentBikeFilter = 'all';

function refreshBikeList() {
    const filter = document.getElementById('bikeStatusFilter').value;
    currentBikeFilter = filter;
    let bikes = ContractMock.getAllBikes();

    if (filter !== 'all') {
        bikes = bikes.filter(b => b.status === parseInt(filter));
    }

    const tbody = document.getElementById('bikeTableBody');
    if (bikes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">暂无单车数据</td></tr>';
        return;
    }

    const wallet = WalletMock.getCurrentWallet();
    const currentAddr = wallet ? wallet.address : '';

    tbody.innerHTML = bikes.map(b => {
        const canRent = b.status === 1 && !!currentAddr;
        const canReport = (b.status === 1 || b.status === 0) && !!currentAddr;
        const isCurrentRider = b.status === 2 && currentAddr &&
            b.currentRider.toLowerCase() === currentAddr.toLowerCase();

        let actionHtml = '';
        if (canRent) {
            actionHtml += `<button class="btn btn-sm btn-green btn-custom rent-bike-btn" data-bikeid="${b.bikeId}">🚲 租用</button> `;
        }
        if (canReport) {
            actionHtml += `<button class="btn btn-sm btn-outline-green btn-custom report-fault-btn" data-bikeid="${b.bikeId}">⚠️ 上报故障</button> `;
        }
        if (b.status === 2 && isCurrentRider) {
            actionHtml += `<span class="text-warning fw-bold">🔴 您正在骑行</span>`;
        }

        return `<tr>
            <td><strong>#${b.bikeId}</strong></td>
            <td>${b.deposit} ETH</td>
            <td>${b.pricePerMinute} ETH</td>
            <td><span class="status-badge ${getStatusClass(b.status)}">${getStatusText(b.status)}</span></td>
            <td><code>${b.currentRider ? shortAddress(b.currentRider) : '-'}</code></td>
            <td>${actionHtml || '-'}</td>
        </tr>`;
    });

    // 绑定事件
    tbody.querySelectorAll('.rent-bike-btn').forEach(btn => {
        btn.addEventListener('click', () => openRentModal(parseInt(btn.dataset.bikeid)));
    });
    tbody.querySelectorAll('.report-fault-btn').forEach(btn => {
        btn.addEventListener('click', () => handleReportFault(parseInt(btn.dataset.bikeid)));
    });
}

function openRentModal(bikeId) {
    const bikes = ContractMock.getAllBikes();
    const bike = bikes.find(b => b.bikeId === bikeId);
    if (!bike) return showToast('单车不存在', 'error');

    const wallet = WalletMock.getCurrentWallet();
    if (!wallet) return showToast('请先连接钱包', 'error');

    if (wallet.balance < bike.deposit) {
        return showToast(`余额不足！需要押金 ${bike.deposit} ETH`, 'error');
    }

    const info = document.getElementById('rentBikeInfo');
    info.innerHTML = `
        <table class="table table-sm table-borderless">
            <tr><td style="width:120px" class="text-muted">单车ID</td><td><strong>#${bike.bikeId}</strong></td></tr>
            <tr><td class="text-muted">押金</td><td><strong class="text-danger">${bike.deposit} ETH</strong>（将冻结）</td></tr>
            <tr><td class="text-muted">每分钟单价</td><td>${bike.pricePerMinute} ETH</td></tr>
            <tr><td class="text-muted">您的余额</td><td><strong>${wallet.balance.toFixed(4)} ETH</strong></td></tr>
        </table>
    `;

    document.getElementById('btnConfirmRent').onclick = async () => {
        try {
            const result = ContractMock.rentBike(bikeId, wallet.address);
            closeModal('modalRentBike');
            showToast(`租用成功！交易哈希：${shortHash(result.txHash)}`, 'success');
            refreshWalletBar();
            refreshBikeList();
            refreshDashboard();
            refreshLogList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    openModal('modalRentBike');
}

async function handleReportFault(bikeId) {
    const wallet = WalletMock.getCurrentWallet();
    if (!wallet) return showToast('请先连接钱包', 'error');

    if (!confirm(`确定上报单车 #${bikeId} 为故障吗？管理员将审核处理。`)) return;

    try {
        const result = ContractMock.reportFault(bikeId, wallet.address);
        showToast(`故障上报成功！交易哈希：${shortHash(result.txHash)}`, 'success');
        refreshBikeList();
        refreshDashboard();
        refreshLogList();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Tab 3: 订单管理 =====

function refreshOrderList() {
    const wallet = WalletMock.getCurrentWallet();
    if (!wallet) {
        document.getElementById('orderTableBody').innerHTML =
            '<tr><td colspan="8" class="text-center text-muted py-4">请先连接钱包</td></tr>';
        document.getElementById('activeOrderCard').style.display = 'none';
        return;
    }

    // 检查进行中的租用
    const activeOrders = ContractMock.getUserActiveOrders(wallet.address);
    const activeCard = document.getElementById('activeOrderCard');
    const activeContent = document.getElementById('activeOrderContent');

    if (activeOrders && activeOrders.length > 0) {
        activeCard.style.display = 'block';
        activeContent.innerHTML = activeOrders.map((ao, idx) => {
            const bike = ao.bike;
            const duration = Math.ceil((Date.now() - bike.rentStartTime) / 60000);
            const estimatedCost = duration * bike.pricePerMinute;
            return `
            <div class="row mb-3 pb-3${idx < activeOrders.length - 1 ? ' border-bottom' : ''}">
                <div class="col-md-6">
                    <p><strong>单车ID：</strong>#${bike.bikeId}</p>
                    <p><strong>押金：</strong>${bike.deposit} ETH</p>
                    <p><strong>每分钟单价：</strong>${bike.pricePerMinute} ETH</p>
                    <p><strong>开始时间：</strong>${formatTime(bike.rentStartTime)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>已骑行：</strong>${duration} 分钟</p>
                    <p><strong>预估费用：</strong>${estimatedCost.toFixed(4)} ETH</p>
                    <p><strong>预估退款：</strong>${Math.max(0, bike.deposit - estimatedCost).toFixed(4)} ETH</p>
                    <button class="btn btn-green btn-custom return-active-btn" data-bikeid="${bike.bikeId}">🏁 归还单车</button>
                </div>
            </div>`;
        }).join('');
        activeContent.querySelectorAll('.return-active-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                openReturnModal(parseInt(this.dataset.bikeid));
            });
        });
    } else {
        activeCard.style.display = 'none';
    }

    // 历史订单
    const orders = ContractMock.getUserOrders(wallet.address);
    const tbody = document.getElementById('orderTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">暂无订单记录</td></tr>';
        return;
    }

    // 按ID升序显示（最早的订单在最上面）
    const sorted = [...orders];

    tbody.innerHTML = sorted.map(o => {
        const duration = o.endTime ? Math.max(1, Math.ceil((o.endTime - o.startTime) / 60000)) : '-';
        return `<tr>
            <td><strong>#${o.orderId}</strong></td>
            <td>#${o.bikeId}</td>
            <td>${formatTime(o.startTime)}</td>
            <td>${o.endTime ? formatTime(o.endTime) : '进行中'}</td>
            <td>${duration}</td>
            <td><strong>${o.totalCost.toFixed(4)} ETH</strong></td>
            <td>${o.deposit} ETH</td>
            <td><code title="${o.txHash}">${shortHash(o.txHash)}</code></td>
        </tr>`;
    });
}

function openReturnModal(bikeId) {
    const bikes = ContractMock.getAllBikes();
    const bike = bikes.find(b => b.bikeId === bikeId);
    if (!bike) return showToast('单车不存在', 'error');

    const wallet = WalletMock.getCurrentWallet();
    if (!wallet) return showToast('请先连接钱包', 'error');

    const duration = Math.ceil((Date.now() - bike.rentStartTime) / 60000);
    const estimatedCost = duration * bike.pricePerMinute;
    const refund = Math.max(0, bike.deposit - estimatedCost);

    const info = document.getElementById('returnBikeInfo');
    info.innerHTML = `
        <table class="table table-sm table-borderless">
            <tr><td style="width:120px" class="text-muted">单车ID</td><td><strong>#${bike.bikeId}</strong></td></tr>
            <tr><td class="text-muted">押金</td><td>${bike.deposit} ETH</td></tr>
            <tr><td class="text-muted">骑行时长</td><td><strong>${duration} 分钟</strong></td></tr>
            <tr><td class="text-muted">骑行费用</td><td><strong class="text-danger">${estimatedCost.toFixed(4)} ETH</strong></td></tr>
            <tr><td class="text-muted">退还金额</td><td><strong class="text-success">${refund.toFixed(4)} ETH</strong></td></tr>
        </table>
    `;

    document.getElementById('btnConfirmReturn').onclick = async () => {
        try {
            const result = ContractMock.returnBike(bikeId, wallet.address);
            closeModal('modalReturnBike');
            showToast(`归还成功！退款 ${result.refundAmount.toFixed(4)} ETH, 费用 ${result.totalCost.toFixed(4)} ETH`, 'success');
            refreshWalletBar();
            refreshBikeList();
            refreshOrderList();
            refreshDashboard();
            refreshLogList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    openModal('modalReturnBike');
}

// ===== Tab 4: 运营后台 =====

function refreshAdminPanel() {
    const wallet = WalletMock.getCurrentWallet();
    const state = ContractMock.loadContractState();
    const isAdmin = wallet && ContractMock.isOwner(wallet.address, state);

    document.getElementById('adminNotOwner').style.display = isAdmin ? 'none' : 'block';
    document.getElementById('adminContent').style.display = isAdmin ? 'block' : 'none';

    if (!isAdmin) return;

    // 更新统计
    const stats = ContractMock.getStats();
    const allOrders = ContractMock.getAllOrders();
    const completedOrders = allOrders.filter(o => o.isCompleted);

    const avgCost = completedOrders.length > 0
        ? (completedOrders.reduce((sum, o) => sum + o.totalCost, 0) / completedOrders.length).toFixed(4)
        : '0';

    document.getElementById('adminStats').innerHTML = `
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value">${stats.totalBikes}</div>
                <div class="stat-label">单车总数</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card income">
                <div class="stat-value">${stats.totalIncome.toFixed(4)}</div>
                <div class="stat-label">总收入 (ETH)</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value">${completedOrders.length}</div>
                <div class="stat-label">已完成订单</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value">${avgCost}</div>
                <div class="stat-label">平均费用 (ETH)</div>
            </div>
        </div>
    `;
}

// ===== Tab 5: 链上日志 =====

function refreshLogList() {
    const typeFilter = document.getElementById('logTypeFilter').value;
    const hashFilter = document.getElementById('logHashFilter').value.trim().toLowerCase();
    let events = ContractMock.getEvents(typeFilter);

    if (hashFilter) {
        events = events.filter(e => e.txHash && e.txHash.toLowerCase().includes(hashFilter));
    }

    // 最新在前
    events = [...events].reverse();

    const container = document.getElementById('logList');

    if (events.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>暂无匹配的链上事件日志</p></div>`;
        return;
    }

    container.innerHTML = events.map(e => `
        <div class="log-item ${getEventTypeClass(e.type)}">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-1">
                <span class="log-type">📌 ${getEventTypeText(e.type)}</span>
                <span class="log-time">${formatTime(e.timestamp)}</span>
            </div>
            <div class="log-hash mt-1" title="${e.txHash}">🔖 ${e.txHash}</div>
            <div class="mt-2" style="font-size:0.82rem;color:var(--gray-600)">
                ${formatEventDetails(e)}
            </div>
        </div>
    `).join('');
}

function formatEventDetails(event) {
    const fields = { ...event };
    delete fields.type;
    delete fields.timestamp;
    delete fields.txHash;

    return Object.entries(fields).map(([key, val]) => {
        let displayVal = val;
        if (key.toLowerCase().includes('address') || key === 'rider' || key === 'reporter') {
            displayVal = shortAddress(String(val));
        }
        if (key === 'owner') displayVal = shortAddress(String(val));
        return `<span class="me-2"><strong>${key}:</strong> ${displayVal}</span>`;
    }).join('');
}

// ===== 钱包管理弹窗 =====

function refreshWalletModal() {
    const wallets = WalletMock.getWallets();
    const currentAddr = WalletMock.getCurrentWalletAddress();
    const container = document.getElementById('walletList');

    if (wallets.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">暂无钱包，请先创建</div>';
        return;
    }

    container.innerHTML = wallets.map(w => {
        const isActive = w.address.toLowerCase() === currentAddr.toLowerCase();
        const balance = WalletMock.getBalance(w.address);
        const state = ContractMock.loadContractState();
        const isAdmin = ContractMock.isOwner(w.address, state);
        return `
            <div class="wallet-list-item ${isActive ? 'active' : ''}" data-address="${w.address}">
                <div>
                    <div style="font-family:monospace;font-size:0.85rem">${shortAddress(w.address)}</div>
                    <div style="font-size:0.78rem;color:var(--gray-600)">
                        ${balance.toFixed(4)} ETH
                        ${isAdmin ? ' <span class="status-badge" style="font-size:0.7rem;background:#fff3cd;color:#856404">管理员</span>' : ''}
                        ${isActive ? ' <span class="status-badge status-available" style="font-size:0.7rem">当前</span>' : ''}
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-green btn-custom switch-wallet-btn" data-address="${w.address}">
                    ${isActive ? '已选中' : '切换'}
                </button>
            </div>
        `;
    });

    // 绑定切换按钮
    container.querySelectorAll('.switch-wallet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const addr = btn.dataset.address;
            try {
                WalletMock.switchWallet(addr);
                closeModal('modalWallet');
                showToast(`已切换到 ${shortAddress(addr)}`, 'success');
                refreshAll();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });

    // 绑定item点击切换
    container.querySelectorAll('.wallet-list-item').forEach(item => {
        item.addEventListener('click', () => {
            const addr = item.dataset.address;
            if (addr.toLowerCase() === currentAddr.toLowerCase()) return;
            try {
                WalletMock.switchWallet(addr);
                closeModal('modalWallet');
                showToast(`已切换到 ${shortAddress(addr)}`, 'success');
                refreshAll();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

// ===== 刷新所有 =====

function refreshAll() {
    refreshWalletBar();
    const activeTab = document.querySelector('.tab-pane-custom.active');
    if (activeTab) {
        const tabName = activeTab.id.replace('tab-', '');
        switch (tabName) {
            case 'dashboard': refreshDashboard(); break;
            case 'bikes': refreshBikeList(); break;
            case 'orders': refreshOrderList(); break;
            case 'admin': refreshAdminPanel(); break;
            case 'logs': refreshLogList(); break;
        }
    }
}

// ===== 初始化 =====

function init() {
    // 初始化环境
    WalletMock.initWalletEnv();

    // 刷新UI
    refreshWalletBar();
    refreshDashboard();

    // ===== 导航Tab切换事件 =====
    document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });

    // ===== 钱包按钮 =====
    document.getElementById('btnConnectWallet').addEventListener('click', () => {
        refreshWalletModal();
        openModal('modalWallet');
    });

    document.getElementById('btnSwitchWallet').addEventListener('click', () => {
        refreshWalletModal();
        openModal('modalWallet');
    });

    document.getElementById('btnRecharge').addEventListener('click', () => {
        if (!WalletMock.getCurrentWallet()) return showToast('请先连接钱包', 'error');
        document.getElementById('inputRechargeAmount').value = '5';
        openModal('modalRecharge');
    });

    // ===== 弹窗关闭按钮 =====
    document.getElementById('closeModalWallet').addEventListener('click', () => closeModal('modalWallet'));
    document.getElementById('closeModalRecharge').addEventListener('click', () => closeModal('modalRecharge'));
    document.getElementById('closeModalWalletCreated').addEventListener('click', () => closeModal('modalWalletCreated'));
    document.getElementById('closeModalRentBike').addEventListener('click', () => closeModal('modalRentBike'));
    document.getElementById('closeModalReturnBike').addEventListener('click', () => closeModal('modalReturnBike'));

    // 点击遮罩关闭弹窗
    document.querySelectorAll('.modal-custom-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('show');
        });
    });

    // ===== 钱包弹窗内按钮 =====
    document.getElementById('btnCreateWallet').addEventListener('click', async () => {
        try {
            const result = WalletMock.createWallet();
            document.getElementById('createdAddress').textContent = result.address;
            document.getElementById('createdMnemonic').textContent = result.mnemonic || '无';
            document.getElementById('createdPrivateKey').textContent = result.privateKey;
            closeModal('modalWallet');
            openModal('modalWalletCreated');
            showToast('钱包创建成功！请备份助记词和私钥', 'success');
            refreshAll();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('btnImportWallet').addEventListener('click', () => {
        const area = document.getElementById('importArea');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btnConfirmImport').addEventListener('click', async () => {
        const pk = document.getElementById('inputPrivateKey').value.trim();
        if (!pk) return showToast('请输入私钥', 'error');
        try {
            const result = WalletMock.importWallet(pk);
            document.getElementById('importArea').style.display = 'none';
            document.getElementById('inputPrivateKey').value = '';
            closeModal('modalWallet');
            showToast(`钱包导入成功：${shortAddress(result.address)}`, 'success');
            refreshAll();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // ===== 充值确认 =====
    document.getElementById('btnConfirmRecharge').addEventListener('click', () => {
        const wallet = WalletMock.getCurrentWallet();
        if (!wallet) return showToast('请先连接钱包', 'error');
        const amount = document.getElementById('inputRechargeAmount').value;
        try {
            const result = WalletMock.rechargeWallet(wallet.address, amount);
            closeModal('modalRecharge');
            showToast(`充值成功！当前余额：${result.newBalance.toFixed(4)} ETH`, 'success');
            refreshWalletBar();
            refreshDashboard();
            refreshLogList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // ===== 首页快捷按钮 =====
    document.getElementById('btnQuickRent').addEventListener('click', () => switchTab('bikes'));
    document.getElementById('btnQuickOrders').addEventListener('click', () => switchTab('orders'));
    document.getElementById('btnQuickLogs').addEventListener('click', () => switchTab('logs'));

    // ===== 单车列表 =====
    document.getElementById('bikeStatusFilter').addEventListener('change', refreshBikeList);
    document.getElementById('btnRefreshBikes').addEventListener('click', refreshBikeList);

    // ===== 订单管理 =====
    document.getElementById('btnRefreshOrders').addEventListener('click', refreshOrderList);

    // ===== 运营后台 =====
    document.getElementById('btnAdminSwitch').addEventListener('click', () => {
        refreshWalletModal();
        openModal('modalWallet');
    });

    document.getElementById('btnAddBike').addEventListener('click', () => {
        const wallet = WalletMock.getCurrentWallet();
        if (!wallet) return showToast('请先连接钱包', 'error');
        const deposit = parseFloat(document.getElementById('inputDeposit').value);
        const pricePerMinute = parseFloat(document.getElementById('inputPricePerMinute').value);
        try {
            const bike = ContractMock.addBike(deposit, pricePerMinute, wallet.address);
            showToast(`单车 #${bike.bikeId} 添加成功！`, 'success');
            refreshAdminPanel();
            refreshBikeList();
            refreshDashboard();
            refreshLogList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('btnSetBikeStatus').addEventListener('click', () => {
        const wallet = WalletMock.getCurrentWallet();
        if (!wallet) return showToast('请先连接钱包', 'error');
        const bikeId = parseInt(document.getElementById('inputBikeId').value);
        const newStatus = parseInt(document.getElementById('selectBikeStatus').value);
        try {
            ContractMock.setBikeStatus(bikeId, newStatus, wallet.address);
            const statusText = getStatusText(newStatus);
            showToast(`单车 #${bikeId} 状态已更新为「${statusText}」`, 'success');
            refreshAdminPanel();
            refreshBikeList();
            refreshDashboard();
            refreshLogList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // ===== 链上日志 =====
    document.getElementById('logTypeFilter').addEventListener('change', refreshLogList);
    document.getElementById('logHashFilter').addEventListener('input', refreshLogList);
    document.getElementById('btnClearLogFilter').addEventListener('click', () => {
        document.getElementById('logTypeFilter').value = 'all';
        document.getElementById('logHashFilter').value = '';
        refreshLogList();
    });
    document.getElementById('btnRefreshLogs').addEventListener('click', refreshLogList);

    // ===== 自动刷新进行中订单 =====
    setInterval(() => {
        const activeTab = document.querySelector('.tab-pane-custom.active');
        if (activeTab && activeTab.id === 'tab-orders') {
            refreshOrderList();
        }
    }, 10000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

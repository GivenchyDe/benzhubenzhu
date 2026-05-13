/* ============================================
   wallet-mock.js - 模拟钱包功能（基于 ethers.js v6）
   钱包创建、导入、切换、余额管理、充值
   ============================================ */

const WALLETS_KEY = 'wallets';
const CURRENT_WALLET_KEY = 'currentWallet';

// ---------- 钱包管理 ----------

/** 获取所有已创建钱包 */
function getWallets() {
    try {
        return JSON.parse(localStorage.getItem(WALLETS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

/** 保存钱包列表 */
function saveWallets(wallets) {
    localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

/** 获取当前激活的钱包地址 */
function getCurrentWalletAddress() {
    return localStorage.getItem(CURRENT_WALLET_KEY) || '';
}

/** 获取当前钱包的完整信息 */
function getCurrentWallet() {
    const address = getCurrentWalletAddress();
    if (!address) return null;
    const wallets = getWallets();
    const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!wallet) return null;
    return {
        ...wallet,
        balance: getBalance(address)
    };
}

/** 保存当前激活钱包 */
function setCurrentWallet(address) {
    localStorage.setItem(CURRENT_WALLET_KEY, address);
}

// ---------- 余额管理 ----------

/** 获取钱包余额 */
function getBalance(address) {
    if (!address) return 0;
    const balance = localStorage.getItem(`balance_${address.toLowerCase()}`);
    // 如果首次使用，分配初始余额
    if (balance === null) {
        const initialBalance = (Math.random() * 5 + 2).toFixed(6); // 2~7 ETH
        localStorage.setItem(`balance_${address.toLowerCase()}`, initialBalance);
        return parseFloat(initialBalance);
    }
    return parseFloat(balance);
}

/** 设置钱包余额 */
function setBalance(address, amount) {
    localStorage.setItem(`balance_${address.toLowerCase()}`, parseFloat(amount).toFixed(6));
}

/** 充值 */
function rechargeWallet(address, amount) {
    if (!address) throw new Error('请先连接钱包');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) throw new Error('请输入有效的充值金额');
    if (amt > 100) throw new Error('单次充值不能超过100 ETH');

    const currentBalance = getBalance(address);
    const newBalance = currentBalance + amt;
    setBalance(address, newBalance);

    // 记录充值事件
    const state = ContractMock.loadContractState();
    state.events.push({
        type: 'WalletRecharged',
        address: address,
        amount: amt,
        newBalance: newBalance,
        timestamp: Date.now(),
        txHash: '0x' + Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('')
    });
    ContractMock.saveContractState(state);

    return { success: true, newBalance: newBalance };
}

/** 扣除余额（内部使用） */
function deductBalance(address, amount) {
    const currentBalance = getBalance(address);
    if (currentBalance < amount) {
        throw new Error(`余额不足：需要 ${amount} ETH，当前 ${currentBalance.toFixed(4)} ETH`);
    }
    const newBalance = currentBalance - amount;
    setBalance(address, newBalance);
    return newBalance;
}

// ---------- 钱包创建与导入 ----------

/**
 * 创建新钱包
 * 使用 ethers.js v6 API
 */
function createWallet() {
    try {
        if (typeof ethers === 'undefined') {
            throw new Error('ethers.js 未加载，请刷新页面重试');
        }

        const wallet = ethers.Wallet.createRandom();

        const walletInfo = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic.phrase
        };

        const wallets = getWallets();
        // 防止重复地址
        if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
            throw new Error('该钱包地址已存在');
        }

        wallets.push(walletInfo);
        saveWallets(wallets);

        // 设置为当前钱包
        setCurrentWallet(wallet.address);

        // 分配初始余额
        const initialBalance = (Math.random() * 5 + 2).toFixed(6);
        setBalance(wallet.address, parseFloat(initialBalance));

        // 第一个钱包自动成为管理员
        const state = ContractMock.loadContractState();
        if (!state.owner || wallets.length === 1) {
            ContractMock.setOwner(wallet.address, state);
        }

        return {
            address: wallet.address,
            mnemonic: wallet.mnemonic.phrase,
            privateKey: wallet.privateKey,
            balance: parseFloat(initialBalance)
        };
    } catch (e) {
        console.error('创建钱包失败:', e);
        throw e;
    }
}

/**
 * 通过私钥导入钱包
 */
function importWallet(privateKey) {
    try {
        if (typeof ethers === 'undefined') {
            throw new Error('ethers.js 未加载，请刷新页面重试');
        }

        // 清理私钥
        let key = privateKey.trim();
        if (!key.startsWith('0x')) {
            key = '0x' + key;
        }

        const wallet = new ethers.Wallet(key);

        const walletInfo = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : ''
        };

        const wallets = getWallets();
        if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
            throw new Error('该钱包地址已存在');
        }

        wallets.push(walletInfo);
        saveWallets(wallets);

        // 设置为当前钱包
        setCurrentWallet(wallet.address);

        // 分配初始余额
        const initialBalance = (Math.random() * 5 + 2).toFixed(6);
        setBalance(wallet.address, parseFloat(initialBalance));

        // 第一个钱包自动成为管理员
        const state = ContractMock.loadContractState();
        if (!state.owner || wallets.length === 1) {
            ContractMock.setOwner(wallet.address, state);
        }

        return {
            address: wallet.address,
            balance: parseFloat(initialBalance)
        };
    } catch (e) {
        if (e.message.includes('invalid')) {
            throw new Error('无效的私钥格式');
        }
        throw e;
    }
}

/**
 * 切换钱包
 */
function switchWallet(address) {
    const wallets = getWallets();
    const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!wallet) throw new Error('钱包不存在');

    setCurrentWallet(address);

    // 确保余额存在
    const balance = getBalance(address);

    return {
        address: address,
        balance: balance
    };
}

/**
 * 获取钱包助记词
 */
function getWalletMnemonic(address) {
    const wallets = getWallets();
    const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!wallet) throw new Error('钱包不存在');
    return wallet.mnemonic || '';
}

/**
 * 获取钱包私钥
 */
function getWalletPrivateKey(address) {
    const wallets = getWallets();
    const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!wallet) throw new Error('钱包不存在');
    return wallet.privateKey || '';
}

// ---------- 初始化 ----------

/**
 * 初始化钱包环境
 */
function initWalletEnv() {
    // 确保 localStorage 中有 wallets
    if (!localStorage.getItem(WALLETS_KEY)) {
        localStorage.setItem(WALLETS_KEY, '[]');
    }

    // 确保合约状态已初始化
    let state = ContractMock.loadContractState();
    const defaultState = {
        owner: '',
        bikeCount: 0,
        orderCount: 0,
        totalIncome: 0,
        bikes: [],
        orders: [],
        userOrders: {},
        events: []
    };
    // 合并默认值
    state = { ...defaultState, ...state };
    ContractMock.saveContractState(state);
}

// 导出到全局
window.WalletMock = {
    getWallets,
    getCurrentWallet,
    getCurrentWalletAddress,
    getBalance,
    setBalance,
    rechargeWallet,
    deductBalance,
    createWallet,
    importWallet,
    switchWallet,
    getWalletMnemonic,
    getWalletPrivateKey,
    setCurrentWallet,
    initWalletEnv,
};

/* ============================================
   contract-mock.js - 模拟智能合约逻辑
   模拟 Solidity 合约：单车管理、租赁计费、押金管理等核心功能
   ============================================ */

// ---------- 模拟 Solidity 数据结构 ----------

/** 模拟单车结构体 */
class Bike {
    constructor(bikeId, deposit, pricePerMinute) {
        this.bikeId = bikeId;              // 单车唯一ID
        this.deposit = deposit;            // 押金金额（ETH）
        this.pricePerMinute = pricePerMinute; // 每分钟骑行单价（ETH）
        this.status = 1;                   // 状态：0-不可用 1-可用 2-租用中 3-故障
        this.currentRider = '';            // 当前骑行用户钱包地址
        this.rentStartTime = 0;            // 租用开始时间戳（毫秒）
    }
}

/** 模拟订单结构体 */
class Order {
    constructor(orderId, bikeId, rider) {
        this.orderId = orderId;            // 订单唯一ID
        this.bikeId = bikeId;              // 关联单车ID
        this.rider = rider;                // 骑行用户钱包地址
        this.startTime = Date.now();       // 租用开始时间
        this.endTime = 0;                  // 归还结束时间
        this.totalCost = 0;                // 总骑行费用（ETH）
        this.deposit = 0;                  // 押金金额（ETH）
        this.isCompleted = false;          // 订单是否完成
        this.txHash = '';                  // 模拟交易哈希
    }
}

// ---------- 合约全局状态 ----------

const STORAGE_KEY = 'contractState';

function generateTxHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * 16)];
    }
    return hash;
}

function getDefaultState() {
    return {
        owner: '',              // 管理员地址
        bikeCount: 0,           // 单车总数
        orderCount: 0,          // 订单总数
        totalIncome: 0,         // 平台总收入（ETH）
        bikes: [],              // 单车列表
        orders: [],             // 订单列表
        userOrders: {},         // 用户订单映射 { address: [orderId, ...] }
        events: []              // 模拟链上事件日志
    };
}

/** 从 localStorage 加载合约状态 */
function loadContractState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultState();
        return JSON.parse(raw);
    } catch (e) {
        console.error('加载合约状态失败:', e);
        return getDefaultState();
    }
}

/** 保存合约状态到 localStorage */
function saveContractState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('保存合约状态失败:', e);
        throw new Error('数据持久化失败，请检查浏览器存储空间');
    }
}

// ---------- 权限控制 ----------

/** 模拟 onlyOwner 修饰器 */
function onlyOwner(address, state) {
    if (!state.owner) return; // 尚未设置管理员，允许首次操作
    if (address.toLowerCase() !== state.owner.toLowerCase()) {
        throw new Error('权限不足：仅管理员可执行此操作');
    }
}

/** 设置管理员（首次创建钱包时调用） */
function setOwner(address, state) {
    if (!state.owner) {
        state.owner = address;
        saveContractState(state);
    }
}

/** 检查是否为管理员 */
function isOwner(address, state) {
    return state.owner && address.toLowerCase() === state.owner.toLowerCase();
}

// ---------- 事件日志 ----------

/** 添加事件日志，可选传入txHash */
function addEvent(state, type, data, txHash) {
    state.events.push({
        type: type,
        ...data,
        timestamp: Date.now(),
        txHash: txHash || generateTxHash()
    });
}

// ---------- 核心合约函数 ----------

/**
 * 1. 新增单车（管理员）
 * @param {number} deposit - 押金金额（ETH）
 * @param {number} pricePerMinute - 每分钟骑行单价（ETH）
 * @param {string} operator - 操作者钱包地址
 * @returns {Bike} 新创建的单车对象
 */
function addBike(deposit, pricePerMinute, operator) {
    const state = loadContractState();
    onlyOwner(operator, state);

    if (!deposit || deposit <= 0) throw new Error('押金必须大于0');
    if (!pricePerMinute || pricePerMinute <= 0) throw new Error('每分钟单价必须大于0');

    state.bikeCount++;
    const newBike = new Bike(state.bikeCount, deposit, pricePerMinute);
    state.bikes.push(newBike);

    addEvent(state, 'BikeAdded', {
        bikeId: state.bikeCount,
        deposit: deposit,
        pricePerMinute: pricePerMinute
    });

    saveContractState(state);
    return newBike;
}

/**
 * 2. 设置单车状态（管理员）
 * @param {number} bikeId - 单车ID
 * @param {number} newStatus - 新状态（0/1/3）
 * @param {string} operator - 操作者地址
 * @returns {Bike} 更新后的单车
 */
function setBikeStatus(bikeId, newStatus, operator) {
    const state = loadContractState();
    onlyOwner(operator, state);

    const bike = state.bikes.find(b => b.bikeId === bikeId);
    if (!bike) throw new Error('单车不存在');
    if (bike.status === 2) throw new Error('租用中的单车无法修改状态');
    if (![0, 1, 3].includes(newStatus)) throw new Error('无效的单车状态');

    bike.status = newStatus;

    addEvent(state, 'BikeStatusChanged', {
        bikeId: bikeId,
        newStatus: newStatus
    });

    saveContractState(state);
    return bike;
}

/**
 * 3. 租用单车（用户）
 * @param {number} bikeId - 单车ID
 * @param {string} rider - 用户钱包地址
 * @returns {object} { success, txHash, deposit }
 */
function rentBike(bikeId, rider) {
    const state = loadContractState();

    const bike = state.bikes.find(b => b.bikeId === bikeId);
    if (!bike) throw new Error('单车不存在');
    if (bike.status !== 1) throw new Error('单车当前不可用');
    if (!rider) throw new Error('请先连接钱包');

    // 检查用户余额是否足够支付押金
    const riderKey = rider.toLowerCase();
    const balance = parseFloat(localStorage.getItem(`balance_${riderKey}`) || '0');
    if (balance < bike.deposit) throw new Error(`余额不足：需要押金 ${bike.deposit} ETH，当前余额 ${balance.toFixed(4)} ETH`);

    // 冻结押金
    const newBalance = balance - bike.deposit;
    localStorage.setItem(`balance_${riderKey}`, newBalance.toFixed(6));

    // 更新单车状态
    const txHash = generateTxHash();
    bike.status = 2;
    bike.currentRider = rider;
    bike.rentStartTime = Date.now();

    addEvent(state, 'BikeRented', {
        bikeId: bikeId,
        rider: rider,
        startTime: bike.rentStartTime
    }, txHash);

    saveContractState(state);
    return { success: true, txHash: txHash, deposit: bike.deposit };
}

/**
 * 4. 归还单车（用户）
 * @param {number} bikeId - 单车ID
 * @param {string} rider - 用户钱包地址
 * @returns {object} { success, refundAmount, totalCost, orderId, txHash, durationMinutes }
 */
function returnBike(bikeId, rider) {
    const state = loadContractState();

    const bike = state.bikes.find(b => b.bikeId === bikeId);
    if (!bike) throw new Error('单车不存在');
    if (bike.currentRider.toLowerCase() !== rider.toLowerCase()) throw new Error('您不是该单车的当前骑行者');
    if (bike.status !== 2) throw new Error('该单车未处于租用状态');

    // 计费逻辑：分钟计费，不足1分钟按1分钟算
    const now = Date.now();
    const rentDurationMinutes = Math.max(1, Math.ceil((now - bike.rentStartTime) / 60000));
    const totalCost = rentDurationMinutes * bike.pricePerMinute;

    // 计算退款金额
    const refundAmount = bike.deposit - totalCost;

    // 退还余额（如果退款 > 0）
    if (refundAmount > 0) {
        const riderKey = rider.toLowerCase();
        const currentBalance = parseFloat(localStorage.getItem(`balance_${riderKey}`) || '0');
        localStorage.setItem(`balance_${riderKey}`, (currentBalance + refundAmount).toFixed(6));
    }

    // 生成订单
    const txHash = generateTxHash();
    state.orderCount++;
    const order = new Order(state.orderCount, bikeId, rider);
    order.startTime = bike.rentStartTime;
    order.endTime = now;
    order.totalCost = totalCost;
    order.deposit = bike.deposit;
    order.isCompleted = true;
    order.txHash = txHash;

    addEvent(state, 'BikeReturned', {
        bikeId: bikeId,
        rider: rider,
        totalCost: totalCost,
        refundAmount: refundAmount,
        orderId: state.orderCount,
        durationMinutes: rentDurationMinutes
    }, txHash);

    state.orders.push(order);

    // 维护用户订单列表
    const riderLower = rider.toLowerCase();
    if (!state.userOrders[riderLower]) {
        state.userOrders[riderLower] = [];
    }
    state.userOrders[riderLower].push(state.orderCount);

    // 更新平台收入
    state.totalIncome += totalCost;

    // 重置单车状态
    bike.status = 1;
    bike.currentRider = '';
    bike.rentStartTime = 0;

    saveContractState(state);

    return {
        success: true,
        refundAmount: refundAmount,
        totalCost: totalCost,
        orderId: state.orderCount,
        txHash: txHash,
        durationMinutes: rentDurationMinutes
    };
}

/**
 * 5. 用户上报故障
 * @param {number} bikeId - 单车ID
 * @param {string} reporter - 上报者地址
 * @returns {object} { success, txHash }
 */
function reportFault(bikeId, reporter) {
    const state = loadContractState();

    const bike = state.bikes.find(b => b.bikeId === bikeId);
    if (!bike) throw new Error('单车不存在');
    if (bike.status === 2) throw new Error('租用中的单车无法上报故障，请先归还');
    if (bike.status === 3) throw new Error('该单车已被标记为故障');
    if (!reporter) throw new Error('请先连接钱包');

    const txHash = generateTxHash();
    bike.status = 3;

    addEvent(state, 'FaultReported', {
        bikeId: bikeId,
        reporter: reporter
    }, txHash);

    saveContractState(state);
    return { success: true, txHash: txHash };
}

// ---------- 查询函数 ----------

/** 获取所有单车 */
function getAllBikes() {
    const state = loadContractState();
    return state.bikes;
}

/** 获取可用单车 */
function getAvailableBikes() {
    const state = loadContractState();
    return state.bikes.filter(b => b.status === 1);
}

/** 获取用户订单 */
function getUserOrders(rider) {
    const state = loadContractState();
    if (!rider) return [];
    const riderLower = rider.toLowerCase();
    const orderIds = state.userOrders[riderLower] || [];
    return orderIds.map(id => state.orders.find(o => o.orderId === id)).filter(Boolean);
}

/** 获取用户进行中的租用（租用中尚未归还） */
function getUserActiveOrders(rider) {
    const state = loadContractState();
    if (!rider) return [];
    const bikes = state.bikes.filter(
        b => b.status === 2 && b.currentRider.toLowerCase() === rider.toLowerCase()
    );
    return bikes.map(bike => ({ bike }));
}

/** 获取所有订单 */
function getAllOrders() {
    const state = loadContractState();
    return state.orders;
}

/** 获取所有事件日志 */
function getEvents(filterType) {
    const state = loadContractState();
    if (!filterType || filterType === 'all') return state.events;
    return state.events.filter(e => e.type === filterType);
}

/** 获取平台统计信息 */
function getStats() {
    const state = loadContractState();
    const bikes = state.bikes;
    return {
        totalBikes: bikes.length,
        availableBikes: bikes.filter(b => b.status === 1).length,
        rentedBikes: bikes.filter(b => b.status === 2).length,
        faultBikes: bikes.filter(b => b.status === 3).length,
        totalOrders: state.orders.length,
        totalIncome: state.totalIncome,
        owner: state.owner,
        eventsCount: state.events.length
    };
}

/** 获取合约状态（用于调试） */
function getFullState() {
    return loadContractState();
}

// ---------- 数据校验 ----------

/** 校验数据完整性（模拟区块链不可篡改） */
function validateDataIntegrity() {
    const state = loadContractState();
    const warnings = [];

    state.bikes.forEach(bike => {
        if (bike.status === 2 && bike.currentRider) {
            const hasOrder = state.orders.some(
                o => o.bikeId === bike.bikeId && !o.isCompleted
            );
            if (!hasOrder) {
                warnings.push(`单车 #${bike.bikeId} 状态为"租用中"但无对应订单`);
            }
        }
    });

    return { valid: warnings.length === 0, warnings };
}

// ---------- 测试数据生成 ----------

/** 生成测试数据 */
function generateTestData() {
    let state = loadContractState();

    if (state.bikes.length > 0) {
        console.log('已有测试数据，跳过生成');
        return;
    }

    const testBikes = [
        { deposit: 0.1, pricePerMinute: 0.001 },
        { deposit: 0.15, pricePerMinute: 0.0015 },
        { deposit: 0.1, pricePerMinute: 0.001 },
        { deposit: 0.2, pricePerMinute: 0.002 },
        { deposit: 0.1, pricePerMinute: 0.001 },
        { deposit: 0.15, pricePerMinute: 0.0015 },
        { deposit: 0.1, pricePerMinute: 0.001 },
        { deposit: 0.2, pricePerMinute: 0.002 },
        { deposit: 0.15, pricePerMinute: 0.0015 },
        { deposit: 0.1, pricePerMinute: 0.001 },
    ];

    testBikes.forEach(b => {
        state.bikeCount++;
        state.bikes.push(new Bike(state.bikeCount, b.deposit, b.pricePerMinute));
        addEvent(state, 'BikeAdded', {
            bikeId: state.bikeCount,
            deposit: b.deposit,
            pricePerMinute: b.pricePerMinute
        });
    });

    // 标记2辆为故障
    state.bikes[3].status = 3;
    state.bikes[7].status = 3;

    saveContractState(state);
    console.log('测试数据已生成：10辆单车');
}

// 导出到全局
window.ContractMock = {
    addBike,
    setBikeStatus,
    rentBike,
    returnBike,
    reportFault,
    getAllBikes,
    getAvailableBikes,
    getUserOrders,
    getUserActiveOrders,
    getAllOrders,
    getEvents,
    getStats,
    getFullState,
    loadContractState,
    saveContractState,
    setOwner,
    isOwner,
    validateDataIntegrity,
    generateTestData,
};

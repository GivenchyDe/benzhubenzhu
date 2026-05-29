# 共享单车区块链 Bike3 实验 技术实现需求文档

**文档版本**：V1.0（实验版 - 本地模拟链上存储 + 前端模拟合约执行）

**适配场景**：区块链实验教学（脱离真实公链的安全实验环境）

------

## 一、实验目的

1. **掌握智能合约核心业务逻辑设计**：学会设计并实现单车管理、租赁计费、押金冻结 / 退还、费用结算等完整租赁流程的合约规则，理解链上状态变更与权限控制的核心原理。
2. **掌握 Bike3 前端与链上交互开发**：能够完成钱包管理、账户创建 / 导入 / 切换、链下数据持久化、合约调用、事件监听、数据展示等全流程 Bike3 前端开发能力。
3. **掌握以太坊钱包与交易基础**：理解以太坊地址、私钥、助记词、余额管理、模拟交易与上链日志机制，熟练掌握 ethers.js 在 Bike3 交互中的使用方法。
4. **实现完整业务闭环**：完成从运营方添加单车 → 用户租车扣费 → 计时计费 → 还车退款 → 故障上报与修复 → 数据统计的全流程实验，验证去中心化共享单车系统的可用性。
5. **理解区块链实验的本地模拟方法**：掌握用 localStorage 模拟链上存储、用前端逻辑模拟合约执行、脱离真实公链 / 测试网的安全实验方式，降低实验门槛与风险。

------

## 二、实验内容

### 2.1 智能合约设计与实现

设计并实现共享单车租赁核心合约逻辑，定义单车、订单、交易等核心数据结构；实现运营方添加单车、用户租车押金冻结、按分钟计费、还车扣费退款、故障上报与修复等核心功能；通过权限控制机制区分普通用户与管理员角色；记录模拟链上交易与事件日志，保障押金安全、计费透明、交易可追溯，完成去中心化租赁全流程的合约规则设计与前端模拟实现。

### 2.2 前端 Web 技术开发

使用 HTML、CSS、JavaScript 搭建响应式 Bike3 界面，集成 ethers.js 实现钱包创建、导入、切换与模拟充值功能；开发首页数据统计、单车列表查询、订单管理、运营后台、链上日志查询等核心模块；实现租还车、故障上报、数据实时刷新等交互逻辑；基于 localStorage 完成链下数据持久化（模拟链上存储），搭配弹窗提示、状态反馈等优化用户体验，完成前端与模拟合约的全流程交互。

------

## 三、核心实验架构设计

### 3.1 整体架构（实验版）

采用「前端模拟合约 + localStorage 模拟链上存储」的轻量化实验架构，脱离真实以太坊网络，仅通过前端技术完成全流程模拟，核心分层如下：

|    层级    |                           实现内容                           |           实验核心目标           |
| :--------: | :----------------------------------------------------------: | :------------------------------: |
|   表现层   |       HTML5/CSS3（响应式布局）+ JavaScript（交互逻辑）       | 掌握 Bike3 界面开发与用户体验优化 |
|   交互层   | Ethers.js（钱包模拟）+ 自定义合约模拟函数（合约调用 / 事件监听） |    掌握前端与链上交互核心逻辑    |
| 业务逻辑层 |  前端模拟 Solidity 合约规则（权限控制、计费逻辑、押金管理）  |     掌握智能合约核心业务设计     |
|   数据层   | localStorage（模拟区块链账本）+ 本地日志（模拟链上交易记录） | 掌握链上存储与数据追溯的模拟方法 |

### 3.2 技术选型（实验版）

|   技术 / 工具   |  版本 / 说明   |                           实验用途                           |
| :-------------: | :------------: | :----------------------------------------------------------: |
|   HTML5/CSS3    |      原生      |     搭建响应式 Bike3 界面，实现绿色主题的共享单车系统 UI      |
| JavaScript ES6+ |      原生      |      实现前端交互、合约规则模拟、localStorage 数据管理       |
|    Ethers.js    |      v6.x      |   模拟钱包创建 / 导入 / 切换、余额管理、交易签名与模拟上链   |
|  localStorage   | 浏览器原生 API | 模拟区块链账本，存储单车状态、订单记录、用户信息、交易日志等核心数据 |
|   Bootstrap 5   |      可选      |    快速实现响应式布局，简化卡片、表单、弹窗等 UI 组件开发    |

------

## 四、智能合约（模拟）核心设计

### 4.1 核心数据结构（前端模拟 Solidity 结构体）

```
// 模拟Solidity单车结构体
class Bike {
    constructor(bikeId, deposit, pricePerMinute) {
        this.bikeId = bikeId;          // 单车唯一ID
        this.deposit = deposit;        // 押金金额（wei单位）
        this.pricePerMinute = pricePerMinute; // 每分钟骑行单价（wei）
        this.status = 1;               // 状态：0-不可用 1-可用 2-租用中 3-故障
        this.currentRider = "";        // 当前骑行用户钱包地址
        this.rentStartTime = 0;        // 租用开始时间戳
    }
}

// 模拟Solidity订单结构体
class Order {
    constructor(orderId, bikeId, rider) {
        this.orderId = orderId;        // 订单唯一ID
        this.bikeId = bikeId;          // 关联单车ID
        this.rider = rider;            // 骑行用户钱包地址
        this.startTime = Date.now();   // 租用开始时间
        this.endTime = 0;              // 归还结束时间
        this.totalCost = 0;            // 总骑行费用
        this.deposit = 0;              // 押金金额
        this.isCompleted = false;      // 订单是否完成
        this.txHash = "";              // 模拟交易哈希（随机生成）
    }
}

// 模拟合约全局状态
const ContractState = {
    owner: "",                // 管理员地址
    bikeCount: 0,            // 单车总数
    orderCount: 0,           // 订单总数
    totalIncome: 0,          // 平台总收入
    bikes: [],               // 单车列表（模拟mapping存储）
    orders: [],              // 订单列表（模拟mapping存储）
    userOrders: {},          // 用户订单映射（地址→订单ID列表）
    events: []               // 模拟链上事件日志
};
```

### 4.2 核心合约规则（前端模拟实现）

#### 4.2.1 权限控制（模拟 onlyOwner 修饰器）

```
// 模拟管理员权限校验
function onlyOwner(address) {
    if (address !== ContractState.owner) {
        throw new Error("Only owner can operate");
    }
}
```

#### 4.2.2 运营方核心功能（模拟合约函数）

```
// 1. 新增单车（管理员）
function addBike(deposit, pricePerMinute, operator) {
    onlyOwner(operator); // 权限校验
    ContractState.bikeCount++;
    const newBike = new Bike(ContractState.bikeCount, deposit, pricePerMinute);
    ContractState.bikes.push(newBike);
    // 模拟链上事件
    ContractState.events.push({
        type: "BikeAdded",
        bikeId: ContractState.bikeCount,
        deposit: deposit,
        pricePerMinute: pricePerMinute,
        timestamp: Date.now(),
        txHash: "0x" + Math.random().toString(16).substr(2, 64) // 模拟交易哈希
    });
    // 持久化到localStorage
    localStorage.setItem("contractState", JSON.stringify(ContractState));
    return newBike;
}

// 2. 单车状态修改（故障/修复）
function setBikeStatus(bikeId, newStatus, operator) {
    onlyOwner(operator);
    const bike = ContractState.bikes.find(b => b.bikeId === bikeId);
    if (!bike) throw new Error("Bike not exists");
    bike.status = newStatus;
    // 模拟链上事件
    ContractState.events.push({
        type: "BikeStatusChanged",
        bikeId: bikeId,
        newStatus: newStatus,
        timestamp: Date.now(),
        txHash: "0x" + Math.random().toString(16).substr(2, 64)
    });
    localStorage.setItem("contractState", JSON.stringify(ContractState));
    return bike;
}
```

#### 4.2.3 用户核心功能（模拟合约函数）

```
// 1. 租用单车（押金冻结）
function rentBike(bikeId, rider, deposit) {
    const bike = ContractState.bikes.find(b => b.bikeId === bikeId);
    // 校验逻辑
    if (!bike) throw new Error("Bike not exists");
    if (bike.status !== 1) throw new Error("Bike is not available");
    if (deposit !== bike.deposit) throw new Error("Deposit amount not match");
    
    // 冻结押金（模拟）+ 更新单车状态
    bike.status = 2;
    bike.currentRider = rider;
    bike.rentStartTime = Date.now();
    
    // 模拟链上事件
    const txHash = "0x" + Math.random().toString(16).substr(2, 64);
    ContractState.events.push({
        type: "BikeRented",
        bikeId: bikeId,
        rider: rider,
        startTime: Date.now(),
        txHash: txHash
    });
    localStorage.setItem("contractState", JSON.stringify(ContractState));
    return { success: true, txHash: txHash };
}

// 2. 归还单车（费用结算+押金退还）
function returnBike(bikeId, rider) {
    const bike = ContractState.bikes.find(b => b.bikeId === bikeId);
    // 校验逻辑
    if (!bike) throw new Error("Bike not exists");
    if (bike.currentRider !== rider) throw new Error("Not the rider of this bike");
    if (bike.status !== 2) throw new Error("Bike is not in rent");
    
    // 计费逻辑
    const rentDuration = Math.max(1, Math.floor((Date.now() - bike.rentStartTime) / 60000)); // 分钟（不足1分钟按1分钟算）
    const totalCost = rentDuration * bike.pricePerMinute;
    const refundAmount = bike.deposit - totalCost; // 剩余押金
    
    // 生成订单
    ContractState.orderCount++;
    const order = new Order(ContractState.orderCount, bikeId, rider);
    order.endTime = Date.now();
    order.totalCost = totalCost;
    order.deposit = bike.deposit;
    order.isCompleted = true;
    order.txHash = "0x" + Math.random().toString(16).substr(2, 64);
    ContractState.orders.push(order);
    
    // 维护用户订单列表
    if (!ContractState.userOrders[rider]) {
        ContractState.userOrders[rider] = [];
    }
    ContractState.userOrders[rider].push(ContractState.orderCount);
    
    // 更新平台收入
    ContractState.totalIncome += totalCost;
    
    // 重置单车状态
    bike.status = 1;
    bike.currentRider = "";
    bike.rentStartTime = 0;
    
    // 模拟链上事件
    ContractState.events.push({
        type: "BikeReturned",
        bikeId: bikeId,
        rider: rider,
        totalCost: totalCost,
        refundAmount: refundAmount,
        orderId: ContractState.orderCount,
        txHash: order.txHash,
        timestamp: Date.now()
    });
    
    // 持久化数据
    localStorage.setItem("contractState", JSON.stringify(ContractState));
    return { 
        success: true, 
        refundAmount: refundAmount, 
        totalCost: totalCost, 
        orderId: ContractState.orderCount,
        txHash: order.txHash
    };
}
```

------

## 五、前端 Web Bike3 开发实现

### 5.1 页面结构设计

```
共享单车区块链Bike3实验
├── index.html       // 单页面应用，通过Tab切换功能模块
├── css/
│   └── style.css    // 绿色主题样式，响应式布局
├── js/
│   ├── ethers.min.js    // Ethers.js核心库
│   ├── contract-mock.js // 模拟合约逻辑（核心）
│   ├── wallet-mock.js   // 模拟钱包创建/导入/切换
│   └── main.js          // 页面交互与数据渲染
└── assets/
    └── images/          // 图标、背景等静态资源
```

### 5.2 钱包模拟功能（基于 ethers.js）

```
// wallet-mock.js - 模拟钱包创建/导入/切换
// 1. 创建新钱包
async function createWallet() {
    const wallet = ethers.Wallet.createRandom();
    // 存储钱包信息到localStorage
    const wallets = JSON.parse(localStorage.getItem("wallets") || "[]");
    wallets.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
    });
    localStorage.setItem("wallets", JSON.stringify(wallets));
    // 设置当前钱包
    localStorage.setItem("currentWallet", wallet.address);
    return {
        address: wallet.address,
        mnemonic: wallet.mnemonic.phrase,
        privateKey: wallet.privateKey
    };
}

// 2. 切换钱包
function switchWallet(address) {
    const wallets = JSON.parse(localStorage.getItem("wallets") || "[]");
    const wallet = wallets.find(w => w.address === address);
    if (!wallet) throw new Error("Wallet not found");
    localStorage.setItem("currentWallet", address);
    // 模拟余额（随机生成测试ETH）
    const balance = (Math.random() * 10 + 0.1).toFixed(6);
    localStorage.setItem(`balance_${address}`, balance);
    return { address: address, balance: balance };
}

// 3. 模拟充值
function rechargeWallet(address, amount) {
    const currentBalance = parseFloat(localStorage.getItem(`balance_${address}`) || 0);
    const newBalance = (currentBalance + parseFloat(amount)).toFixed(6);
    localStorage.setItem(`balance_${address}`, newBalance);
    return newBalance;
}
```

### 5.3 核心页面模块开发

#### 5.3.1 首页（数据统计）

- 展示当前钱包地址、ETH 余额；
- 展示平台核心数据：单车总数、可用 / 租用中 / 故障数量、总订单数、总收入；
- 「连接钱包」「切换钱包」「充值」等核心操作按钮。

#### 5.3.2 单车列表页

- 渲染所有单车信息（ID、押金、单价、状态）；
- 筛选可用单车，提供「租用」按钮；
- 故障单车标记，支持用户上报故障（触发模拟合约事件）。

#### 5.3.3 订单管理页

- 渲染当前用户所有订单；
- 展示订单详情：单车 ID、租用 / 归还时间、骑行时长、费用、押金、交易哈希；
- 未完成订单（租用中）提供「归还」按钮。

#### 5.3.4 运营后台页（管理员）

- 「新增单车」表单（押金、单价输入）；
- 单车状态管理（故障标记 / 修复）；
- 平台参数配置（全局单价、押金规则）；
- 全平台数据统计（总收入、订单分布）。

#### 5.3.5 链上日志页（模拟）

- 渲染所有模拟链上事件（BikeAdded、BikeRented、BikeReturned 等）；
- 支持按交易哈希、事件类型筛选；
- 展示事件详情（时间戳、参数、发起地址）。

### 5.4 数据持久化（localStorage）

所有核心数据通过 localStorage 持久化，模拟区块链不可篡改特性（实验场景下通过前端逻辑限制手动修改）：

- `contractState`：模拟合约全局状态（单车、订单、事件）；
- `wallets`：用户创建 / 导入的钱包列表；
- `currentWallet`：当前激活的钱包地址；
- `balance_${address}`：各钱包的模拟 ETH 余额；
- `adminAddress`：预设的管理员钱包地址。

------

## 六、本地模拟实验实现方案

### 6.1 初始化实验环境

1. 页面首次加载时，自动初始化`contractState`（空状态）、`wallets`（空数组）；
2. 预设管理员地址：创建第一个钱包时，自动标记为管理员；
3. 初始化模拟数据：可选「生成测试数据」按钮，自动创建 10 辆测试单车、2 个测试用户、5 条测试订单。

### 6.2 核心实验流程（业务闭环）

#### 步骤 1：管理员添加单车

1. 切换到管理员钱包，进入「运营后台」；
2. 输入押金金额（如 0.1 ETH）、每分钟单价（如 0.001 ETH）；
3. 点击「新增单车」，触发`addBike`模拟合约函数，数据持久化到 localStorage，生成模拟交易哈希。

#### 步骤 2：用户租用单车

1. 切换到普通用户钱包，进入「单车列表」；
2. 筛选可用单车，点击「租用」；
3. 校验押金金额，冻结用户钱包对应金额（模拟），更新单车状态为「租用中」，生成租用事件日志。

#### 步骤 3：计时计费与归还

1. 租用后等待 N 分钟，进入「订单管理」页；
2. 对租用中订单点击「归还」，触发`returnBike`模拟合约函数；
3. 自动计算骑行费用，扣除费用后退还剩余押金，生成订单记录与归还事件日志。

#### 步骤 4：故障上报与修复

1. 用户在单车列表页对故障单车点击「上报故障」；
2. 管理员切换钱包后，在「运营后台」标记该单车为「故障」；
3. 修复完成后，管理员标记为「可用」，更新单车状态。

#### 步骤 5：数据统计与日志验证

1. 首页查看平台总收入、订单数、单车状态分布；
2. 进入「链上日志」页，查询所有操作的模拟交易哈希，验证数据可追溯性；
3. 查看 localStorage 数据，验证所有状态变更已持久化（模拟链上存储）。

### 6.3 实验验证方法

1. **数据不可篡改验证**：手动修改 localStorage 中的单车状态 / 订单数据，刷新页面后，前端自动校验数据完整性，恢复为合法数据（模拟区块链不可篡改）；
2. **权限控制验证**：普通用户尝试调用「新增单车」接口，触发权限校验失败，提示「仅管理员可操作」；
3. **计费准确性验证**：记录租用 / 归还时间，手动计算费用，对比前端自动结算结果，验证计费逻辑正确性；
4. **钱包交互验证**：切换不同钱包，验证订单数据仅展示当前钱包的订单，余额独立管理。

------

## 七、实验验收标准

1. **功能完整性**：完成管理员添加单车、用户租还车、故障管理、数据统计等所有核心功能，无流程断点；
2. **交互正确性**：钱包创建 / 切换 / 充值、合约调用（模拟）、数据渲染等交互逻辑无错误，提示信息准确；
3. **数据一致性**：localStorage 中存储的单车状态、订单记录、事件日志与页面展示数据完全一致；
4. **权限有效性**：管理员与普通用户的权限边界清晰，越权操作被有效拦截；
5. **业务闭环性**：从单车添加到费用结算的全流程可完整执行，数据可追溯、计费准确、押金退还正确。

------

## 八、实验扩展方向--暂不实现

1. 新增「优惠券」「会员体系」等扩展功能，丰富合约规则设计；
2. 接入真实 Sepolia 测试网，替换模拟合约为真实 Solidity 合约，对比本地模拟与真实链上执行的差异；
3. 开发移动端 H5 适配，验证 Bike3 跨端兼容性；
4. 新增 IPFS 集成，模拟链下存储单车图片等大文件。
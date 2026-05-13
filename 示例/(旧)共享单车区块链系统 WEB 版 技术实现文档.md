# 共享单车区块链系统 WEB 版 技术实现文档

**课程名称**：区块链技术及应用

**开发人员**：benzhubenzhu

**文档版本**：V1.0（纯前端 + 区块链实现，预留后端 / 数据库扩展接口）

**实现目标**：基于区块链实现共享单车租用、归还、支付、管理全流程业务，无需后端服务、无需数据库，所有核心业务逻辑与数据上链，同时预留后期后端与数据库的扩展接口。

------

## 一、项目概述

### 1.1 项目背景

本项目针对传统共享单车平台存在的平台中心化管控、数据易篡改、押金安全无保障、订单不透明等痛点，基于以太坊区块链技术，实现共享单车业务全流程上链，利用区块链不可篡改、去中心化、可追溯的特性，保障用户与平台的权益，实现业务透明化。

### 1.2 核心架构（当前版本）

采用**纯前端 + 区块链**的轻量化架构，无需后端服务、无需关系型数据库，浏览器通过 Web3.js 直接与区块链网络交互，智能合约承载所有核心业务逻辑，链上存储所有业务数据。

整体架构分层如下：

|    层级    |                实现内容                |                      扩展预留                       |
| :--------: | :------------------------------------: | :-------------------------------------------------: |
|   表现层   |  WEB 前端页面（HTML+CSS+JavaScript）   |           无改动，后期可无缝对接后端接口            |
|   交互层   | Web3.js/Ethers.js（前端 - 区块链交互） |     预留 API 封装层，后期可切换为 HTTP 接口调用     |
| 业务逻辑层 | Solidity 智能合约（以太坊测试网部署）  |          后期可将非核心逻辑下沉至后端服务           |
|   数据层   |         区块链账本（链上存储）         | 预留 MySQL 数据库表结构，后期可做数据备份与统计加速 |

### 1.3 页面功能对应（匹配示例效果图）

实现 6 个核心页面，完全匹配示例效果图的功能与布局：

1. **首页**：钱包余额展示、充值 / 切换功能、骑行 / 消费 / 钱包状态数据概览
2. **单车页面**：单车总数、可用、租用中、故障状态统计，单车列表与状态查询
3. **订单页面**：用户全部订单列表、订单详情查看，租用 / 归还订单上链记录
4. **钱包页面**：ETH 余额展示、充值、钱包切换、流水记录查询
5. **管理页面**：单车新增、骑行单价设置、单车状态管理、故障待处理、订单统计、总收入查看
6. **链上页面**：区块高度查询、交易哈希验证、链上数据溯源

------

## 二、需求分析

### 2.1 功能需求

#### 2.1.1 用户端核心功能

1. **钱包连接**：支持 MetaMask 钱包一键连接，地址与余额自动同步，未连接状态限制核心功能使用
2. **单车查询**：查看平台所有单车的实时状态（可用 / 租用中 / 故障），筛选可用单车
3. **租用与归还**：用户选择可用单车发起租用，系统自动扣除押金；骑行结束后发起归还，自动结算骑行费用，剩余押金原路退回
4. **订单管理**：查看用户历史所有订单，包含租用时间、归还时间、骑行时长、消费金额、订单上链哈希
5. **钱包管理**：查看钱包 ETH 余额、充值引导、钱包地址切换、交易流水查询

#### 2.1.2 管理端核心功能

1. **单车管理**：新增单车信息，设置押金金额、每分钟骑行单价，修改单车初始状态
2. **状态管控**：查看故障待处理单车，标记单车故障 / 修复状态，管理进行中订单
3. **数据统计**：查看平台总收入、总订单数、单车状态分布统计
4. **参数配置**：修改平台骑行单价、押金规则，配置全局业务参数

#### 2.1.3 链上功能

1. 所有单车状态、订单记录、支付交易、参数配置全部上链，不可篡改
2. 支持通过交易哈希、区块号查询链上原始数据，实现业务全流程可追溯

### 2.2 非功能需求

1. **易用性**：页面操作简洁，交互逻辑符合用户习惯，钱包连接、租用归还一键操作
2. **兼容性**：兼容 Chrome、Edge 等主流浏览器，适配 PC 端不同屏幕尺寸
3. **安全性**：所有业务逻辑通过智能合约实现，私钥由用户钱包保管，平台无法触碰用户资产
4. **可扩展性**：预留后端服务、数据库的接入接口，后期可无缝扩展，无需重构核心代码
5. **透明性**：所有交易与状态变更均有链上记录，可随时核验，杜绝暗箱操作

------

## 三、技术选型

### 3.1 前端技术栈

|   技术 / 框架   | 版本 / 说明 |                            用途                             |
| :-------------: | :---------: | :---------------------------------------------------------: |
|   HTML5/CSS3    |    原生     |      页面结构与样式实现，匹配示例效果图的绿色主题风格       |
| JavaScript ES6+ |    原生     |             页面交互逻辑、前端 - 区块链交互实现             |
|    Ethers.js    |    v6.x     | 前端与以太坊区块链、MetaMask 钱包交互的核心库（轻量、易用） |
|   Bootstrap 5   |    可选     |   快速实现响应式布局、卡片、表单等 UI 组件，简化页面开发    |

### 3.2 区块链技术栈

|   技术 / 框架   |  版本 / 说明   |                         用途                         |
| :-------------: | :------------: | :--------------------------------------------------: |
|    Solidity     |    ^0.8.20     |          智能合约开发语言，实现核心业务逻辑          |
| Ethereum 测试网 | Sepolia 测试网 |   智能合约部署与运行的区块链网络，免费获取测试 ETH   |
|    Remix IDE    |     在线版     | 智能合约编写、编译、部署、调试工具，无需本地搭建环境 |
|    MetaMask     | 浏览器插件钱包 |         用户身份管理、签名交易、钱包资产管理         |

### 3.3 预留扩展技术栈（后期后端 + 数据库）

|  技术 / 框架   |                      用途                      |
| :------------: | :--------------------------------------------: |
| SpringBoot 3.x |    后端服务开发，实现业务逻辑解耦、接口封装    |
|   MySQL 8.0    | 关系型数据库，存储用户信息、订单备份、统计数据 |
|  MyBatis-Plus  |         后端持久层框架，简化数据库操作         |
|    Knife4j     |        后端接口文档生成，方便前后端联调        |

------

## 四、核心区块链设计（智能合约）

### 4.1 智能合约核心职责

智能合约是本项目的业务核心，承载所有业务逻辑与数据存储，包括：

1. 单车全生命周期管理（新增、状态修改、删除）
2. 租用与归还的核心业务逻辑，押金锁定与退还
3. 骑行费用自动结算，资金转账处理
4. 订单记录上链存储，不可篡改
5. 平台管理员权限管控，参数配置管理

### 4.2 智能合约数据结构

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BikeSharing {
    // 管理员地址
    address public owner;

    // 单车结构体
    struct Bike {
        uint256 bikeId;          // 单车唯一ID
        uint256 deposit;          // 押金金额(wei)
        uint256 pricePerMinute;   // 每分钟骑行单价(wei)
        uint8 status;             // 状态：0-不可用 1-可用 2-租用中 3-故障
        address currentRider;     // 当前骑行用户地址
        uint256 rentStartTime;    // 租用开始时间戳
    }

    // 订单结构体
    struct Order {
        uint256 orderId;          // 订单唯一ID
        uint256 bikeId;           // 关联单车ID
        address rider;             // 骑行用户地址
        uint256 startTime;         // 开始时间
        uint256 endTime;           // 结束时间
        uint256 totalCost;         // 总费用
        uint256 deposit;           // 押金金额
        bool isCompleted;          // 订单是否完成
    }

    // 全局变量
    uint256 public bikeCount;     // 单车总数
    uint256 public orderCount;    // 订单总数
    uint256 public totalIncome;   // 平台总收入

    // 映射存储
    mapping(uint256 => Bike) public bikes;       // 单车ID -> 单车信息
    mapping(uint256 => Order) public orders;     // 订单ID -> 订单信息
    mapping(address => uint256[]) public userOrders; // 用户地址 -> 订单ID列表

    // 事件定义（用于前端监听、链上追溯）
    event BikeAdded(uint256 indexed bikeId, uint256 deposit, uint256 pricePerMinute);
    event BikeRented(uint256 indexed bikeId, address indexed rider, uint256 startTime);
    event BikeReturned(uint256 indexed bikeId, address indexed rider, uint256 totalCost, uint256 orderId);
    event BikeStatusChanged(uint256 indexed bikeId, uint8 newStatus);
    event OrderCompleted(uint256 indexed orderId);

    // 权限修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can operate");
        _;
    }

    // 构造函数
    constructor() {
        owner = msg.sender;
    }
}
```

### 4.3 核心业务函数实现

```
// ============== 管理员功能 ==============
// 1. 新增单车
function addBike(uint256 deposit, uint256 pricePerMinute) external onlyOwner {
    bikeCount++;
    bikes[bikeCount] = Bike({
        bikeId: bikeCount,
        deposit: deposit,
        pricePerMinute: pricePerMinute,
        status: 1, // 初始状态：可用
        currentRider: address(0),
        rentStartTime: 0
    });
    emit BikeAdded(bikeCount, deposit, pricePerMinute);
}

// 2. 修改单车状态
function setBikeStatus(uint256 bikeId, uint8 newStatus) external onlyOwner {
    require(bikeId > 0 && bikeId <= bikeCount, "Bike not exists");
    bikes[bikeId].status = newStatus;
    emit BikeStatusChanged(bikeId, newStatus);
}

// ============== 用户核心功能 ==============
// 1. 租用单车
function rentBike(uint256 bikeId) external payable {
    Bike storage bike = bikes[bikeId];
    // 校验：单车存在、状态可用、押金金额正确
    require(bikeId > 0 && bikeId <= bikeCount, "Bike not exists");
    require(bike.status == 1, "Bike is not available");
    require(msg.value == bike.deposit, "Deposit amount not match");
    
    // 更新单车状态
    bike.status = 2;
    bike.currentRider = msg.sender;
    bike.rentStartTime = block.timestamp;

    emit BikeRented(bikeId, msg.sender, block.timestamp);
}

// 2. 归还单车
function returnBike(uint256 bikeId) external {
    Bike storage bike = bikes[bikeId];
    // 校验：单车存在、当前调用者是骑行用户、状态为租用中
    require(bikeId > 0 && bikeId <= bikeCount, "Bike not exists");
    require(bike.currentRider == msg.sender, "Not the rider of this bike");
    require(bike.status == 2, "Bike is not in rent");

    // 计算骑行时长与费用
    uint256 rentDuration = (block.timestamp - bike.rentStartTime) / 60; // 分钟
    if (rentDuration == 0) rentDuration = 1; // 不足1分钟按1分钟计算
    uint256 totalCost = rentDuration * bike.pricePerMinute;
    require(totalCost <= bike.deposit, "Cost exceeds deposit");

    // 退还剩余押金
    uint256 refundAmount = bike.deposit - totalCost;
    if (refundAmount > 0) {
        payable(msg.sender).transfer(refundAmount);
    }

    // 累计平台收入
    totalIncome += totalCost;

    // 生成订单
    orderCount++;
    orders[orderCount] = Order({
        orderId: orderCount,
        bikeId: bikeId,
        rider: msg.sender,
        startTime: bike.rentStartTime,
        endTime: block.timestamp,
        totalCost: totalCost,
        deposit: bike.deposit,
        isCompleted: true
    });
    userOrders[msg.sender].push(orderCount);

    // 更新单车状态
    bike.status = 1;
    bike.currentRider = address(0);
    bike.rentStartTime = 0;

    emit BikeReturned(bikeId, msg.sender, totalCost, orderCount);
    emit OrderCompleted(orderCount);
}

// ============== 数据查询功能 ==============
// 1. 获取用户所有订单ID
function getUserOrders(address user) external view returns (uint256[] memory) {
    return userOrders[user];
}

// 2. 获取所有单车列表
function getAllBikes() external view returns (Bike[] memory) {
    Bike[] memory bikeList = new Bike[](bikeCount);
    for (uint256 i = 1; i <= bikeCount; i++) {
        bikeList[i-1] = bikes[i];
    }
    return bikeList;
}
```

### 4.4 合约部署说明

1. 打开 Remix IDE 在线版，新建`BikeSharing.sol`文件，粘贴上述合约代码
2. 选择 Solidity 编译器 ^0.8.20，点击编译合约
3. 切换到部署选项，环境选择「Injected Provider - MetaMask」，连接 Sepolia 测试网钱包
4. 点击部署，钱包确认交易，等待区块确认后，记录**合约地址**与**合约 ABI**，用于前端对接。

------

## 五、前端实现

### 5.1 页面结构

```
共享单车区块链系统
├── index.html       // 主页面，所有模块整合在单页面中，通过tab切换显示
├── css/
│   └── style.css    // 全局样式，绿色主题，匹配示例效果图
├── js/
│   ├── ethers.min.js // Ethers.js库文件
│   ├── contract.js  // 合约地址、ABI配置，合约实例化
│   └── main.js      // 页面交互、钱包连接、合约调用核心逻辑
└── assets/
    └── images/      // 图标、背景等静态资源
```

### 5.2 核心前端逻辑实现

#### 5.2.1 合约配置（contract.js）

```
// 合约配置（部署后替换为实际的合约地址与ABI）
const contractAddress = "0xYourDeployedContractAddress"; // 部署后的合约地址
const contractABI = [
    // 此处粘贴Remix编译后生成的合约ABI
    "function addBike(uint256 deposit, uint256 pricePerMinute) external onlyOwner",
    "function rentBike(uint256 bikeId) external payable",
    "function returnBike(uint256 bikeId) external",
    "function getAllBikes() external view returns (tuple[] memory)",
    "function getUserOrders(address user) external view returns (uint256[] memory)",
    "function orders(uint256) external view returns (tuple)",
    "function bikeCount() external view returns (uint256)",
    "function totalIncome() external view returns (uint256)",
    "event BikeRented(uint256 indexed bikeId, address indexed rider, uint256 startTime)",
    // 剩余ABI完整粘贴
];

// 全局变量
let provider;
let signer;
let contract;
let currentAccount;
```

#### 5.2.2 钱包连接核心逻辑（main.js）

```
// 连接MetaMask钱包
async function connectWallet() {
    // 检查是否安装MetaMask
    if (!window.ethereum) {
        alert("请先安装MetaMask钱包插件！");
        return;
    }

    try {
        // 请求连接钱包
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        currentAccount = accounts[0];
        
        // 初始化provider、signer、合约实例
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        // 更新页面钱包信息
        document.getElementById("walletAddress").innerText = currentAccount.slice(0, 6) + "..." + currentAccount.slice(-4);
        const balance = await provider.getBalance(currentAccount);
        document.getElementById("walletBalance").innerText = ethers.formatEther(balance).slice(0, 6) + " ETH";
        
        // 切换连接状态
        document.getElementById("connectStatus").innerText = "已连接";
        document.getElementById("connectStatus").style.color = "#52c41a";

        // 加载页面数据
        loadBikeData();
        loadUserOrders();
        loadDashboardData();

    } catch (error) {
        console.error("钱包连接失败：", error);
        alert("钱包连接失败：" + error.message);
    }
}

// 监听钱包账户切换
window.ethereum.on("accountsChanged", function (accounts) {
    if (accounts.length > 0) {
        connectWallet();
    } else {
        // 重置页面状态
        currentAccount = null;
        document.getElementById("walletAddress").innerText = "未连接";
        document.getElementById("walletBalance").innerText = "0.0000 ETH";
        document.getElementById("connectStatus").innerText = "未连接";
    }
});
```

#### 5.2.3 核心业务调用示例

```
// 租用单车
async function rentBike(bikeId, deposit) {
    if (!contract || !currentAccount) {
        alert("请先连接钱包！");
        return;
    }

    try {
        // 调用合约租用函数，附带押金转账
        const tx = await contract.rentBike(bikeId, {
            value: ethers.parseEther(deposit.toString())
        });
        alert("租用请求已提交，等待区块确认...");
        await tx.wait();
        alert("单车租用成功！");
        // 刷新单车数据
        loadBikeData();
    } catch (error) {
        console.error("租用失败：", error);
        alert("租用失败：" + error.message);
    }
}

// 归还单车
async function returnBike(bikeId) {
    if (!contract || !currentAccount) {
        alert("请先连接钱包！");
        return;
    }

    try {
        const tx = await contract.returnBike(bikeId);
        alert("归还请求已提交，等待区块确认...");
        await tx.wait();
        alert("单车归还成功，费用已结算，剩余押金已退回！");
        // 刷新数据
        loadBikeData();
        loadUserOrders();
        loadDashboardData();
    } catch (error) {
        console.error("归还失败：", error);
        alert("归还失败：" + error.message);
    }
}

// 管理员新增单车
async function addBike() {
    if (!contract || !currentAccount) {
        alert("请先连接管理员钱包！");
        return;
    }

    const deposit = document.getElementById("depositInput").value;
    const pricePerMinute = document.getElementById("priceInput").value;

    try {
        const tx = await contract.addBike(
            ethers.parseEther(deposit),
            ethers.parseEther(pricePerMinute)
        );
        alert("新增单车请求已提交，等待区块确认...");
        await tx.wait();
        alert("单车新增成功！");
        loadBikeData();
    } catch (error) {
        console.error("新增失败：", error);
        alert("新增失败：" + error.message);
    }
}
```

### 5.3 页面样式说明

1. **主题配色**：主色调采用示例效果图的深绿 / 草绿（`#28a745`），辅助色为白色、浅灰，按钮、导航栏、卡片均采用绿色主题，与示例效果完全匹配
2. **布局结构**：顶部固定导航栏，包含 6 个 tab 切换按钮；主体内容区为卡片式布局，每个功能模块采用白色圆角卡片，带轻微阴影，符合现代 WEB 设计规范
3. **响应式适配**：采用弹性布局，适配不同 PC 屏幕尺寸，保证在不同分辨率下布局不错乱

------

## 六、后期扩展预留设计（后端 + 数据库）

### 6.1 前端预留 API 封装层

将当前直接调用合约的逻辑，统一封装到`api/`目录下，分为**链上 API**和**后端 API**两套封装，后期切换时无需修改页面逻辑，仅需修改封装层的实现。

示例封装结构：

```
// api/bikeApi.js
// 链上实现（当前版本）
export const getBikeList = async () => {
    return await contract.getAllBikes();
}

// 后端实现（后期切换，仅需修改此处）
// export const getBikeList = async () => {
//     return await axios.get("/api/bike/list");
// }

export const addBike = async (deposit, pricePerMinute) => {
    return await contract.addBike(deposit, pricePerMinute);
}

export const rentBike = async (bikeId, deposit) => {
    return await contract.rentBike(bikeId, { value: deposit });
}
```

### 6.2 后端接口预留规范（RESTful）

提前定义后期后端接口的规范，保证与前端封装层完全匹配：

|       接口地址       | 请求方式 |     接口说明     |        请求参数         |       返回值       |
| :------------------: | :------: | :--------------: | :---------------------: | :----------------: |
| /api/wallet/connect  |   POST   |   钱包地址登录   |      walletAddress      |  用户信息、token   |
|    /api/bike/list    |   GET    |   获取单车列表   |           无            |    单车信息数组    |
|    /api/bike/add     |   POST   |     新增单车     | deposit、pricePerMinute |      新增结果      |
|    /api/bike/rent    |   POST   |     租用单车     | bikeId、deposit、userId |      租用结果      |
|   /api/bike/return   |   POST   |     归还单车     |     bikeId、userId      | 结算结果、订单信息 |
| /api/order/user/list |   GET    | 获取用户订单列表 |         userId          |      订单数组      |
| /api/stat/dashboard  |   GET    | 获取首页统计数据 |           无            |    平台统计数据    |

### 6.3 数据库表结构预留设计

提前设计 MySQL 数据库表结构，后期可直接使用，与链上数据完全对应：

#### 1. 用户表（sys_user）

|     字段名     |                类型                |          说明          |
| :------------: | :--------------------------------: | :--------------------: |
|       id       | BIGINT PRIMARY KEY AUTO_INCREMENT  |        用户 ID         |
| wallet_address |        VARCHAR(100) UNIQUE         |        钱包地址        |
|    nickname    |            VARCHAR(50)             |        用户昵称        |
|     avatar     |            VARCHAR(255)            |        头像地址        |
|     status     |         TINYINT DEFAULT 1          | 状态 0 - 禁用 1 - 正常 |
|  create_time   | DATETIME DEFAULT CURRENT_TIMESTAMP |        创建时间        |

#### 2. 单车表（bike_info）

|      字段名      |                类型                |                     说明                     |
| :--------------: | :--------------------------------: | :------------------------------------------: |
|        id        | BIGINT PRIMARY KEY AUTO_INCREMENT  |                   单车 ID                    |
|     deposit      |           DECIMAL(20,8)            |                押金金额 (ETH)                |
| price_per_minute |           DECIMAL(20,8)            |               每分钟单价 (ETH)               |
|      status      |         TINYINT DEFAULT 1          | 状态 0 - 不可用 1 - 可用 2 - 租用中 3 - 故障 |
|  current_rider   |            VARCHAR(100)            |             当前骑行用户钱包地址             |
| rent_start_time  |              DATETIME              |                 租用开始时间                 |
| contract_bike_id |               BIGINT               |                 链上单车 ID                  |
|   create_time    | DATETIME DEFAULT CURRENT_TIMESTAMP |                   创建时间                   |

#### 3. 订单表（bike_order）

|    字段名    |                类型                |              说明              |
| :----------: | :--------------------------------: | :----------------------------: |
|      id      | BIGINT PRIMARY KEY AUTO_INCREMENT  |            订单 ID             |
|   order_no   |         VARCHAR(50) UNIQUE         |            订单编号            |
|   bike_id    |               BIGINT               |          关联单车 ID           |
| user_address |            VARCHAR(100)            |          用户钱包地址          |
|  start_time  |              DATETIME              |          租用开始时间          |
|   end_time   |              DATETIME              |          租用结束时间          |
|  total_cost  |           DECIMAL(20,8)            |          总费用 (ETH)          |
|   deposit    |           DECIMAL(20,8)            |         押金金额 (ETH)         |
| is_completed |         TINYINT DEFAULT 0          | 是否完成 0 - 进行中 1 - 已完成 |
|   tx_hash    |            VARCHAR(100)            |          链上交易哈希          |
| create_time  | DATETIME DEFAULT CURRENT_TIMESTAMP |            创建时间            |

#### 4. 平台配置表（sys_config）

|    字段名    |                             类型                             |   说明   |
| :----------: | :----------------------------------------------------------: | :------: |
|      id      |              BIGINT PRIMARY KEY AUTO_INCREMENT               | 配置 ID  |
|  config_key  |                      VARCHAR(50) UNIQUE                      |  配置键  |
| config_value |                         VARCHAR(255)                         |  配置值  |
|    remark    |                         VARCHAR(255)                         | 配置说明 |
| update_time  | DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

------

## 七、部署与运行步骤

### 7.1 环境准备

1. 安装 Chrome 浏览器，安装 MetaMask 钱包插件，创建钱包并切换到 Sepolia 测试网
2. 通过 Sepolia 测试网水龙头领取测试 ETH，用于合约部署与交易测试
3. 准备 Remix IDE 在线环境，用于合约编译与部署

### 7.2 合约部署

1. 在 Remix IDE 中编写并编译智能合约
2. 连接 MetaMask 钱包，将合约部署到 Sepolia 测试网
3. 记录合约地址与 ABI，替换前端`contract.js`中的对应内容

### 7.3 前端运行

1. 将前端代码保存到本地，目录结构保持一致
2. 直接用 Chrome 浏览器打开`index.html`文件，无需搭建任何服务器
3. 点击页面「连接钱包」按钮，授权 MetaMask 钱包连接，即可使用全部功能

### 7.4 可选部署（公网访问）

可将前端代码部署到 GitHub Pages、Vercel、Netlify 等免费静态网站托管平台，实现公网访问，无需购买服务器。

------

## 八、测试说明

### 8.1 功能测试点

| 测试模块 |                  测试内容                   |                        预期结果                        |
| :------: | :-----------------------------------------: | :----------------------------------------------------: |
| 钱包模块 | MetaMask 钱包连接、地址与余额同步、账户切换 |        连接成功，信息正确同步，切换账户自动更新        |
| 管理模块 |   管理员新增单车、修改单车状态、参数配置    |        交易上链成功，单车信息正确更新，状态同步        |
| 单车模块 |    单车列表查询、状态筛选、可用单车查看     |          单车信息与链上数据一致，状态正确显示          |
| 租用归还 |    用户租用单车、归还单车、费用自动结算     | 交易上链成功，单车状态正确变更，押金自动退还，订单生成 |
| 订单模块 |         用户订单查询、订单详情查看          |            订单信息与链上数据一致，记录完整            |
| 链上验证 |         交易哈希查询、区块数据溯源          |      可在以太坊浏览器中查到对应交易，数据不可篡改      |

### 8.2 区块链特性验证

1. 数据不可篡改：尝试修改前端页面展示的订单数据，刷新后数据自动从链上拉取，恢复为真实数据
2. 可追溯性：每一笔租用、归还、新增单车操作，都有对应的链上交易记录，可通过哈希永久查询
3. 去中心化：关闭本地所有服务，仅保留浏览器与网络，页面依然可以正常连接区块链，使用所有核心功能

------

## 九、项目扩展方向

1. **后端与数据库接入**：基于预留的接口与表结构，开发 SpringBoot 后端服务，实现用户体系、数据统计、缓存加速等功能，将非核心业务逻辑从合约中解耦
2. **功能扩展**：新增故障上报、用户评价、优惠券、会员体系、骑行轨迹记录等功能，丰富业务场景
3. **多端适配**：开发微信小程序、移动端 H5 版本，适配手机端使用场景
4. **性能优化**：采用 IPFS 存储静态资源，优化链上数据查询逻辑，降低 Gas 费消耗
5. **主网上线**：合约审计后，部署到以太坊主网，实现正式商用
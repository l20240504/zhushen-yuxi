# 诸神愚戏 · 信仰游戏

一个基于 Node.js 的信仰游戏排行榜系统，包含用户注册审核、双排行榜、管理员后台等功能。

## 快速开始

### 方式一：双击启动
1. 双击 `start.bat`
2. 浏览器自动打开 http://localhost:3000

### 方式二：命令行启动
```bash
cd D:\诸神愚戏
node server.js
```
然后在浏览器访问 http://localhost:3000

## 默认管理员

- **用户名**: 管理员
- **密码**: xxxxxxx
- **请登录后立即在管理后台修改密码**

## 功能说明

### 用户端
- **注册**: 填写用户名、密码、确认密码，提交后等待管理员审核
- **登录**: 审核通过后即可登录，支持7天免重复登录
- **排行榜**: 查看两个榜单
  - 登神之路
  - 觐见之梯

### 管理员端
- **注册审核**: 批准或拒绝新用户注册申请
- **分数管理**: 分别调整每个玩家的登神之路和觐见之梯分数
- **权限管理**: 设置玩家为管理员或纯看榜用户
- **用户管理**: 查看所有用户、删除用户
- **修改密码**: 修改管理员密码

## 技术架构

- **后端**: Node.js (零外部依赖，仅使用内置模块)
- **数据存储**: JSON 文件
- **密码加密**: crypto.scrypt
- **会话管理**: Token + Cookie
- **前端**: 原生 HTML/CSS/JS

## 文件结构

```
诸神愚戏/
├── server.js              # 主入口：路由分发 + 静态文件服务
├── data.json              # 数据存储(自动生成)
├── start.bat              # 一键启动脚本
├── README.md              # 说明文档
├── src/                    # 后端模块(拆包)
│   ├── database.js         # 数据层：加载/保存/初始化
│   ├── security.js         # 安全层：密码哈希/会话管理/鉴权
│   ├── httpUtils.js        # HTTP工具：请求解析/响应/Cookie
│   ├── authRoutes.js       # 认证路由：注册/登录/登出/改密
│   ├── rankingRoutes.js    # 排行榜路由：双榜数据
│   └── adminRoutes.js      # 管理路由：审核/调分/权限/删除
└── public/                 # 前端静态资源
    ├── index.html          # 登录/注册页
    ├── dashboard.html      # 排行榜页
    ├── admin.html          # 管理后台
    ├── protocol.html       # 用户协议页
    ├── css/
    │   └── style.css       # 全局样式(神话主题)
    └── js/
        ├── auth.js          # 登录/注册逻辑
        ├── dashboard.js     # 排行榜逻辑
        └── admin.js         # 管理后台逻辑
```

## API 接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/register | 用户注册 | 公开 |
| POST | /api/login | 用户登录 | 公开 |
| POST | /api/logout | 退出登录 | 已登录 |
| GET  | /api/session | 查询会话状态 | 公开 |
| GET  | /api/rankings | 获取排行榜 | 已登录 |
| GET  | /api/admin/pending | 获取待审核列表 | 管理员 |
| POST | /api/admin/approve | 批准注册 | 管理员 |
| POST | /api/admin/reject | 拒绝注册 | 管理员 |
| POST | /api/admin/score | 修改分数 | 管理员 |
| POST | /api/admin/role | 修改权限 | 管理员 |
| GET  | /api/admin/users | 获取所有用户 | 管理员 |
| POST | /api/admin/delete | 删除用户 | 管理员 |
| POST | /api/change-password | 修改密码 | 已登录 |

## 安全说明

- 所有密码使用 scrypt 加密存储，不可逆
- 管理员密码为系统机密，仅以加密形式存储
- 会话令牌使用 32 字节随机数生成
- 管理员不可删除自己或修改自己的权限

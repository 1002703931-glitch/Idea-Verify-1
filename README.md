# Idea Verify - 需求验证平台

> 聚合 Reddit、GitHub 和 Twitter 上的真实用户需求，帮助产品经理、创业者和开发者发现真实市场需求

## 项目概述

Idea Verify 是一个需求验证平台，通过收集和分析来自多个社交平台（Reddit、GitHub、Twitter）的用户讨论，帮助产品团队：

- 发现真实的用户需求和痛点
- 了解用户对产品的反馈
- 识别市场机会和竞争情况
- 基于数据驱动产品决策

## 技术栈

### 后端
- Python 3.10+
- FastAPI - Web 框架
- SQLAlchemy + AsyncPG - 异步 ORM
- PostgreSQL - 主数据库
- PRAW - Reddit API 客户端
- PyGitHub - GitHub API 客户端
- Tweepy - Twitter API 客户端
- VADER - 情感分析

### 前端
- React 18 + TypeScript
- Vite - 构建工具
- Tailwind CSS - 样式框架
- Zustand - 状态管理
- React Router - 路由管理
- Axios - HTTP 客户端
- Lucide React - 图标库

## 项目结构

```
idea-verify/
├── backend/                  # 后端服务
│   ├── app/
│   │   ├── api/             # API 路由
│   │   │   ├── search.py    # 搜索 API
│   │   │   ├── collect.py   # 数据收集 API
│   │   │   └── stats.py     # 统计 API
│   │   ├── collectors/       # 数据收集器
│   │   │   ├── reddit_collector.py
│   │   │   ├── github_collector.py
│   │   │   └── twitter_collector.py
│   │   ├── models/          # 数据库模型
│   │   ├── schemas.py       # Pydantic 模型
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库连接
│   │   └── main.py          # 应用入口
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── DemandCard.tsx
│   │   │   ├── ResultsList.tsx
│   │   │   └── Pagination.tsx
│   │   ├── lib/            # 工具函数和 API 客户端
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── store/           # 状态管理
│   │   ├── types/           # TypeScript 类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── database/
    └── schema.sql           # 数据库 schema
```

## 快速开始

### 前置要求

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis (可选，用于缓存)

### 1. 配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入以下配置：

```env
# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/idea_verify

# API 密钥配置
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=IdeaVerify/1.0 by /u/your_username

GITHUB_TOKEN=your_github_token

# Twitter API (可选)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# JWT 配置
SECRET_KEY=your_secret_key
```

获取 API 密钥：
- **Reddit**: https://www.reddit.com/prefs/apps
- **GitHub**: https://github.com/settings/tokens
- **Twitter**: https://developer.twitter.com/ (需要付费)

#### 前端配置

```bash
cd frontend
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:8000/api
```

### 2. 初始化数据库

```bash
# 创建数据库
createdb idea_verify

# 执行 schema
psql idea_verify < database/schema.sql
```

### 3. 启动后端服务

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --reload
```

后端服务将在 http://localhost:8000 启动

API 文档: http://localhost:8000/docs

### 4. 启动前端应用

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:5173 启动

## 核心功能

### 1. 数据收集

从三个平台收集用户需求数据：

- **Reddit**: 收集特定 subreddit 中的功能请求、抱怨帖
- **GitHub**: 收集 issues 中的功能请求、bug 报告
- **Twitter**: 收集产品相关的推文、功能请求

### 2. 智能搜索

- 自然语言搜索
- 布尔搜索（AND/OR/NOT）
- 多维度筛选（平台、情感、时间范围等）
- 多种排序方式

### 3. 内容分析

- 自动分类（功能请求、bug报告、抱怨、赞美）
- 情感分析（积极、消极、中性）
- 产品识别
- 标签提取

### 4. 数据统计

- 平台分布统计
- 需求趋势分析
- 热门产品排行
- 热门标签统计

## API 端点

### 搜索

```bash
# 搜索需求数据
POST /api/search/
Body: { "query": "Notion offline mode", "page": 1 }

# 获取搜索建议
GET /api/search/suggest?query=notion

# 获取热门产品
GET /api/search/products

# 获取热门标签
GET /api/search/tags
```

### 数据收集

```bash
# 从 Reddit 收集数据
POST /api/collect/reddit?query="Notion offline"

# 从 GitHub 收集数据
POST /api/collect/github?repo=facebook/react

# 从 Twitter 收集数据
POST /api/collect/twitter?query="Notion feature"
```

### 统计

```bash
# 获取总体统计
GET /api/stats/

# 获取趋势数据
GET /api/stats/trends?days=30

# 获取情感分布
GET /api/stats/sentiment
```

## 数据库 Schema

主要表结构：

- **demands**: 存储收集到的需求数据
- **user_bookmarks**: 用户收藏
- **search_history**: 搜索历史
- **trending_topics**: 热门趋势

完整 schema 请参考 `database/schema.sql`

## 开发路线图

### 第一阶段 (MVP) ✅
- [x] 基本搜索功能
- [x] Reddit 数据收集
- [x] GitHub 数据收集
- [x] 简单的列表展示
- [x] 基础筛选功能

### 第二阶段 ✅
- [x] Twitter 数据收集（需要付费 API）
- [x] 用户账户和收藏功能
- [x] 数据可视化图表
- [x] 导出功能（CSV/报告）

### 第三阶段
- [ ] 智能分类和标签
- [ ] 趋势预测功能
- [ ] 自定义数据源添加
- [ ] 团队协作功能

## Twitter API 配置说明

### 重要提示

Twitter API (现已更名为 X API) 需要付费订阅才能访问完整功能。以下是相关配置说明：

### API 订阅层级

1. **Free 层级（免费）**
   - 每月 50 万条推文（仅近 7 天）
   - 仅支持 v2 API 的部分端点
   - 不支持搜索 API
   - **不适合此项目的数据收集需求**

2. **Basic 层级 (~$100/月)**
   - 每月 1 万条推文（可搜索 30 天历史）
   - 支持搜索 API
   - 适合小规模数据收集

3. **Pro 层级 (~$5,000/月)**
   - 完整搜索功能
   - 可访问历史推文
   - 适合大规模数据收集

### 配置步骤

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)
2. 创建开发者账户
3. 创建 App 并获取 API 密钥
4. 在 `.env` 文件中配置：

```env
# Twitter API 配置
TWITTER_BEARER_TOKEN=your_bearer_token_here
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
```

### 替代方案

如果不想使用付费的 Twitter API，可以考虑以下替代方案：

- **第三方数据服务**: 使用提供历史 Twitter 数据的服务
- **数据提供商**: Brandwatch, Meltwater 等企业级解决方案
- **公开数据集**: 部分研究机构提供公开的 Twitter 数据集
- **忽略 Twitter 数据**: 仅使用 Reddit 和 GitHub 数据源

### 当前状态

Twitter 数据收集功能已在代码中实现 (`backend/app/collectors/twitter_collector.py`)，但需要有效的 Twitter API 密钥才能正常工作。如果没有配置有效的 API 密钥，该功能将被禁用。

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

**Idea Verify** - 让真实用户需求驱动产品决策

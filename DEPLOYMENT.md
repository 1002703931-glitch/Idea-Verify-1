# Idea Verify 云端部署指南

本指南将帮助您将 Idea Verify 项目部署到云服务器。

## 部署架构

- **前端**: 部署到 Vercel (免费，自动化部署)
- **后端**: 部署到 Render (免费层级)
- **数据库**: 使用 Render 提供的 PostgreSQL

---

## 前提条件

1. GitHub 账户 (用于代码托管)
2. Vercel 账户 (vercel.com)
3. Render 账户 (render.com)
4. 本地安装 Node.js 18+ 和 npm

---

## 第一部分：将代码推送到 GitHub

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建一个新的仓库，命名为 `idea-verify`
3. 不要初始化 README（因为我们已经有了）

### 2. 推送代码到 GitHub

```bash
cd /Users/wangdingcheng/idea-verify

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/idea-verify.git

# 推送代码
git push -u origin main
```

---

## 第二部分：部署后端到 Render

### 1. 在 Render 创建数据库

1. 访问 https://dashboard.render.com
2. 点击 "New +" -> "PostgreSQL"
3. 选择区域（推荐 Oregon）
4. 数据库名称: `idea-verify-db`
5. 点击 "Create Database"

创建后，复制以下信息：
- **Internal Database URL** (格式: `postgresql://postgres:...@.../idea-verify`)

### 2. 在 Render 创建 Web 服务

1. 点击 "New +" -> "Web Service"
2. 连接您的 GitHub 仓库
3. 配置部署设置：

| 设置 | 值 |
|------|-----|
| Name | idea-verify-backend |
| Region | Oregon |
| Root Directory | `backend` |
| Runtime | Python 3.10+ |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### 3. 配置环境变量

在 Render 的 Environment 标签页中添加以下环境变量：

| 变量名 | 值 |
|---------|-----|
| `DATABASE_URL` | 从步骤 1 复制的 Internal Database URL |
| `SECRET_KEY` | 生成随机密钥（使用下面的命令） |
| `DEBUG` | `False` |
| `CORS_ORIGINS` | `https://your-frontend-url.vercel.app` |

生成 SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. 获取后端 URL

部署完成后，Render 会提供一个类似这样的 URL:
```
https://idea-verify-backend.onrender.com
```

记下这个 URL，稍后配置前端时需要用到。

---

## 第三部分：部署前端到 Vercel

### 1. 在 Vercel 创建项目

1. 访问 https://vercel.com/new
2. 导入您的 GitHub 仓库
3. 配置项目设置：

| 设置 | 值 |
|------|-----|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 2. 配置环境变量

在 Vercel 的 Environment Variables 中添加：

| 变量名 | 值 |
|---------|-----|
| `VITE_API_URL` | `https://idea-verify-backend.onrender.com/api` |

注意：请将 URL 替换为您实际的 Render 后端 URL。

### 3. 部署

点击 "Deploy" 按钮。Vercel 会自动构建和部署。

### 4. 获取前端 URL

部署完成后，Vercel 会提供一个类似这样的 URL:
```
https://idea-verify.vercel.app
```

---

## 第四部分：配置 CORS

后端部署后，需要在 Render 中更新 CORS 配置：

1. 进入 Render 控制台 -> idea-verify-backend
2. 点击 "Environment" 标签
3. 更新 `CORS_ORIGINS` 变量：
   ```
   https://your-frontend-url.vercel.app,http://localhost:5173
   ```

---

## 验证部署

### 1. 检查后端健康状态

访问后端的健康检查端点:
```
https://idea-verify-backend.onrender.com/health
```

应该返回类似这样的 JSON:
```json
{
  "status": "healthy",
  "app": "Idea Verify",
  "version": "1.0.0",
  "environment": "production"
}
```

### 2. 访问前端应用

访问前端 URL，测试以下功能：

| 功能 | 验证方式 |
|------|----------|
| 搜索功能 | 输入关键词并搜索 |
| 收藏按钮 | 登录后点击收藏，验证状态变化 |
| 图表展示 | 访问统计页面，查看图表 |
| 导出功能 | 验证 CSV/JSON 导出 |

---

## 故障排查

### 后端部署失败

1. 检查 Render 日志 (Logs 标签)
2. 确认所有环境变量已正确设置
3. 验证 `DATABASE_URL` 格式正确

### 前端无法连接后端

1. 检查 Vercel 环境变量 `VITE_API_URL`
2. 确认后端 CORS 配置包含前端域名
3. 检查浏览器控制台的网络请求

### 收藏功能不工作

1. 确认用户已登录
2. 检查 token 是否正确存储
3. 查看 Network 标签中的 API 请求

---

## 快速部署命令总结

```bash
# 1. 推送到 GitHub
cd /Users/wangdingcheng/idea-verify
git remote add origin https://github.com/YOUR_USERNAME/idea-verify.git
git push -u origin main

# 2. 在 Render 创建数据库和 Web 服务（手动操作）

# 3. 在 Vercel 创建项目（手动操作）

# 4. 配置环境变量（在各自平台控制台中）
```

---

## 部署完成后

部署成功后，您将拥有：

| 服务 | URL |
|------|-----|
| 前端 | `https://idea-verify.vercel.app` |
| 后端 API | `https://idea-verify-backend.onrender.com` |
| 数据库 | Render PostgreSQL |

请将实际的 URL 填入上述表格，并共享给团队使用。

# Wechatbot 后端基础设施文档

> 最后更新: 2026-05-23
> 状态: 运行中 (Aiven MySQL)

## 架构概览

```
微信小程序 ─── Render (新加坡) ─── Aiven MySQL (新加坡 do-sgp)
     │              │
     │              ├── OpenRouter API (AI 对话)
     │              ├── Azure TTS (语音合成)
     │              ├── PDF Service
     │              └── OCI 对象存储 (图片/文件)
```

## 数据库: Aiven MySQL

| 项目 | 值 |
|------|-----|
| 服务名 | wechatbot-mysql |
| 计划 | free-1-1gb |
| 区域 | do-sgp (DigitalOcean 新加坡) |
| MySQL 版本 | 8.4.8 |
| 规格 | 1GB RAM / 1GB 磁盘 |
| Host | wechatbot-mysql-wechatbot.g.aivencloud.com |
| Port | 16817 |
| 数据库 | defaultdb |
| SSL | 必需 (rejectUnauthorized: false) |

### 用户

| 用户名 | 用途 |
|--------|------|
| avnadmin | 服务端主连接 (Render 使用) |
| wechatbot_app | 应用只读用户 (备用) |

### 表结构

| 表名 | 说明 |
|------|------|
| users | 用户表 (openid 主键, deleted 软删除) |
| jp_lesson_scores | 日语课程得分 (外键关联 users) |
| ai_order_merchants | AI 点菜商家 |

## 部署: Render

| 项目 | 值 |
|------|-----|
| 服务名 | wechatbot-api-sg |
| 服务 ID | srv-d879k937uimc73c6f410 |
| 区域 | 新加坡 |
| 运行时 | Node.js 20 |
| 启动命令 | node index.js |
| 公网 URL | https://wechatbot-api-sg.onrender.com |

### 环境变量

| 变量 | 值 | 来源 |
|------|-----|------|
| MYSQL_HOST | wechatbot-mysql-wechatbot.g.aivencloud.com | Render Dashboard |
| MYSQL_PORT | 16817 | render.yaml |
| MYSQL_USER | avnadmin | render.yaml |
| MYSQL_PASSWORD | (密钥) | Render Dashboard |
| MYSQL_DATABASE | defaultdb | render.yaml |
| MYSQL_SSL | true | render.yaml |
| WECHAT_APP_ID | wx2510f82943d7741e | render.yaml |
| WECHAT_APP_SECRET | (密钥) | Render Dashboard |
| OPENROUTER_KEY | (密钥) | Render Dashboard |

### 防休眠

`index.js` 内置每 30 分钟 `SELECT 1` 心跳，防止 Render 免费实例休眠。

## OCI 对象存储

| 项目 | 值 |
|------|-----|
| 区域 | ap-singapore-1 |
| Namespace | axbfkubuntlt |
| Bucket | wechatbot-demo |
| 公网 URL | https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o |

### 对象清单

| 路径 | 用途 |
|------|------|
| dishes/dish-*.jpg | 演示菜品图片 |
| menus/demo-menus.json | AI 点菜演示商家数据（远程分发，可随时更新） |

## AI 点菜模块

### 演示数据加载策略（三级降级）

```
缓存 (wx.Storage) → OCI 后台下载 → 本地内置兜底
```

| 优先级 | 来源 | 时机 |
|------|------|------|
| 1 | `wx.getStorageSync('demo-menus-cache')` | OCI 首次下载成功后写入 |
| 2 | OCI `menus/demo-menus.json` | 每次 `getData()` 调用后台静默拉取 |
| 3 | `demo-menus.js` 内置 `localData` | OCI 从未成功下载时的兜底 |

首次启动: 同步返回本地数据，后台拉 OCI JSON 写入缓存。后续启动直读缓存，后台静默刷新。

`demo-menus.js` 导出 API:

| 函数 | 说明 |
|------|------|
| `getData()` | 获取完整 demo 数据（缓存优先，触发后台下载） |
| `getMerchant(merchantId)` | 获取指定演示商家的完整菜单 |
| `getMerchantList()` | 获取演示商家列表（轻量，不含菜品详情） |
| `tryFetchInBackground()` | 手动触发后台下载 |

### 新建商家 → 复制演示菜单

打开新建商家弹窗后，可勾选「从演示商家复制菜单（含图片）」，选择目标演示商家，确认后自动将其全部菜品复制到新商家。适用于快速创建带图带菜单的测试商家。

## 迁移历史

### 2026-05-23: OCI MySQL → Aiven MySQL

**原因**: OCI 新加坡区 VM 持续缺容量 (Out of host capacity)，MySQL HeatWave 仅内网 IP 无法公网访问。

**变更**:
- 数据库从 OCI MySQL HeatWave (10.0.0.147:3306/wechatbot) 迁移至 Aiven MySQL (16817/defaultdb)
- 用户名从 admin 改为 avnadmin
- SSL 从可选变为必需
- 表结构与数据已重建

## 健康检查

```bash
# 服务健康
curl https://wechatbot-api-sg.onrender.com/api/health
# → {"status":"ok","service":"wechatbot-api"}

# 数据库初始化状态
curl https://wechatbot-api-sg.onrender.com/api/init
# → {"status":"ok","message":"Tables ready"}
```
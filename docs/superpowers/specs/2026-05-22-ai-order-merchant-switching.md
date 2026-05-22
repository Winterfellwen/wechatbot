# AI 点菜 - 多租户商家切换系统

## 目的
实现用户隔离的商家管理功能：每个用户拥有独立的商家列表，可切换/创建/删除商家，商家数据按用户隔离存储。

## 数据模型

```sql
CREATE TABLE IF NOT EXISTS ai_order_merchants (
  id VARCHAR(64) PRIMARY KEY,
  openid VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) DEFAULT '',
  type ENUM('demo','custom') DEFAULT 'custom',
  createdAt DATETIME DEFAULT NOW(),
  INDEX idx_openid (openid)
);
```

- `id` — 唯一标识，demo 商家用 `demo-{originalId}`，自定义商家用 `usr_{openid}_{timestamp}`
- `type = 'demo'` — 菜单数据来自服务端 `demo-menus.js`
- `type = 'custom'` — 菜单数据来自 OCI `menus/{openid}/{merchantId}.json`

## 服务端 API

### 新增端点（全部 requireAuth）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/ai-order/merchants | 获取当前用户商家列表（自动播种 demo） |
| POST | /api/ai-order/merchants | 创建商家 { name, description? } |
| DELETE | /api/ai-order/merchants/:id | 删除商家（校验 openid） |

### 修改现有端点

- `GET /api/ai-order/menu/list` — 非 demo 商家时 userId = req.user.openid
- `POST /api/ai-order/menu/save` — 使用 req.user.openid 作为 OCI 路径

## 前端变更

### index 页：卡片式商家列表 + 创建/删除
### merchant/customer 页：读取当前商家

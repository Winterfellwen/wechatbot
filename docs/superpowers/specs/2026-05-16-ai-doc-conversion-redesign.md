# AI 文档转换服务重构设计

## 日期
2026-05-16

## 概述

重构 doc-ai-service，放弃 HTML 中间格式，采用 Anthropic docx/pdf skills 模式：
- 从源文件直接提取内容（文本、图片、表格）
- AI 输出结构化 JSON
- 用 `docx-js` 构建 DOCX，用 `reportlab` 构建 PDF
- 无中间格式损失，文本可选，文件更小

## 架构

### PDF → DOCX 流程

```
PDF → pdf-service 提取内容 → AI 生成 docx-js JSON → docx-js 构建 → DOCX
```

1. **提取**：`pdfplumber` 提取文本/表格，`pdfimages` 提取图片
2. **AI 处理**：AI 接收结构化内容，输出 docx-js JSON
3. **构建**：`docx-js` 按 Anthropic skill 规则生成 DOCX

### DOCX → PDF 流程

```
DOCX → 提取内容 → AI 生成优化 JSON → reportlab 构建 → PDF
```

1. **提取**：`pandoc` 提取文本，解包 DOCX 提取图片
2. **AI 处理**：AI 优化内容，输出结构化 JSON
3. **构建**：`reportlab` 直接生成 PDF（保留文本可选）

## AI 输出格式（统一 JSON Schema）

```typescript
interface DocumentContent {
  title: string;
  sections: Section[];
}

type Section = 
  | { type: "heading"; level: 1|2|3|4; text: string }
  | { type: "paragraph"; children: TextRun[]; alignment?: "left"|"center"|"right"|"justify" }
  | { type: "image"; index: number; width: number; height: number; alignment?: "left"|"center"|"right" }
  | { type: "table"; headers?: string[]; rows: string[][]; columnWidths?: number[] }
  | { type: "list"; items: string[]; ordered: boolean };

interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}
```

## 组件设计

### 1. 内容提取器

#### PDF 提取器 (`pdf-service/extractors/pdf.py`)
- 使用 `pdfplumber` 提取文本和表格（保留布局）
- 使用 `pdfimages` (poppler) 提取图片（JPEG/PNG）
- 输出结构化 JSON

#### DOCX 提取器 (`doc-ai-service/extractors/docx.js`)
- 使用 `pandoc` 提取文本
- 解包 DOCX 提取图片（`word/media/`）
- 输出结构化 JSON

### 2. AI 处理器 (`ai.js`)

**改动**：
- 输出格式从 HTML 改为结构化 JSON
- 添加 JSON Schema 说明
- 添加 docx-js/reportlab 格式规则

### 3. DOCX 构建器 (`assemblers/docx.js`)

**完全重写**：
- 废弃 `html-to-docx`
- 使用 `docx` npm 库
- 遵循 Anthropic docx skill 规则：
  - 页面尺寸：US Letter (12240 x 15840 DXA)
  - 默认字体：Arial
  - 表格：DXA 宽度，双宽度设置
  - 列表：LevelFormat.BULLET/DECIMAL
  - 图片：ImageRun，type 必填

### 4. PDF 构建器 (`pdf-service/assemblers/pdf.py`)

**新建**：
- 使用 `reportlab` 直接生成 PDF
- 支持文本、表格、图片
- 保留文本可选

### 5. 图片注入器 (`lib/image-injector.js`)

**新建**：
- 接收 AI JSON 和提取的图片数组
- 将 `ImageSection` 的 `index` 替换为实际图片 Buffer
- 返回包含图片数据的完整 JSON

## 错误处理

### AI JSON 解析失败
1. 尝试修复常见 JSON 错误（尾随逗号、未转义引号）
2. 如果修复失败，回退到纯文本转换（无 AI 优化）
3. 记录错误日志

### 图片缺失
1. 如果 JSON 引用不存在的图片索引，跳过该图片
2. 记录警告日志

### 提取失败
1. 如果 pdfplumber/pandoc 提取失败，回退到基础文本提取
2. 记录错误日志

## 测试策略

1. **单元测试**：
   - JSON 解析器
   - DOCX 构建器
   - PDF 构建器
   - 图片注入器

2. **集成测试**：
   - PDF → DOCX 完整流程
   - DOCX → PDF 完整流程
   - 图片保留验证

3. **质量测试**：
   - 文本可选（DOCX→PDF）
   - 图片数量匹配
   - 文件大小合理

## 迁移计划

1. 保留现有 HTML 管线作为回退
2. 新 JSON 管线默认启用
3. 通过配置开关切换

## 依赖

- `docx` npm 库（已有）
- `pdfplumber`（Python）
- `reportlab`（Python）
- `pandoc`（CLI）
- `pdfimages` (poppler)（CLI）

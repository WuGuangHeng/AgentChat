---
name: Doubao-ImageGen
description: Generate images for free using Doubao (豆包) via Edge CDP. Supports any text-to-image prompt. Connects to Edge browser via Chrome DevTools Protocol to drive doubao.com/image generation. No API key needed. Outputs 4 full-resolution images (2048x2048, 5-10MB each).
---

# 豆包图像生成 — Free Image Generation via Edge CDP

> **核心功能**: 通过 Edge CDP 驱动豆包网页版，免费生成图片
> **前置条件**: Edge 已启动 CDP 模式（端口 9222），豆包已登录

## ⚠️ 强制规则 — 调用即执行

**本 skill 被调用时，必须执行 `node` 命令生图。禁止只解释用法而不执行，禁止用模型自身知识替代实际生图。**

### 1. 首要动作契约
读完本 SKILL.md 之后的**下一个工具调用**必须是：

```bash
node ~/.claude/skills/Doubao-ImageGen/index.js "<你的提示词>"
```

### 2. 输出要求
- 执行后，图片保存在 `doubao-outputs/` 目录
- 告知用户图片已生成，给出文件路径
- 如果用户要求发送图片，使用 MEDIA: 语法

### 3. 注意事项
- 每次生成约需 40-50 秒
- 每次生成 4 张图片
- 每小时最多调用 20 次，间隔至少 15 秒
- 生成的图片带豆包"AI生成"水印（左上角）

## 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| prompt | 图像描述，中文最佳 | "水墨风格的中国山水画" |
| --output | 输出目录（可选） | --output ./my-images |

## 示例

```bash
node ~/.claude/skills/Doubao-ImageGen/index.js "一只可爱的橘猫，水彩风格"
node ~/.claude/skills/Doubao-ImageGen/index.js "赛博朋克城市夜景，霓虹灯"
node ~/.claude/skills/Doubao-ImageGen/index.js "浮世绘风格，富士山与樱花"
```

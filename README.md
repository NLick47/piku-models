# piku-models

Piku 的远程模型列表。改 `catalog/models.source.json`，push 后 CI 自动加密发到 `catalog` 分支，app 启动时拉取并替换内置列表

## 格式

```json
{
  "version": 8,
  "sourceId": "piku-official",
  "defaults": {
    "roles": {
      "text": "siliconflow-qwen3-8b",
      "image": "gemini-image-manga"
    },
    "params": { "temperature": 0.2 },
    "prompts": { "single": { "zh": "..." }, "batch": { "zh": "..." }, "novel": { "zh": "..." } }
  },
  "models": [
    {
      "id": "siliconflow-qwen3-8b",
      "label": "Qwen3-8B",
      "baseUrl": "https://api.siliconflow.cn/v1",
      "model": "Qwen/Qwen3-8B",
      "free": true,
      "verified": true,
      "keyEnv": "SILICONFLOW_API_KEY",
      "hint": "",
      "roles": ["text"]
    },
    {
      "id": "gemini-image-manga",
      "label": "Gemini Image",
      "baseUrlEnv": "GEMINI_MANGA_BASE_URL",
      "model": "gemini-image",
      "free": false,
      "verified": true,
      "keyEnv": "GEMINI_MANGA_KEY",
      "hint": "图像级漫画翻译（擦除原文→翻译→写回）",
      "roles": ["image"]
    }
  ]
}
```

几个字段说明：

- `defaults.roles`：各场景的默认模型 id。app 里 text（标题、简介、标签）和 novel（小说正文）是两条独立通道，各有自己的选择器
- `prompts.novel`：小说正文分块流式翻译的系统提示词（zh/en/ja）。缺省时 app 用内置兜底。注意 ⟦上文原句⟧/⟦上文译文⟧/⟦待翻正文⟧ 是 app 写死的结构标记（回声剥离依赖），改措辞可以、改标记不行
- `sourceId`：源的身份证，标明这份列表是谁的（官方是 `piku-official`，fork 请写自己的名字）。app 把它显示在刷新结果里，用户一眼看出当前用的是谁的源。可选——不写也能用，只是界面上不标来源

## Fork

两种分发方式：

**明文**：把 JSON 放到任意静态托管，使用者只填地址。最简单，但文件里的 key 谁都能看到，只适合完全公开的免费模型

**加密（推荐）**：自己生成 `CATALOG_ENC_KEY` 加密发布；把目录地址和解密密钥一起发给使用者，key 不落在托管文件里。使用者在 app「模型列表来源」里两栏都填上即可

具体步骤：

1. 改 `catalog/models.source.json`：换成自己的模型和提示词，并把根级的 `sourceId` 改成自己的名字（别沿用 `piku-official`，否则用户分不清用的是谁的列表）；
2. 配 secrets：`CATALOG_ENC_KEY`（64 位 hex，`openssl rand -hex 32` 生成）加每个 `keyEnv` 对应的 key。注意这个密钥要和使用者 app 里填的一致——官方 APK 内置的是官方密钥，所以你加密发布的目录必须把你的密钥随地址一起发给使用者；
3. push（`catalog` 分支除外）自动发布，使用者把你的目录 URL（和密钥）填进 app 即可

## 本地调试

加密脚本的流程：读 `models.source.json` → 按各模型的 `keyEnv` 从环境变量取 key 注入为 `apiKey` → 整体 AES-256-GCM 加密 → 写出 `catalog/models.enc.json`。根级的 `version` / `sourceId` / `defaults` 原样带出（脚本里是显式构造发布对象，加新根级字段时记得一起带上）。CI 发布时跑的就是这个脚本，本地跑一般只为了验证格式：

```bash
CATALOG_ENC_KEY=<64hex> ZHIPU_API_KEY=... node scripts/encrypt-catalog.mjs
```

脚本会检查 `defaults.roles` 指向的 id 是否存在。联调时也可以跳过加密，直接把明文 JSON 地址填进 app 的自定义目录地址

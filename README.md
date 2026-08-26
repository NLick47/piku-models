# piku-models

Piku 的远程模型列表。改 `catalog/models.source.json`，push 后 CI 自动加密发到 `catalog` 分支，app 启动时拉取并替换内置列表

## 格式

```json
{
  "version": 3,
  "defaults": {
    "roles": {
      "text": "siliconflow-qwen3-8b",
      "novel": "scnet-deepseek-novel"
    },
    "params": { "temperature": 0.2 },
    "prompts": { "single": { "zh": "..." }, "batch": { "zh": "..." } }
  },
  "models": [
    {
      "id": "scnet-deepseek-novel",
      "label": "DeepSeek-V4-Flash-0731",
      "baseUrl": "https://api.scnet.cn/api/llm/v1",
      "model": "DeepSeek-V4-Flash-0731-Event",
      "free": false,
      "verified": true,
      "keyEnv": "SCNET_API_KEY",
      "hint": "小说正文默认",
      "roles": ["novel"]
    }
  ]
}
```

几个字段说明：

- `defaults.roles`：各场景的默认模型 id。app 里 text（标题、简介、标签）和 novel（小说正文）是两条独立通道，各有自己的选择器。
- `models[].roles`：这个模型服务哪些场景，不填默认 text。可以自己发明新场景名，旧版 app 不认识的会忽略。
- `keyEnv`：key 放在 GitHub secrets 里，发布时按这个名字注入，源文件里不出现明文 key。

注意：小说通道找不到可用模型时正文会保留原文（不会偷偷借用 text 模型），所以 `defaults.roles.novel` 要指向一个带 key 的条目。翻译失败重试也只在同场景内换模型。

## Fork

1. 改 `catalog/models.source.json`：换成自己的模型和提示词；
2. 配 secrets：`CATALOG_ENC_KEY`（64 位 hex，`openssl rand -hex 32` 生成）加每个 `keyEnv` 对应的 key。APK 构建时要注入同一个 `CATALOG_ENC_KEY`（环境变量 `PIKU_CATALOG_ENC_KEY` 或 local.properties 的 `piku.catalog.encKey`），不然解不开；
3. push（`catalog` 分支除外）自动发布，app 目录地址改成你的 URL 即可。

## 本地调试

```bash
CATALOG_ENC_KEY=<64hex> ZHIPU_API_KEY=... node scripts/encrypt-catalog.mjs
```

输出到 `catalog/models.enc.json`，脚本会检查 `defaults.roles` 指向的 id 是否存在。联调时也可以直接把明文 JSON 地址填进 app，跳过解密。

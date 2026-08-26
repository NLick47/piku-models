import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const encKey = process.env.CATALOG_ENC_KEY?.trim();
if (!encKey || !/^[0-9a-fA-F]{64}$/.test(encKey)) {
  fail("CATALOG_ENC_KEY must be 64 hex chars");
}

const source = JSON.parse(readFileSync(join(root, "catalog/models.source.json"), "utf8"));
if (!Array.isArray(source.models) || source.models.length === 0) {
  fail("models.source.json has no models");
}

const models = source.models.map((entry) => {
  const { keyEnv, ...rest } = entry;
  if (!rest.id || !rest.baseUrl || !rest.model) {
    fail(`${rest.id ?? "(no id)"}: missing id/baseUrl/model`);
  }
  const apiKey = process.env[keyEnv]?.trim();
  if (!apiKey) fail(`${rest.id}: env ${keyEnv} not set`);
  return { ...rest, apiKey };
});

// defaults.roles 指向的模型 id 必须存在（role 名可自由自定义，指向不存在的 id 才算配置错误）
const ids = new Set(models.map((m) => m.id));
for (const [role, target] of Object.entries(source.defaults?.roles ?? {})) {
  if (!ids.has(target)) fail(`defaults.roles["${role}"] -> "${target}": no such model id`);
}

const plaintext = JSON.stringify({ version: source.version ?? 3, defaults: source.defaults ?? null, models });

const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", Buffer.from(encKey, "hex"), iv);
const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
const envelope = JSON.stringify({
  alg: "AES-256-GCM",
  iv: iv.toString("base64"),
  data: data.toString("base64"),
});

mkdirSync(join(root, "catalog"), { recursive: true });
writeFileSync(join(root, "catalog/models.enc.json"), envelope);
console.log(`ok: ${models.length} models -> catalog/models.enc.json (${plaintext.length} bytes)`);

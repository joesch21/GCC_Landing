import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

test("agents page describes the live bounded Genesis I surface", () => {
  const html = fs.readFileSync(path.join(root, "public", "agents.html"), "utf8");

  assert.match(html, /Genesis I/i);
  assert.match(html, /10 GCC per objectively valid submission/i);
  assert.match(html, /100 GCC nominal cap/i);
  assert.match(html, /BNB Smart Chain mainnet/i);
  assert.match(html, /Live settlement is enabled/i);
  assert.match(html, /no genuine Genesis I award has been paid yet/i);
  assert.match(html, /\.well-known\/gcc-agent\.json/);
  assert.match(html, /tenders\/GCC-GENESIS-001\.json/);

  assert.doesNotMatch(html, /This public release does not .* move GCC/i);
  assert.doesNotMatch(html, /POST \/api\/agent\/settlement.*Not active in V1/i);
});

test("wallet connection UI does not expose the connected account address", () => {
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");

  assert.match(app, /setConnectButtonState\("Wallet connected", true\)/);
  assert.doesNotMatch(app, /console\.log\("Connected wallet:"/);
  assert.doesNotMatch(app, /setConnectButtonState\(shortAddress\(accounts\[0\]\), true\)/);
});

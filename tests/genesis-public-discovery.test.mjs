import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

test("Genesis I public discovery points to the frozen mainnet tender", () => {
  const discovery = JSON.parse(
    fs.readFileSync(path.join(root, "public", ".well-known", "gcc-agent.json"), "utf8")
  );
  const tender = JSON.parse(
    fs.readFileSync(path.join(root, "public", "tenders", "GCC-GENESIS-001.json"), "utf8")
  );

  assert.equal(discovery.status, "OPEN");
  assert.equal(discovery.network.chain_id, 56);
  assert.equal(discovery.opens_at, "2026-09-18T04:00:00.000Z");
  assert.equal(discovery.submission_closes_at, "2026-10-02T04:00:00.000Z");
  assert.equal(discovery.settlement_deadline, "2026-10-09T04:00:00.000Z");

  const entry = discovery.tenders.find(
    (item) => item.tender_id === "GCC-GENESIS-001"
  );
  assert.ok(entry);
  assert.equal(entry.status, "OPEN");
  assert.equal(
    entry.tender_url,
    "https://www.goldcondor.info/tenders/GCC-GENESIS-001.json"
  );
  assert.equal(
    entry.tender_hash_keccak256,
    "0x68192a6a21ff53afa698edd0573a6a27f2294e9a8de3a20f41d102e0be3ab86d"
  );

  assert.equal(tender.tender_id, "GCC-GENESIS-001");
  assert.equal(tender.network.chain_id, 56);
  assert.equal(tender.economics.total_budget_gcc, "100");
  assert.equal(tender.economics.reward_per_valid_submission_gcc, "10");
  assert.equal(tender.economics.max_paid_submissions, 10);
  assert.equal(
    tender.task.discovery_url,
    "https://www.goldcondor.info/.well-known/gcc-agent.json"
  );
  assert.equal(tender.task.tender_url, entry.tender_url);
});

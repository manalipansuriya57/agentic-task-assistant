import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EvalTask, ToolName } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOC_TOPICS = ["refund", "pgvector", "retry", "sla"] as const;
const DB_LOOKUPS: Array<{ table: "users" | "orders"; id: string }> = [
  { table: "users", id: "u_100" },
  { table: "orders", id: "o_55" },
];

function tasks(): EvalTask[] {
  const out: EvalTask[] = [];
  let n = 1;

  for (const topic of DOC_TOPICS) {
    for (let i = 0; i < 8; i++) {
      out.push({
        id: `t${String(n).padStart(3, "0")}`,
        instruction: `Find the ${topic} policy in the documentation (variant ${i + 1}).`,
        expectedTools: ["search_docs"],
        mustIncludeArgs: { search_docs: [topic === "retry" ? "retries" : topic] },
        successKeywords: [topic === "retry" ? "3 times" : topic],
      });
      n += 1;
    }
  }

  for (const lookup of DB_LOOKUPS) {
    for (let i = 0; i < 10; i++) {
      out.push({
        id: `t${String(n).padStart(3, "0")}`,
        instruction: `Lookup ${lookup.table} ${lookup.id} in the database (case ${i + 1}).`,
        expectedTools: ["query_db"],
        mustIncludeArgs: { query_db: [lookup.table, lookup.id] },
      });
      n += 1;
    }
  }

  for (let i = 0; i < 12; i++) {
    out.push({
      id: `t${String(n).padStart(3, "0")}`,
      instruction: `Draft an email to riya@example.com about order follow-up #${i + 1}.`,
      expectedTools: ["draft_email"],
      mustIncludeArgs: { draft_email: ["riya@example.com"] },
    });
    n += 1;
  }

  // multi-tool combos
  for (let i = 0; i < 20; i++) {
    const topic = DOC_TOPICS[i % DOC_TOPICS.length];
    const lookup = DB_LOOKUPS[i % DB_LOOKUPS.length];
    const expected: ToolName[] = ["search_docs", "query_db", "draft_email"];
    out.push({
      id: `t${String(n).padStart(3, "0")}`,
      instruction:
        `Read ${topic} docs, fetch ${lookup.table} ${lookup.id}, ` +
        `and email riya@example.com a short summary (combo ${i + 1}).`,
      expectedTools: expected,
      mustIncludeArgs: {
        search_docs: [topic === "retry" ? "retries" : topic],
        query_db: [lookup.table, lookup.id],
        draft_email: ["riya@example.com"],
      },
    });
    n += 1;
  }

  // padding to clear 100 with pure search variants
  while (out.length < 108) {
    const topic = DOC_TOPICS[out.length % DOC_TOPICS.length];
    out.push({
      id: `t${String(n).padStart(3, "0")}`,
      instruction: `Documentation check: ${topic} details request ${out.length}.`,
      expectedTools: ["search_docs"],
      mustIncludeArgs: { search_docs: [topic === "retry" ? "retries" : topic] },
    });
    n += 1;
  }

  return out;
}

const file = path.join(__dirname, "tasks.json");
fs.writeFileSync(file, JSON.stringify(tasks(), null, 2));
console.log(`Wrote ${tasks().length} tasks to ${file}`);

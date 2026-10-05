import type { ToolCall, ToolName, ToolResult } from "../types.js";

const DOCS: Record<string, string> = {
  refund: "Annual refunds within 14 days if <20% modules completed.",
  pgvector: "Prefer pgvector when already on Postgres.",
  retries: "Agent retries failed tool calls up to 3 times.",
  sla: "Support SLA is 1 business day for Pro plans.",
};

const DB: Record<string, Record<string, unknown>> = {
  users: { "u_100": { name: "Riya", plan: "Pro", email: "riya@example.com" } },
  orders: { "o_55": { userId: "u_100", total: 2499, status: "paid" } },
};

export const TOOL_NAMES: ToolName[] = ["search_docs", "query_db", "draft_email"];

export function runTool(call: ToolCall): ToolResult {
  switch (call.name) {
    case "search_docs": {
      const q = String(call.args.query ?? "").toLowerCase();
      const hits = Object.entries(DOCS)
        .filter(([k, v]) => q.includes(k) || v.toLowerCase().includes(q) || q.split(/\s+/).some((w) => v.toLowerCase().includes(w)))
        .map(([k, v]) => `${k}: ${v}`);
      return {
        ok: hits.length > 0,
        output: hits.length ? hits.join("\n") : "No docs matched.",
      };
    }
    case "query_db": {
      const table = String(call.args.table ?? "");
      const id = String(call.args.id ?? "");
      const row = DB[table]?.[id];
      return row
        ? { ok: true, output: JSON.stringify(row) }
        : { ok: false, output: `Row not found: ${table}/${id}` };
    }
    case "draft_email": {
      const to = String(call.args.to ?? "");
      const subject = String(call.args.subject ?? "");
      const body = String(call.args.body ?? "");
      if (!to || !subject || !body) {
        return { ok: false, output: "draft_email requires to, subject, body" };
      }
      return {
        ok: true,
        output: `DRAFT\nTo: ${to}\nSubject: ${subject}\n\n${body}`,
      };
    }
    default:
      return { ok: false, output: `Unknown tool` };
  }
}

export const TOOL_SPECS = [
  {
    name: "search_docs" as const,
    description: "Search internal documentation by keyword query",
    parameters: { query: "string" },
  },
  {
    name: "query_db" as const,
    description: "Fetch a row from users or orders by id",
    parameters: { table: "users|orders", id: "string" },
  },
  {
    name: "draft_email" as const,
    description: "Create an email draft",
    parameters: { to: "string", subject: "string", body: "string" },
  },
];

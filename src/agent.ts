import type { AgentResult, StepLog, ToolCall, ToolName } from "./types.js";
import { runTool, TOOL_NAMES } from "./tools/index.js";

/**
 * Deterministic mock planner for offline demos + eval.
 * Heuristics map instruction keywords to tool sequences.
 */
export function mockPlan(instruction: string): ToolCall[] {
  const text = instruction.toLowerCase();
  const calls: ToolCall[] = [];

  if (/refund|pgvector|retry|sla|docs|documentation|policy/.test(text)) {
    let query = "policy";
    if (text.includes("refund")) query = "refund";
    else if (text.includes("pgvector") || text.includes("postgres")) query = "pgvector";
    else if (text.includes("retry")) query = "retries";
    else if (text.includes("sla")) query = "sla";
    calls.push({ name: "search_docs", args: { query } });
  }

  if (/users?\s+u_|orders?\s+o_|\bu_\d+\b|\bo_\d+\b|lookup|customer|fetch|database|\bdb\b/.test(text)) {
    const userMatch = text.match(/\bu_(\d+)\b/);
    const orderMatch = text.match(/\bo_(\d+)\b/);
    if (orderMatch) {
      calls.push({ name: "query_db", args: { table: "orders", id: `o_${orderMatch[1]}` } });
    } else if (userMatch) {
      calls.push({ name: "query_db", args: { table: "users", id: `u_${userMatch[1]}` } });
    } else if (/orders?/.test(text)) {
      calls.push({ name: "query_db", args: { table: "orders", id: "o_55" } });
    } else {
      calls.push({ name: "query_db", args: { table: "users", id: "u_100" } });
    }
  }

  if (/email|notify|message|write to/.test(text)) {
    const toMatch = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
    calls.push({
      name: "draft_email",
      args: {
        to: toMatch?.[0] ?? "riya@example.com",
        subject: "Follow-up",
        body: `Regarding: ${instruction.slice(0, 120)}`,
      },
    });
  }

  if (calls.length === 0) {
    calls.push({ name: "search_docs", args: { query: instruction.slice(0, 40) } });
  }

  return calls;
}

export async function runAgent(
  instruction: string,
  options: { maxSteps?: number; planner?: (i: string) => ToolCall[] } = {}
): Promise<AgentResult> {
  const maxSteps = options.maxSteps ?? 6;
  const planner = options.planner ?? mockPlan;
  const planned = planner(instruction);
  const steps: StepLog[] = [];
  const observations: string[] = [];

  for (let i = 0; i < Math.min(planned.length, maxSteps); i++) {
    const tool = planned[i];
    if (!TOOL_NAMES.includes(tool.name as ToolName)) {
      return {
        success: false,
        finalAnswer: "",
        steps,
        error: `invalid_tool:${tool.name}`,
      };
    }
    const result = runTool(tool);
    observations.push(result.output);
    steps.push({
      step: i + 1,
      thought: `Call ${tool.name}`,
      tool,
      observation: result.output,
    });
    if (!result.ok && tool.name !== "search_docs") {
      return {
        success: false,
        finalAnswer: result.output,
        steps,
        error: `tool_error:${tool.name}`,
      };
    }
  }

  const finalAnswer = observations.filter(Boolean).join("\n---\n") || "No tool output.";
  return { success: true, finalAnswer, steps };
}

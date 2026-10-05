import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent } from "../src/agent.js";
import type { EvalTask, ToolName } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TaskScore {
  id: string;
  success: boolean;
  errors: string[];
}

function scoreTask(task: EvalTask, used: ToolName[], argsByTool: Record<string, Record<string, unknown>>, finalAnswer: string, agentError?: string): TaskScore {
  const errors: string[] = [];
  if (agentError) errors.push(agentError);

  for (const expected of task.expectedTools) {
    if (!used.includes(expected)) errors.push(`missing_tool:${expected}`);
  }
  for (const name of used) {
    if (!task.expectedTools.includes(name)) errors.push(`unexpected_tool:${name}`);
  }

  if (task.mustIncludeArgs) {
    for (const [tool, needles] of Object.entries(task.mustIncludeArgs)) {
      const args = argsByTool[tool] ?? {};
      const blob = JSON.stringify(args).toLowerCase();
      for (const needle of needles) {
        if (!blob.includes(needle.toLowerCase())) {
          errors.push(`missing_arg:${tool}:${needle}`);
        }
      }
    }
  }

  if (task.successKeywords) {
    const lower = finalAnswer.toLowerCase();
    for (const kw of task.successKeywords) {
      if (!lower.includes(kw.toLowerCase())) errors.push(`missing_keyword:${kw}`);
    }
  }

  return { id: task.id, success: errors.length === 0, errors };
}

async function main() {
  const tasksPath = path.join(__dirname, "tasks.json");
  if (!fs.existsSync(tasksPath)) {
    console.error("tasks.json missing — run npm run generate-tasks");
    process.exit(1);
  }

  const tasks = JSON.parse(fs.readFileSync(tasksPath, "utf8")) as EvalTask[];
  const scores: TaskScore[] = [];

  for (const task of tasks) {
    const result = await runAgent(task.instruction);
    const used = result.steps
      .map((s) => s.tool?.name)
      .filter((n): n is ToolName => Boolean(n));
    const argsByTool: Record<string, Record<string, unknown>> = {};
    for (const step of result.steps) {
      if (step.tool) argsByTool[step.tool.name] = step.tool.args;
    }
    scores.push(
      scoreTask(task, used, argsByTool, result.finalAnswer, result.error)
    );
  }

  const passed = scores.filter((s) => s.success).length;
  const report = {
    evaluator: "manalipansuriya57",
    total: scores.length,
    passed,
    success_rate: Number((passed / scores.length).toFixed(3)),
    failure_examples: scores.filter((s) => !s.success).slice(0, 10),
  };

  const outPath = path.join(__dirname, "report.json");
  fs.writeFileSync(outPath, JSON.stringify({ ...report, scores }, null, 2));
  console.log(
    `Eval complete: ${passed}/${scores.length} (${(report.success_rate * 100).toFixed(1)}%)`
  );
  console.log(`Wrote ${outPath}`);
}

main();

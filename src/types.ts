export type ToolName = "search_docs" | "query_db" | "draft_email";

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  output: string;
}

export interface StepLog {
  step: number;
  thought: string;
  tool?: ToolCall;
  observation?: string;
}

export interface AgentResult {
  success: boolean;
  finalAnswer: string;
  steps: StepLog[];
  error?: string;
}

export interface EvalTask {
  id: string;
  instruction: string;
  expectedTools: ToolName[];
  mustIncludeArgs?: Record<string, string[]>;
  successKeywords?: string[];
}

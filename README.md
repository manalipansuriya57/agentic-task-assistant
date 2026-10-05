# Agentic Task Assistant

Multi-step agent that plans tasks, calls tools (search, database, email drafts), and logs each step. Ships an evaluation set of **100+ tasks** to measure success rate and catch tool-calling errors.

## Stack

TypeScript · Node.js · OpenAI-compatible tool loop (works offline with a deterministic mock model)

## Run

```bash
npm install
npm run build
npm run demo          # one interactive-style task via mock model
npm run eval          # run full evaluation suite
```

Set `OPENAI_API_KEY` to use a real model instead of the mock planner.

## Layout

- `src/agent.ts` — plan → tool call → observe loop
- `src/tools/` — search, db query, email draft
- `eval/tasks.json` — 100+ labeled tasks with expected tool sequences
- `eval/run.ts` — scores success / wrong-tool / missing-arg errors

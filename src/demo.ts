import { runAgent } from "./agent.js";

async function main() {
  const instruction =
    process.argv.slice(2).join(" ") ||
    "Look up refund policy in docs, fetch user u_100 from the database, and draft an email to riya@example.com summarizing the refund window.";

  const result = await runAgent(instruction);
  console.log(JSON.stringify(result, null, 2));
}

main();

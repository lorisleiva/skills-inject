import * as p from "@clack/prompts";

/**
 * Prompt the user to select target files.
 * Used when auto-detection is ambiguous (both or neither exist).
 */
export async function promptForTargets(
  context: "both" | "neither",
): Promise<string[]> {
  const options =
    context === "both"
      ? [
          { value: ["CLAUDE.md"], label: "CLAUDE.md only" },
          { value: ["AGENTS.md"], label: "AGENTS.md only" },
          {
            value: ["CLAUDE.md", "AGENTS.md"],
            label: "Both CLAUDE.md and AGENTS.md",
          },
        ]
      : [
          { value: ["CLAUDE.md"], label: "CLAUDE.md", hint: "create it" },
          { value: ["AGENTS.md"], label: "AGENTS.md", hint: "create it" },
          {
            value: ["CLAUDE.md", "AGENTS.md"],
            label: "Both",
            hint: "create them",
          },
        ];

  const result = await p.select({
    message: "Which file(s) should skills-inject write to?",
    options,
  });

  if (p.isCancel(result)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return result;
}

import { readFile, writeFile } from "node:fs/promises";
import type { Injection, ResolvedConfig } from "./types.js";

const MARKER_START = "<!-- skills-inject:start -->";
const MARKER_END = "<!-- skills-inject:end -->";

type BlockConfig = Pick<ResolvedConfig, "heading" | "description">;

/** Build the injection block from a list of parsed injections. */
export function buildInjectionBlock(
  injections: Injection[],
  config: BlockConfig,
): string {
  if (injections.length === 0) return "";

  const sections: string[] = [];
  sections.push(`## ${config.heading}`);
  sections.push("");

  if (config.description) {
    sections.push(config.description);
    sections.push("");
  }

  for (const injection of injections) {
    if (injection.heading !== null) {
      sections.push(`### ${injection.heading}`);
      sections.push("");
    }
    sections.push(injection.body);
    sections.push("");
  }

  return sections.join("\n").trimEnd();
}

/** Build the full content between markers (with markers included). */
export function buildMarkerContent(
  injections: Injection[],
  config: BlockConfig,
): string {
  const block = buildInjectionBlock(injections, config);
  if (!block) {
    return `${MARKER_START}\n\n${MARKER_END}`;
  }
  return `${MARKER_START}\n\n${block}\n\n${MARKER_END}`;
}

/**
 * Inject content into a target file between markers.
 * Creates markers if they don't exist (appends to end of file).
 * Creates the file if it doesn't exist.
 */
export async function injectIntoFile(
  targetPath: string,
  injections: Injection[],
  dryRun: boolean,
  config: BlockConfig,
): Promise<{ created: boolean; markersAdded: boolean }> {
  let content: string;
  let created = false;

  try {
    content = await readFile(targetPath, "utf-8");
  } catch {
    // File doesn't exist — create it.
    content = `# Agent Instructions\n`;
    created = true;
  }

  const markerContent = buildMarkerContent(injections, config);
  let markersAdded = false;

  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  let newContent: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace content between existing markers (including markers).
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + MARKER_END.length);
    newContent = before + markerContent + after;
  } else {
    // No markers found — append them.
    markersAdded = true;
    const separator = content.endsWith("\n") ? "\n" : "\n\n";
    newContent = content + separator + markerContent + "\n";
  }

  if (!dryRun) {
    await writeFile(targetPath, newContent, "utf-8");
  }

  return { created, markersAdded };
}

import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import type { Injection, Priority } from "./types.js";

/** Numeric sort values for priority tiers (higher = first). */
const PRIORITY_ORDER: Record<Priority, number> = {
  high: 2,
  normal: 1,
  low: 0,
};

/** Convert a directory name to a title-cased heading. */
function dirNameToHeading(dirName: string): string {
  return dirName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Scan a single skills directory for INJECT.md files.
 * Returns an array of parsed injections.
 */
async function scanDir(skillsDir: string): Promise<Injection[]> {
  const injections: Injection[] = [];

  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    // Directory doesn't exist — skip silently.
    return [];
  }

  for (const entry of entries) {
    const skillDir = join(skillsDir, entry);
    const injectPath = join(skillDir, "INJECT.md");

    // Check that this is a directory containing INJECT.md.
    try {
      const dirStat = await stat(skillDir);
      if (!dirStat.isDirectory()) continue;
    } catch {
      continue;
    }

    let content: string;
    try {
      content = await readFile(injectPath, "utf-8");
    } catch {
      // No INJECT.md in this skill — skip.
      continue;
    }

    const { frontmatter, body } = parseFrontmatter(content);

    if (!body) continue;

    const skillName = basename(skillDir);
    let heading: string | null;
    if (frontmatter.heading === false) {
      heading = null;
    } else if (typeof frontmatter.heading === "string") {
      heading = frontmatter.heading;
    } else {
      heading = dirNameToHeading(skillName);
    }

    injections.push({
      skillName,
      heading,
      body,
      priority: frontmatter.priority ?? "normal",
      filePath: injectPath,
    });
  }

  return injections;
}

/**
 * Scan multiple skills directories for INJECT.md files.
 * Deduplicates by skill name (first occurrence wins).
 * Returns injections sorted by priority tier (high first), then alphabetically.
 */
export async function scanSkillsDirs(
  skillsDirs: string[],
): Promise<Injection[]> {
  const allInjections: Injection[] = [];
  const seen = new Set<string>();

  for (const dir of skillsDirs) {
    const injections = await scanDir(dir);
    for (const injection of injections) {
      if (!seen.has(injection.skillName)) {
        seen.add(injection.skillName);
        allInjections.push(injection);
      }
    }
  }

  return allInjections.sort((a, b) => {
    if (a.priority !== b.priority) return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    return a.skillName.localeCompare(b.skillName);
  });
}

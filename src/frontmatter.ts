import matter from "gray-matter";
import type { InjectFrontmatter, Priority } from "./types.js";

const VALID_PRIORITIES = new Set<Priority>(["high", "normal", "low"]);

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns the parsed frontmatter and the body content after the frontmatter.
 */
export function parseFrontmatter(content: string): {
  frontmatter: InjectFrontmatter;
  body: string;
} {
  const { data, content: body } = matter(content);
  const frontmatter: InjectFrontmatter = {};

  if (data.heading === false) {
    frontmatter.heading = false;
  } else if (typeof data.heading === "string") {
    frontmatter.heading = data.heading;
  }

  if (typeof data.priority === "string" && VALID_PRIORITIES.has(data.priority as Priority)) {
    frontmatter.priority = data.priority as Priority;
  }

  return { frontmatter, body: body.trim() };
}

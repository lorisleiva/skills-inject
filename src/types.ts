/** Named priority tiers for injection ordering. */
export type Priority = "high" | "normal" | "low";

/** Parsed INJECT.md frontmatter. */
export interface InjectFrontmatter {
  /** Override the heading text. Set to `false` to suppress auto-heading. */
  heading?: string | false;
  /** Priority tier for ordering (high = first, low = last). Default: "normal". */
  priority?: Priority;
}

/** A parsed injection from an INJECT.md file. */
export interface Injection {
  /** The skill directory name (e.g. "shipping-graphite"). */
  skillName: string;
  /** Resolved heading text, or null if suppressed. */
  heading: string | null;
  /** The markdown body content (after frontmatter). */
  body: string;
  /** Priority tier for ordering (high = first, low = last). */
  priority: Priority;
  /** Absolute path to the INJECT.md file. */
  filePath: string;
}

/** Fully resolved configuration for a run. All fields have final values. */
export interface ResolvedConfig {
  /** Directories to scan for INJECT.md files. */
  skillsDirs: string[];
  /** Target files to inject into. */
  targets: string[];
  /** Section heading for the injection block. */
  heading: string;
  /** Description paragraph after the heading. Empty string = suppressed. */
  description: string;
}

/** CLI options parsed from command-line arguments. */
export interface CliOptions {
  targets: string[];
  skillsDirs: string[];
  dryRun: boolean;
  help: boolean;
}

/** Configuration stored in .skills-inject.json or package.json. */
export interface StoredConfig {
  /** Target file paths (relative to project root). */
  targets?: string[];
  /** Skills directories to scan (relative to project root). */
  skillsDirs?: string[];
  /** Section heading for the injection block. */
  heading?: string;
  /** Description paragraph after the heading. */
  description?: string;
}

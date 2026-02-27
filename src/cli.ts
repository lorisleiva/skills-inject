import { resolve, join } from "node:path";
import { writeFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { scanSkillsDirs } from "./scan.js";
import { injectIntoFile, buildInjectionBlock } from "./inject.js";
import { loadConfig, resolveConfig } from "./config.js";
import type { CliOptions, ResolvedConfig, Injection } from "./types.js";

function printHelp(): void {
  const help = `
skills-inject - Inject skill summaries into agent instruction files

Usage:
  npx skills-inject [options]

Options:
  --target <file>       Target file(s) to inject into (can be repeated)
  --skills-dir <dir>    Skills directory to scan (can be repeated)
  --dry-run             Show what would be injected without writing
  --help                Show this help message

Auto-detection:
  Skills dirs:  Scans .agents/skills/ and .claude/skills/ (whichever exist)
  Target files: Uses CLAUDE.md or AGENTS.md (prompts if ambiguous)

Config:
  Settings are read from .skills-inject.json or the "skills-inject"
  key in package.json. CLI flags override stored config. When prompted
  interactively, choices are saved to .skills-inject.json automatically.

Examples:
  npx skills-inject
  npx skills-inject --dry-run
  npx skills-inject --target CLAUDE.md --target AGENTS.md
  npx skills-inject --skills-dir .claude/skills --skills-dir .agents/skills
`.trim();
  console.log(help);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    targets: [],
    skillsDirs: [],
    dryRun: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--target":
        if (i + 1 < args.length) {
          options.targets.push(args[++i]);
        }
        break;
      case "--skills-dir":
        if (i + 1 < args.length) {
          options.skillsDirs.push(args[++i]);
        }
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          options.targets.push(arg);
        } else {
          p.log.error(`Unknown option: ${pc.yellow(arg)}`);
          process.exit(1);
        }
    }
    i++;
  }

  return options;
}

function performDryRun(
  injections: Injection[],
  config: ResolvedConfig,
): void {
  p.log.info("Dry run — would inject the following:");
  p.log.message(buildInjectionBlock(injections, config));
  p.log.step(
    `Target(s): ${config.targets.map((t) => pc.cyan(t)).join(", ")}\n` +
    `Source(s): ${config.skillsDirs.map((d) => pc.cyan(d)).join(", ")}\n` +
    `Skills:    ${injections.map((i) => pc.cyan(i.skillName)).join(", ")}`,
  );
}

async function saveConfig(
  cwd: string,
  config: ResolvedConfig,
): Promise<void> {
  const configPath = join(cwd, ".skills-inject.json");
  await writeFile(
    configPath,
    JSON.stringify(
      { targets: config.targets, skillsDirs: config.skillsDirs },
      null,
      2,
    ) + "\n",
    "utf-8",
  );
  p.log.info(`Config saved to ${pc.dim(".skills-inject.json")}`);
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const storedConfig = await loadConfig(cwd);
  const { config, prompted } = await resolveConfig(options, storedConfig, cwd);

  const absoluteSkillsDirs = config.skillsDirs.map((dir) => resolve(cwd, dir));
  const injections = await scanSkillsDirs(absoluteSkillsDirs);

  if (injections.length === 0) {
    p.log.warn("No INJECT.md files found in skills directories.");
    p.outro("Nothing to inject.");
    return;
  }

  if (options.dryRun) {
    performDryRun(injections, config);
    p.outro("Dry run complete.");
    return;
  }

  for (const target of config.targets) {
    const targetPath = resolve(cwd, target);
    const result = await injectIntoFile(targetPath, injections, false, config);

    const actions: string[] = [];
    if (result.created) actions.push("created");
    if (result.markersAdded) actions.push("markers added");
    actions.push(`${injections.length} skill(s) injected`);

    p.log.success(`${pc.cyan(target)}: ${actions.join(", ")}`);
  }

  if (prompted) {
    await saveConfig(cwd, config);
  }

  p.outro("Done!");
}

main().catch((err) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

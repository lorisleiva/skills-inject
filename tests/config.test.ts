import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, detectSkillsDirs, detectTargets } from "../src/config.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "skills-inject-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true });
});

describe("loadConfig", () => {
  it("loads from .skills-inject.json", async () => {
    await writeFile(
      join(testDir, ".skills-inject.json"),
      JSON.stringify({ targets: ["CLAUDE.md"], skillsDirs: [".claude/skills"] }),
      "utf-8",
    );

    const config = await loadConfig(testDir);
    expect(config).toEqual({
      targets: ["CLAUDE.md"],
      skillsDirs: [".claude/skills"],
    });
  });

  it("loads from package.json skills-inject key", async () => {
    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test",
        "skills-inject": {
          targets: ["AGENTS.md"],
          skillsDirs: [".agents/skills"],
        },
      }),
      "utf-8",
    );

    const config = await loadConfig(testDir);
    expect(config).toEqual({
      targets: ["AGENTS.md"],
      skillsDirs: [".agents/skills"],
    });
  });

  it("prefers .skills-inject.json over package.json", async () => {
    await writeFile(
      join(testDir, ".skills-inject.json"),
      JSON.stringify({ targets: ["FROM_CONFIG.md"] }),
      "utf-8",
    );
    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test",
        "skills-inject": { targets: ["FROM_PKG.md"] },
      }),
      "utf-8",
    );

    const config = await loadConfig(testDir);
    expect(config?.targets).toEqual(["FROM_CONFIG.md"]);
  });

  it("returns null when no config found", async () => {
    const config = await loadConfig(testDir);
    expect(config).toBeNull();
  });
});

describe("detectSkillsDirs", () => {
  it("detects .agents/skills", async () => {
    await mkdir(join(testDir, ".agents/skills"), { recursive: true });

    const dirs = await detectSkillsDirs(testDir);
    expect(dirs).toEqual([".agents/skills"]);
  });

  it("detects .claude/skills", async () => {
    await mkdir(join(testDir, ".claude/skills"), { recursive: true });

    const dirs = await detectSkillsDirs(testDir);
    expect(dirs).toEqual([".claude/skills"]);
  });

  it("detects both when both exist", async () => {
    await mkdir(join(testDir, ".agents/skills"), { recursive: true });
    await mkdir(join(testDir, ".claude/skills"), { recursive: true });

    const dirs = await detectSkillsDirs(testDir);
    expect(dirs).toEqual([".agents/skills", ".claude/skills"]);
  });

  it("returns empty when none exist", async () => {
    const dirs = await detectSkillsDirs(testDir);
    expect(dirs).toEqual([]);
  });
});

describe("detectTargets", () => {
  it("detects CLAUDE.md", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "# Claude", "utf-8");

    const targets = await detectTargets(testDir);
    expect(targets).toEqual(["CLAUDE.md"]);
  });

  it("detects AGENTS.md", async () => {
    await writeFile(join(testDir, "AGENTS.md"), "# Agents", "utf-8");

    const targets = await detectTargets(testDir);
    expect(targets).toEqual(["AGENTS.md"]);
  });

  it("detects both", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "# Claude", "utf-8");
    await writeFile(join(testDir, "AGENTS.md"), "# Agents", "utf-8");

    const targets = await detectTargets(testDir);
    expect(targets).toEqual(["CLAUDE.md", "AGENTS.md"]);
  });

  it("returns empty when none exist", async () => {
    const targets = await detectTargets(testDir);
    expect(targets).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanSkillsDirs } from "../src/scan.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "skills-inject-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true });
});

async function createSkill(
  dir: string,
  name: string,
  injectContent: string,
): Promise<void> {
  const skillDir = join(dir, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "INJECT.md"), injectContent, "utf-8");
}

describe("scanSkillsDirs", () => {
  it("finds INJECT.md files in a skills directory", async () => {
    await createSkill(testDir, "my-skill", "---\nheading: My Skill\n---\n\n- Bullet one.\n");

    const result = await scanSkillsDirs([testDir]);
    expect(result).toHaveLength(1);
    expect(result[0].skillName).toBe("my-skill");
    expect(result[0].heading).toBe("My Skill");
    expect(result[0].body).toBe("- Bullet one.");
  });

  it("auto-derives heading from directory name", async () => {
    await createSkill(testDir, "shipping-graphite", "- Some content.\n");

    const result = await scanSkillsDirs([testDir]);
    expect(result[0].heading).toBe("Shipping Graphite");
  });

  it("suppresses heading when heading: false", async () => {
    await createSkill(testDir, "custom", "---\nheading: false\n---\n\n## Custom Header\n\nContent.\n");

    const result = await scanSkillsDirs([testDir]);
    expect(result[0].heading).toBeNull();
  });

  it("skips skills without INJECT.md", async () => {
    const skillDir = join(testDir, "no-inject");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "---\nname: no-inject\n---\n\nSkill content.\n", "utf-8");

    const result = await scanSkillsDirs([testDir]);
    expect(result).toHaveLength(0);
  });

  it("skips INJECT.md with empty body", async () => {
    await createSkill(testDir, "empty", "---\nheading: Empty\n---\n");

    const result = await scanSkillsDirs([testDir]);
    expect(result).toHaveLength(0);
  });

  it("sorts by priority tier (high first) then name", async () => {
    await createSkill(testDir, "beta", "---\npriority: normal\n---\n\nBeta content.\n");
    await createSkill(testDir, "alpha", "---\npriority: normal\n---\n\nAlpha content.\n");
    await createSkill(testDir, "gamma", "---\npriority: high\n---\n\nGamma content.\n");
    await createSkill(testDir, "delta", "---\npriority: low\n---\n\nDelta content.\n");

    const result = await scanSkillsDirs([testDir]);
    expect(result.map((i) => i.skillName)).toEqual(["gamma", "alpha", "beta", "delta"]);
  });

  it("deduplicates by skill name across multiple directories", async () => {
    const dir1 = join(testDir, "dir1");
    const dir2 = join(testDir, "dir2");
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });

    await createSkill(dir1, "shared", "- First version.\n");
    await createSkill(dir2, "shared", "- Second version.\n");

    const result = await scanSkillsDirs([dir1, dir2]);
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("- First version.");
  });

  it("scans multiple directories", async () => {
    const dir1 = join(testDir, "dir1");
    const dir2 = join(testDir, "dir2");
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });

    await createSkill(dir1, "skill-a", "- A content.\n");
    await createSkill(dir2, "skill-b", "- B content.\n");

    const result = await scanSkillsDirs([dir1, dir2]);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.skillName)).toEqual(["skill-a", "skill-b"]);
  });

  it("handles non-existent directories gracefully", async () => {
    const result = await scanSkillsDirs([join(testDir, "nonexistent")]);
    expect(result).toHaveLength(0);
  });
});

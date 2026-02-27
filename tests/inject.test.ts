import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildInjectionBlock,
  buildMarkerContent,
  injectIntoFile,
} from "../src/inject.js";
import { DEFAULT_HEADING, DEFAULT_DESCRIPTION } from "../src/config.js";
import type { Injection } from "../src/types.js";

function makeInjection(overrides: Partial<Injection> = {}): Injection {
  return {
    skillName: "test-skill",
    heading: "Test Skill",
    body: "- Test content.",
    priority: "normal",
    filePath: "/fake/path/INJECT.md",
    ...overrides,
  };
}

const defaults = { heading: DEFAULT_HEADING, description: DEFAULT_DESCRIPTION };

describe("buildInjectionBlock", () => {
  it("builds a block with heading and default description", () => {
    const result = buildInjectionBlock([makeInjection()], defaults);
    expect(result).toBe(
      `## Skill Instructions\n\n${DEFAULT_DESCRIPTION}\n\n### Test Skill\n\n- Test content.`,
    );
  });

  it("suppresses heading when null", () => {
    const result = buildInjectionBlock([makeInjection({ heading: null })], defaults);
    expect(result).toBe(
      `## Skill Instructions\n\n${DEFAULT_DESCRIPTION}\n\n- Test content.`,
    );
  });

  it("returns empty string for no injections", () => {
    const result = buildInjectionBlock([], defaults);
    expect(result).toBe("");
  });

  it("handles multiple injections in order", () => {
    const result = buildInjectionBlock([
      makeInjection({ skillName: "a", heading: "Skill A", body: "- A." }),
      makeInjection({ skillName: "b", heading: "Skill B", body: "- B." }),
    ], defaults);
    expect(result).toBe(
      `## Skill Instructions\n\n${DEFAULT_DESCRIPTION}\n\n### Skill A\n\n- A.\n\n### Skill B\n\n- B.`,
    );
  });

  it("uses custom heading", () => {
    const result = buildInjectionBlock([makeInjection()], {
      heading: "Custom Heading",
      description: DEFAULT_DESCRIPTION,
    });
    expect(result).toBe(
      `## Custom Heading\n\n${DEFAULT_DESCRIPTION}\n\n### Test Skill\n\n- Test content.`,
    );
  });

  it("uses custom description", () => {
    const result = buildInjectionBlock([makeInjection()], {
      heading: DEFAULT_HEADING,
      description: "Custom description.",
    });
    expect(result).toBe(
      `## Skill Instructions\n\nCustom description.\n\n### Test Skill\n\n- Test content.`,
    );
  });

  it("suppresses description when set to empty string", () => {
    const result = buildInjectionBlock([makeInjection()], {
      heading: DEFAULT_HEADING,
      description: "",
    });
    expect(result).toBe(
      `## Skill Instructions\n\n### Test Skill\n\n- Test content.`,
    );
  });
});

describe("buildMarkerContent", () => {
  it("wraps content in markers", () => {
    const result = buildMarkerContent([makeInjection()], defaults);
    expect(result).toMatch(/^<!-- skills-inject:start -->/);
    expect(result).toMatch(/<!-- skills-inject:end -->$/);
    expect(result).toContain("## Skill Instructions");
  });

  it("produces empty markers for no injections", () => {
    const result = buildMarkerContent([], defaults);
    expect(result).toBe(
      "<!-- skills-inject:start -->\n<!-- skills-inject:end -->",
    );
  });
});

describe("injectIntoFile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "skills-inject-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true });
  });

  it("creates a new file with injection", async () => {
    const target = join(testDir, "NEW.md");
    const result = await injectIntoFile(target, [makeInjection()], false, defaults);

    expect(result.created).toBe(true);
    expect(result.markersAdded).toBe(true);

    const content = await readFile(target, "utf-8");
    expect(content).toBe(
`# Agent Instructions

<!-- skills-inject:start -->
## Skill Instructions

${DEFAULT_DESCRIPTION}

### Test Skill

- Test content.
<!-- skills-inject:end -->
`,
    );
  });

  it("adds markers to existing file without them", async () => {
    const target = join(testDir, "EXISTING.md");
    await writeFile(target, "# My Project\n\nExisting content.\n", "utf-8");

    const result = await injectIntoFile(target, [makeInjection()], false, defaults);
    expect(result.created).toBe(false);
    expect(result.markersAdded).toBe(true);

    const content = await readFile(target, "utf-8");
    expect(content).toBe(
`# My Project

Existing content.

<!-- skills-inject:start -->
## Skill Instructions

${DEFAULT_DESCRIPTION}

### Test Skill

- Test content.
<!-- skills-inject:end -->
`,
    );
  });

  it("replaces content between existing markers", async () => {
    const target = join(testDir, "REPLACE.md");
    await writeFile(
      target,
      "# Header\n\n<!-- skills-inject:start -->\nOLD CONTENT\n<!-- skills-inject:end -->\n\nFooter.\n",
      "utf-8",
    );

    const result = await injectIntoFile(target, [makeInjection()], false, defaults);
    expect(result.created).toBe(false);
    expect(result.markersAdded).toBe(false);

    const content = await readFile(target, "utf-8");
    expect(content).toBe(
`# Header

<!-- skills-inject:start -->
## Skill Instructions

${DEFAULT_DESCRIPTION}

### Test Skill

- Test content.
<!-- skills-inject:end -->

Footer.
`,
    );
  });

  it("does not write in dry-run mode", async () => {
    const target = join(testDir, "DRYRUN.md");
    await injectIntoFile(target, [makeInjection()], true, defaults);

    await expect(readFile(target, "utf-8")).rejects.toThrow();
  });

  it("is idempotent on repeated runs with no injections", async () => {
    const target = join(testDir, "IDEMPOTENT_NONE.md");
    await writeFile(target, "# Project\n", "utf-8");

    await injectIntoFile(target, [], false, defaults);
    const first = await readFile(target, "utf-8");

    await injectIntoFile(target, [], false, defaults);
    const second = await readFile(target, "utf-8");

    expect(first).toBe(second);
  });

  it("is idempotent on repeated runs with a single injection", async () => {
    const target = join(testDir, "IDEMPOTENT.md");
    await writeFile(target, "# Project\n", "utf-8");

    await injectIntoFile(target, [makeInjection()], false, defaults);
    const first = await readFile(target, "utf-8");

    await injectIntoFile(target, [makeInjection()], false, defaults);
    const second = await readFile(target, "utf-8");

    expect(first).toBe(second);
  });

  it("is idempotent on repeated runs with multiple injections", async () => {
    const target = join(testDir, "IDEMPOTENT_MULTI.md");
    await writeFile(target, "# Project\n\nSome existing content.\n", "utf-8");

    const injections = [
      makeInjection({ skillName: "alpha", heading: "Alpha", body: "- Alpha rule.", priority: "high" }),
      makeInjection({ skillName: "beta", heading: "Beta", body: "- Beta rule.\n- Another beta rule.", priority: "normal" }),
      makeInjection({ skillName: "gamma", heading: null, body: "- Headless rule." }),
    ];

    await injectIntoFile(target, injections, false, defaults);
    const first = await readFile(target, "utf-8");

    await injectIntoFile(target, injections, false, defaults);
    const second = await readFile(target, "utf-8");

    expect(first).toBe(second);
    expect(first).toBe(
`# Project

Some existing content.

<!-- skills-inject:start -->
## Skill Instructions

${DEFAULT_DESCRIPTION}

### Alpha

- Alpha rule.

### Beta

- Beta rule.
- Another beta rule.

- Headless rule.
<!-- skills-inject:end -->
`,
    );
  });

  it("passes custom heading and description through to output", async () => {
    const target = join(testDir, "CUSTOM.md");
    await writeFile(target, "# Project\n", "utf-8");

    await injectIntoFile(target, [makeInjection()], false, {
      heading: "Agent Guidelines",
      description: "Follow these rules.",
    });

    const content = await readFile(target, "utf-8");
    expect(content).toBe(
`# Project

<!-- skills-inject:start -->
## Agent Guidelines

Follow these rules.

### Test Skill

- Test content.
<!-- skills-inject:end -->
`,
    );
  });
});

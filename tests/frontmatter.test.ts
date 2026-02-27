import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../src/frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses heading and priority", () => {
    const content = `---
heading: My Heading
priority: high
---

Some body content.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("My Heading");
    expect(result.frontmatter.priority).toBe("high");
    expect(result.body).toBe("Some body content.");
  });

  it("parses heading: false", () => {
    const content = `---
heading: false
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe(false);
    expect(result.body).toBe("Body.");
  });

  it("strips quotes from heading", () => {
    const content = `---
heading: "Quoted Heading"
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("Quoted Heading");
  });

  it("strips single quotes from heading", () => {
    const content = `---
heading: 'Single Quoted'
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("Single Quoted");
  });

  it("returns empty frontmatter when no frontmatter present", () => {
    const content = `Just some markdown content.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("Just some markdown content.");
  });

  it("handles empty body after frontmatter", () => {
    const content = `---
heading: No Body
---`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("No Body");
    expect(result.body).toBe("");
  });

  it("parses all valid priority tiers", () => {
    for (const tier of ["high", "normal", "low"]) {
      const content = `---\npriority: ${tier}\n---\n\nBody.`;
      const result = parseFrontmatter(content);
      expect(result.frontmatter.priority).toBe(tier);
    }
  });

  it("ignores invalid priority values", () => {
    const content = `---
priority: urgent
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.priority).toBeUndefined();
  });

  it("ignores numeric priority values", () => {
    const content = `---
priority: 10
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.priority).toBeUndefined();
  });

  it("ignores unknown frontmatter keys", () => {
    const content = `---
heading: Test
unknown: value
priority: high
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("Test");
    expect(result.frontmatter.priority).toBe("high");
    expect(Object.keys(result.frontmatter)).toEqual(["heading", "priority"]);
  });

  it("handles multi-line body with varied content", () => {
    const content = `---
heading: Complex
---

- Bullet one.
- Bullet two.

Paragraph text.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.heading).toBe("Complex");
    expect(result.body).toBe("- Bullet one.\n- Bullet two.\n\nParagraph text.");
  });
});

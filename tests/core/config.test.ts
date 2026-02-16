import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { PraxisConfig } from "@/core/config.js";

describe("PraxisConfig", () => {
  const dirs: string[] = [];

  function makeTmpdir(): string {
    const dir = join(tmpdir(), `praxis-config-test-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("uses defaults when no config file exists", () => {
    const dir = makeTmpdir();
    const config = new PraxisConfig(dir);

    expect(config.agentProfilesDir).toBe(join(dir, "agent-profiles"));
    expect(config.plugins).toEqual([]);
  });

  it("loads agentProfilesDir from config file", () => {
    const dir = makeTmpdir();
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ agentProfilesDir: "./custom-profiles" }),
    );

    const config = new PraxisConfig(dir);

    expect(config.agentProfilesDir).toBe(join(dir, "custom-profiles"));
  });

  it("returns null when agentProfilesDir is false", () => {
    const dir = makeTmpdir();
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ agentProfilesDir: false }),
    );

    const config = new PraxisConfig(dir);

    expect(config.agentProfilesDir).toBeNull();
  });

  it("loads plugins from config file", () => {
    const dir = makeTmpdir();
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ plugins: ["claude-code"] }),
    );

    const config = new PraxisConfig(dir);

    expect(config.plugins).toEqual(["claude-code"]);
  });

  it("defaults missing keys when config file is partial", () => {
    const dir = makeTmpdir();
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ plugins: ["claude-code"] }),
    );

    const config = new PraxisConfig(dir);

    // agentProfilesDir should use default
    expect(config.agentProfilesDir).toBe(join(dir, "agent-profiles"));
    expect(config.plugins).toEqual(["claude-code"]);
  });

  it("pluginEnabled returns true for listed plugins", () => {
    const dir = makeTmpdir();
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ plugins: ["claude-code"] }),
    );

    const config = new PraxisConfig(dir);

    expect(config.pluginEnabled("claude-code")).toBe(true);
    expect(config.pluginEnabled("unknown")).toBe(false);
  });

  it("pluginEnabled returns false when plugins array is empty", () => {
    const dir = makeTmpdir();
    const config = new PraxisConfig(dir);

    expect(config.pluginEnabled("claude-code")).toBe(false);
  });
});

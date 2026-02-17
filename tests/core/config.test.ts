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
    mkdirSync(join(dir, ".praxis"), { recursive: true });
    dirs.push(dir);
    return dir;
  }

  function writeConfig(dir: string, config: Record<string, unknown>): void {
    writeFileSync(join(dir, ".praxis", "config.json"), JSON.stringify(config));
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

    expect(config.agentProfilesOutputDir).toBe(join(dir, "agent-profiles"));
    expect(config.plugins).toEqual([]);
    expect(config.sources).toEqual(["roles", "responsibilities", "reference", "context"]);
    expect(config.rolesDir).toBe(join(dir, "roles"));
    expect(config.responsibilitiesDir).toBe(join(dir, "responsibilities"));
    expect(config.pluginsOutputDir).toBe(join(dir, "plugins"));
  });

  it("loads agentProfilesOutputDir from config file", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { agentProfilesOutputDir: "./custom-profiles" });

    const config = new PraxisConfig(dir);

    expect(config.agentProfilesOutputDir).toBe(join(dir, "custom-profiles"));
  });

  it("returns null when agentProfilesOutputDir is false", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { agentProfilesOutputDir: false });

    const config = new PraxisConfig(dir);

    expect(config.agentProfilesOutputDir).toBeNull();
  });

  it("loads plugins from config file", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { plugins: ["claude-code"] });

    const config = new PraxisConfig(dir);

    expect(config.plugins).toEqual(["claude-code"]);
  });

  it("defaults missing keys when config file is partial", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { plugins: ["claude-code"] });

    const config = new PraxisConfig(dir);

    // agentProfilesOutputDir should use default
    expect(config.agentProfilesOutputDir).toBe(join(dir, "agent-profiles"));
    expect(config.plugins).toEqual(["claude-code"]);
    expect(config.sources).toEqual(["roles", "responsibilities", "reference", "context"]);
    expect(config.rolesDir).toBe(join(dir, "roles"));
  });

  it("pluginEnabled returns true for listed plugins", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { plugins: ["claude-code"] });

    const config = new PraxisConfig(dir);

    expect(config.pluginEnabled("claude-code")).toBe(true);
    expect(config.pluginEnabled("unknown")).toBe(false);
  });

  it("pluginEnabled returns false when plugins array is empty", () => {
    const dir = makeTmpdir();
    const config = new PraxisConfig(dir);

    expect(config.pluginEnabled("claude-code")).toBe(false);
  });

  it("loads custom sources from config", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { sources: ["knowledge", "docs"] });

    const config = new PraxisConfig(dir);

    expect(config.sources).toEqual(["knowledge", "docs"]);
  });

  it("loads custom rolesDir from config", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { rolesDir: "knowledge/agents" });

    const config = new PraxisConfig(dir);

    expect(config.rolesDir).toBe(join(dir, "knowledge", "agents"));
  });

  it("loads custom responsibilitiesDir from config", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { responsibilitiesDir: "knowledge/responsibilities" });

    const config = new PraxisConfig(dir);

    expect(config.responsibilitiesDir).toBe(join(dir, "knowledge", "responsibilities"));
  });

  it("loads custom pluginsOutputDir from config", () => {
    const dir = makeTmpdir();
    writeConfig(dir, { pluginsOutputDir: "./output/plugins" });

    const config = new PraxisConfig(dir);

    expect(config.pluginsOutputDir).toBe(join(dir, "output", "plugins"));
  });
});

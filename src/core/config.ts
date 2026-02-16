import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONFIG_FILE = "praxis.config.json";

interface RawConfig {
  agentProfilesDir?: string | false;
  plugins?: string[];
}

const DEFAULT_CONFIG: Required<RawConfig> = {
  agentProfilesDir: "./agent-profiles",
  plugins: [],
};

/**
 * Loads and provides access to `praxis.config.json` settings.
 *
 * Falls back to defaults when no config file exists, ensuring
 * backward compatibility with projects that predate the config file.
 */
export class PraxisConfig {
  private readonly root: string;
  private readonly data: Required<RawConfig>;

  constructor(root: string) {
    this.root = root;
    this.data = this.load();
  }

  /**
   * Absolute path for pure agent profile output, or null if disabled.
   *
   * When `agentProfilesDir` is `false`, returns null (no profile output).
   * When it's a relative path string, resolves it against the project root.
   */
  get agentProfilesDir(): string | null {
    const val = this.data.agentProfilesDir;
    if (val === false) {
      return null;
    }
    return resolve(this.root, val);
  }

  /** Array of enabled plugin names (e.g. `["claude-code"]`). */
  get plugins(): string[] {
    return this.data.plugins;
  }

  /** Whether a specific plugin is enabled. */
  pluginEnabled(name: string): boolean {
    return this.data.plugins.includes(name);
  }

  private load(): Required<RawConfig> {
    const configPath = join(this.root, CONFIG_FILE);

    if (!existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as RawConfig;

    return {
      agentProfilesDir: raw.agentProfilesDir ?? DEFAULT_CONFIG.agentProfilesDir,
      plugins: raw.plugins ?? DEFAULT_CONFIG.plugins,
    };
  }
}

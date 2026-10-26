import { createHash } from "node:crypto";
import { readFile, open, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parseArgs, parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/shared/types/database.types.ts";
import { DemoError, isDemoEmail, repoRoot } from "./demo-listings-data.ts";

export type DemoClient = SupabaseClient<Database>;
export interface DemoConfig {
  url: string;
  serviceKey: string;
  anonKey: string;
  password: string;
  moderatorEmail: string;
  ownerEmails: string[];
  singleOwner: string | null;
  dryRun: boolean;
}

export function report(event: string, details: Record<string, unknown> = {}): void {
  process.stdout.write(JSON.stringify({ event, ...details }) + "\n");
}

export function safeError(error: unknown): string {
  // Provider errors may contain URLs or credentials. Only our own fixed messages reach stdout.
  return error instanceof DemoError ? error.message : "UNEXPECTED_ERROR_CHECK_CONFIGURATION_OR_CONNECTIVITY";
}

export function checkResult(error: { code?: string; status?: number } | null, stage: string): void {
  if (error) {
    const code = String(error.code ?? error.status ?? "FAILED").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
    throw new DemoError(`${stage}:${code}`);
  }
}

export async function loadConfig(): Promise<DemoConfig> {
  const { values } = parseArgs({ options: { "env-file": { type: "string" }, "dry-run": { type: "boolean", default: false } }, strict: true });
  let fileEnv: NodeJS.ProcessEnv = {};
  try {
    fileEnv = parseEnv(await readFile(resolve(repoRoot, values["env-file"] ?? ".env"), "utf8"));
  } catch (error) {
    if (values["env-file"] || (error as NodeJS.ErrnoException).code !== "ENOENT") throw new DemoError("ENV_FILE_UNREADABLE");
  }
  // An explicitly selected env file wins, so an inherited production URL cannot redirect local tests.
  const env = values["env-file"] ? { ...process.env, ...fileEnv } : { ...fileEnv, ...process.env };
  const required = (key: string): string => {
    const value = env[key]?.trim();
    if (!value || value.startsWith("YOUR_")) throw new DemoError(`MISSING_ENV:${key}`);
    return value;
  };
  const url = required("SUPABASE_URL").replace(/\/$/, "");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new DemoError("INVALID_SUPABASE_URL"); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/"
    || !(parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)))) {
    throw new DemoError("INVALID_SUPABASE_URL");
  }
  const ownerEmails = (env.DEMO_LANDLORD_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const singleOwner = ownerEmails.length ? null : required("DEMO_LANDLORD_EMAIL").toLowerCase();
  if (new Set(ownerEmails).size !== ownerEmails.length || ownerEmails.some(email => !isDemoEmail(email)) || (singleOwner && !isDemoEmail(singleOwner))) {
    throw new DemoError("OWNER_ALLOWLIST_MUST_CONTAIN_ONLY_UNIQUE_DEMO_EMAILS");
  }
  const moderatorEmail = (env.DEMO_MODERATOR_EMAIL ?? "admin@tronhanh.demo").trim().toLowerCase();
  if (!isDemoEmail(moderatorEmail)) throw new DemoError("NON_DEMO_MODERATOR");
  return {
    url, serviceKey: required("SUPABASE_SERVICE_ROLE_KEY"), anonKey: required("SUPABASE_ANON_KEY"),
    password: values["dry-run"] ? "" : required("DEMO_ACCOUNT_PASSWORD"), moderatorEmail,
    ownerEmails, singleOwner, dryRun: values["dry-run"] ?? false,
  };
}

export function newClient(url: string, key: string): DemoClient {
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function acquireProjectLock(url: string): Promise<() => Promise<void>> {
  const key = createHash("sha256").update(url).digest("hex").slice(0, 24);
  const path = resolve(tmpdir(), `tronhanh-demo-${key}.lock`);
  let handle;
  try { handle = await open(path, "wx", 0o600); } catch { throw new DemoError("PROJECT_LOCKED:remove_stale_lock_manually_only_after_checking_process"); }
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    await handle.close();
    await unlink(path);
  };
  const interrupt = () => { void release().finally(() => process.exit(130)); };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  return async () => {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    await release();
  };
}

export async function findDemoUsers(admin: DemoClient, emails: string[]): Promise<Map<string, string>> {
  const wanted = new Set(emails);
  const found = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    checkResult(error, "LOOKUP_DEMO_USERS");
    for (const user of data.users) {
      const email = user.email?.toLowerCase();
      if (email && wanted.has(email)) found.set(email, user.id);
    }
    if (data.users.length < 100 || found.size === wanted.size) return found;
  }
}

export async function signInDemo(config: DemoConfig, email: string): Promise<DemoClient> {
  if (!isDemoEmail(email)) throw new DemoError("NON_DEMO_LOGIN_REFUSED");
  const client = newClient(config.url, config.anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password: config.password });
  checkResult(error, "DEMO_LOGIN");
  if (!data.session || data.user?.email?.toLowerCase() !== email) throw new DemoError("DEMO_LOGIN_IDENTITY_MISMATCH");
  return client;
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DemoError, isDemoEmail, repoRoot } from "./demo-listings-data.ts";
import { checkResult, findDemoUsers, loadConfig, newClient, report, safeError } from "./demo-listings-runtime.ts";

/**
 * Tạo tài khoản chủ trọ trong `seed/landlords.json` (chỉ email @tronhanh.demo).
 * Trigger `handle_new_user` dựng profile từ user_metadata (full_name, contact_phone);
 * tài khoản đã tồn tại chỉ được cập nhật lại tên, không đổi mật khẩu hay SĐT.
 */
interface Landlord {
  email: string;
  fullName: string;
  phone: string;
}

function validateLandlords(input: unknown): Landlord[] {
  if (!Array.isArray(input) || input.length === 0) throw new DemoError("LANDLORDS_REQUIRED");
  const emails = new Set<string>();
  for (const value of input) {
    const landlord = value as Landlord;
    if (typeof landlord?.email !== "string" || !isDemoEmail(landlord.email) || landlord.email.startsWith("hanhlh5.")) throw new DemoError("NON_DEMO_LANDLORD_EMAIL");
    if (emails.has(landlord.email)) throw new DemoError("DUPLICATE_LANDLORD_EMAIL");
    if (typeof landlord.fullName !== "string" || landlord.fullName.trim().length < 5) throw new DemoError("INVALID_LANDLORD_NAME");
    if (typeof landlord.phone !== "string" || !/^0\d{9}$/.test(landlord.phone)) throw new DemoError("INVALID_LANDLORD_PHONE");
    emails.add(landlord.email);
  }
  return input as Landlord[];
}

try {
  const landlords = validateLandlords(JSON.parse(await readFile(resolve(repoRoot, "seed/landlords.json"), "utf8")));
  const config = await loadConfig();
  const admin = newClient(config.url, config.serviceKey);
  report("target", { project: new URL(config.url).host, mode: "landlords", dryRun: config.dryRun });
  const existing = await findDemoUsers(admin, landlords.map(landlord => landlord.email));
  const counts: Record<string, number> = {};
  for (const landlord of landlords) {
    let userId = existing.get(landlord.email);
    let outcome = userId ? "updated" : "created";
    if (config.dryRun) {
      outcome = userId ? "wouldUpdate" : "wouldCreate";
    } else {
      if (!userId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: landlord.email, password: config.landlordPassword, email_confirm: true,
          user_metadata: { full_name: landlord.fullName, contact_phone: landlord.phone },
        });
        checkResult(error, "CREATE_LANDLORD");
        userId = data.user?.id;
        if (!userId) throw new DemoError("CREATE_LANDLORD_NO_ID");
      }
      // SĐT chỉ ghi lúc tạo (qua trigger): đổi contact_phone sau đó bị guard_profile_phone_verification chặn.
      const { data: profile, error } = await admin.from("profiles")
        .update({ full_name: landlord.fullName })
        .eq("user_id", userId)
        .select("contact_phone")
        .maybeSingle();
      checkResult(error, "UPDATE_LANDLORD_PROFILE");
      if (profile?.contact_phone !== landlord.phone) throw new DemoError("LANDLORD_PHONE_MISMATCH");
    }
    counts[outcome] = (counts[outcome] ?? 0) + 1;
    report("landlord", { email: landlord.email, fullName: landlord.fullName, outcome });
  }
  report("summary", { mode: "landlords", ...counts });
} catch (error) {
  report("fatal", { error: safeError(error) });
  process.exitCode = 1;
}

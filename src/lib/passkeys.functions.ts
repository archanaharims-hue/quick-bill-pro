import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function hashCode(code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ssc-passkey:${code}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanCode(v: unknown) {
  const code = String(v ?? "").trim();
  if (code.length < 6 || code.length > 64) throw new Error("Passkey must be 6–64 characters");
  return code;
}

export const createPasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label: string; code: string }) => ({
    label: String(d?.label ?? "").trim().slice(0, 60) || "Passkey",
    code: cleanCode(d?.code),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("passkeys").insert({
      owner_id: context.userId,
      label: data.label,
      code_hash: await hashCode(data.code),
    });
    if (error) throw new Error(error.code === "23505" ? "That passkey is already in use" : error.message);
    return { ok: true };
  });

export const loginWithPasskey = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => ({ code: cleanCode(d?.code) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("passkeys")
      .select("owner_id")
      .eq("code_hash", await hashCode(data.code))
      .maybeSingle();
    if (!row) throw new Error("Wrong passkey");
    const { data: u, error: ue } = await supabaseAdmin.auth.admin.getUserById(row.owner_id);
    if (ue || !u.user?.email) throw new Error("Account not found");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
    if (error || !link.properties?.hashed_token) throw new Error("Could not sign in");
    return { tokenHash: link.properties.hashed_token };
  });

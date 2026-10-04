import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, apikey, authorization",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return json({ message: "Enter a valid email address." }, 400);
    }
    if (password.length < 8 || password.length > 128) {
      return json({ message: "Password must be 8–128 characters." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const secretKey = keys["default"];
    if (!url || !secretKey) return json({ message: "Signup is unavailable." }, 503);

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rawIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const ipHash = await sha256(rawIp);
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    const { data: limitRow } = await admin
      .from("signup_rate_limits")
      .select("window_start,attempts")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (limitRow && limitRow.window_start > hourAgo && limitRow.attempts >= 5) {
      return json({ message: "Too many signup attempts. Try again later." }, 429);
    }

    if (!limitRow || limitRow.window_start <= hourAgo) {
      await admin.from("signup_rate_limits").upsert({
        ip_hash: ipHash,
        window_start: new Date(now).toISOString(),
        attempts: 1,
      });
    } else {
      await admin
        .from("signup_rate_limits")
        .update({ attempts: limitRow.attempts + 1 })
        .eq("ip_hash", ipHash);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return json({ message: "An account with this email already exists." }, 409);
      }
      return json({ message: "Could not create the account." }, 400);
    }

    return json({ ok: true, user_id: data.user?.id ?? null }, 201);
  } catch {
    return json({ message: "Could not create the account." }, 500);
  }
});

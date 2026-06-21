import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { AUTH_HONEYPOT_FIELD, hasHoneypotValue } from "@/lib/honeypot";
import { createAdminClient } from "@/lib/supabase/admin";

type SignupRequest = {
  fullName?: string;
  email?: string;
  password?: string;
  [AUTH_HONEYPOT_FIELD]?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (env.isDemoMode) {
    return jsonError("Signup is running in demo mode.", 400);
  }

  let payload: SignupRequest;

  try {
    payload = (await request.json()) as SignupRequest;
  } catch {
    return jsonError("Invalid signup request.", 400);
  }

  const fullName = payload.fullName?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";

  if (hasHoneypotValue(payload[AUTH_HONEYPOT_FIELD])) {
    return jsonError("Invalid signup request.", 400);
  }

  if (!fullName) {
    return jsonError("Full name is required.", 400);
  }

  if (!email) {
    return jsonError("Email is required.", 400);
  }

  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }

  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    return jsonError("Server signup is not configured.", 500);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("already") || message.includes("registered")) {
      return jsonError("This email already has an account. Login instead.", 409);
    }

    return jsonError(error.message, 400);
  }

  const userId = data.user?.id;

  if (!userId) {
    return jsonError("Account could not be created.", 500);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return jsonError(profileError.message, 500);
  }

  return NextResponse.json({ ok: true });
}

"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthHoneypotField } from "@/components/AuthHoneypotField";
import { env } from "@/lib/env";
import { saveDemoUser } from "@/lib/demo-session";
import { AUTH_HONEYPOT_FIELD, hasHoneypotValue } from "@/lib/honeypot";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "error" | "loading">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (hasHoneypotValue(formData.get(AUTH_HONEYPOT_FIELD))) {
      setStatus("idle");
      setMessage(null);
      return;
    }

    setStatus("loading");
    setMessage(null);

    if (env.isDemoMode) {
      saveDemoUser({
        fullName: email.split("@")[0] || "Demo User",
        email: email.trim(),
      });
      router.replace("/capture");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const isAdmin = data.user?.user_metadata.role === "admin";
    router.replace(isAdmin ? "/admin" : "/capture");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {message ? <div className="notice error">{message}</div> : null}

      <AuthHoneypotField id="login-company-website" />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="ghost-button"
            onClick={() => setShowPassword((current) => !current)}
            style={{ minWidth: 48, padding: 0 }}
            type="button"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button className="button" disabled={status === "loading"} type="submit">
        <LogIn size={18} aria-hidden="true" />
        {status === "loading" ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

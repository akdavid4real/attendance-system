"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { env } from "@/lib/env";
import { saveDemoUser } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/browser";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "error" | "loading" | "success">(
    "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Password and confirm password must match.");
      return;
    }

    setStatus("loading");

    if (env.isDemoMode) {
      saveDemoUser({
        fullName: fullName.trim(),
        email: email.trim(),
      });
      router.replace("/capture");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    if (!data.session) {
      setStatus("success");
      setMessage("Account created. Confirm your email, then login.");
      return;
    }

    router.replace("/capture");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {message ? (
        <div className={`notice ${status === "success" ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          autoComplete="name"
          id="fullName"
          name="fullName"
          onChange={(event) => setFullName(event.target.value)}
          required
          type="text"
          value={fullName}
        />
      </div>

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
            autoComplete="new-password"
            id="password"
            minLength={6}
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

      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          autoComplete="new-password"
          id="confirmPassword"
          minLength={6}
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
        />
      </div>

      <button className="button" disabled={status === "loading"} type="submit">
        <UserPlus size={18} aria-hidden="true" />
        {status === "loading" ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}

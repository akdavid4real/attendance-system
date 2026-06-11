import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <>
      <AppHeader />
      <main className="shell page-grid">
        <section className="hero-copy">
          <p className="eyebrow">Create your profile</p>
          <h1>Sign up once, then check in anytime.</h1>
          <p className="lead">
            The browser can remember the password, while Supabase keeps the login
            session active securely across visits.
          </p>
          <div className="stats" aria-label="Signup highlights">
            <div className="stat">
              <strong>Name</strong>
              <span>Stored in your attendance profile</span>
            </div>
            <div className="stat">
              <strong>Email</strong>
              <span>Used for secure login</span>
            </div>
            <div className="stat">
              <strong>Session</strong>
              <span>Persists after successful login</span>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="signup-heading">
          <h2 id="signup-heading">Create account</h2>
          <p className="panel-subtitle">
            Fill in your details exactly as they should appear on attendance records.
          </p>
          <SignupForm />
          <p className="form-footer">
            Already registered? <Link href="/login">Login instead</Link>
          </p>
        </section>
      </main>
    </>
  );
}

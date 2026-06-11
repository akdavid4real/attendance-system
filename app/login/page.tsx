import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <main className="shell page-grid centered-auth-page">
        <section className="panel" aria-labelledby="login-heading">
          <h2 id="login-heading">Welcome back</h2>
          <p className="panel-subtitle">
            Use the email and password you signed up with.
          </p>
          <LoginForm />
          <p className="form-footer">
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </section>
      </main>
    </>
  );
}

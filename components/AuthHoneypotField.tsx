import { AUTH_HONEYPOT_FIELD } from "@/lib/honeypot";

type AuthHoneypotFieldProps = {
  id: string;
};

export function AuthHoneypotField({ id }: AuthHoneypotFieldProps) {
  return (
    <div aria-hidden="true" className="honeypot-field">
      <label htmlFor={id}>Website</label>
      <input
        autoComplete="off"
        id={id}
        name={AUTH_HONEYPOT_FIELD}
        tabIndex={-1}
        type="text"
      />
    </div>
  );
}

# Attendance System

A small Next.js attendance app using Supabase Auth for signup/login sessions,
Supabase Postgres for records, and Supabase Storage for selfie images.

## Setup

1. Install dependencies:

```powershell
pnpm install
```

2. Create a Supabase project.

3. Run the SQL in [supabase/schema.sql](./supabase/schema.sql) from the Supabase
   SQL editor.

4. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

For UI-only demos without Supabase, keep:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

In demo mode, signup/login route straight to the capture screen and check-in
returns a local success response without writing to Supabase.

5. Start the app:

```powershell
pnpm dev
```

Open `http://localhost:3000`.

## App Flow

- `/signup`: full name, email, password, confirm password.
- `/login`: email and password.
- `/capture`: protected check-in page using camera and location permissions.
- `/admin`: admin board for reviewing check-ins and deleting old pictures.
- `/api/attendance/check-in`: server route that uploads the selfie and stores
  the attendance record.

The app does not store real passwords on the device. Browsers can offer password
save automatically, while Supabase Auth keeps the login session active.

## Admin Notes

In demo mode, admin records are saved in browser storage so the UI works without
Supabase. Create a demo check-in from `/capture`, then open `/admin`.

For real Supabase mode, mark an admin user by setting their auth user metadata:

```json
{
  "role": "admin"
}
```

The SQL policies in `supabase/schema.sql` allow admin users to read/delete
attendance rows and delete selfie files from the `attendance-selfies` bucket.

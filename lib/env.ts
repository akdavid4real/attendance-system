const fallbackSupabaseUrl = "https://example.supabase.co";
const fallbackSupabaseAnonKey = "demo-anon-key";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSupabaseAnonKey;

const explicitDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const usingPlaceholderSupabase =
  supabaseUrl.includes("example.supabase.co") ||
  supabaseUrl.includes("your-project-ref.supabase.co") ||
  supabaseAnonKey.includes("demo") ||
  supabaseAnonKey.includes("your-supabase-anon-key");

export const env = {
  isDemoMode: explicitDemoMode || usingPlaceholderSupabase,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

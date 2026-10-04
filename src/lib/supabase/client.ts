import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./configured";
export { isSupabaseConfigured };
let browserClient: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
    if (!isSupabaseConfigured())
        return null;
    if (!browserClient) {
        browserClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    }
    return browserClient;
}

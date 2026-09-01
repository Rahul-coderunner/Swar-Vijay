import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function approveSwapnil() {
  console.log("Approving Swapnil Prabhakar Nade in profiles...");
  const { data, error } = await adminClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", "ad834c20-2882-407f-93f7-ef780ee58ac4")
    .select();

  console.log("Updated profile:", data, error);
}

approveSwapnil();

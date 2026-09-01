import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";

const adminClient = createClient(supabaseUrl, serviceKey);

async function checkTelegramSettings() {
  const { data, error } = await adminClient.from("telegram_settings").select("*");
  console.log("telegram_settings in DB:", { data, error });
}

checkTelegramSettings();

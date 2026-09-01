import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const publishableKey = "sb_publishable_FjBKtHYOrIeVomlqS4cwYQ_lG4845jy";

const client = createClient(supabaseUrl, publishableKey);

async function testVerify() {
  const email = "writesmindcontent@gmail.com";
  const token = "13429110"; // 8 digits!

  console.log(`Verifying ${email} with token: ${token}`);
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    console.error("verifyOtp error:", error);
  } else {
    console.log("verifyOtp SUCCESS! Session:", data.session ? "Active" : "No session", "User:", data.user?.id);
  }
}

testVerify();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";

const adminClient = createClient(supabaseUrl, serviceKey);

async function testAdminOtp() {
  const email = "writesmindcontent@gmail.com";
  console.log("Generating link for:", email);

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email,
    password: "Password123!",
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Data:", {
      email_otp: data.properties?.email_otp,
      hashed_token: data.properties?.hashed_token,
      user_id: data.user?.id,
    });
  }
}

testAdminOtp();

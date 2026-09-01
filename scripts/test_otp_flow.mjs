import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const publishableKey = "sb_publishable_FjBKtHYOrIeVomlqS4cwYQ_lG4845jy";

const adminClient = createClient(supabaseUrl, serviceKey);
const client = createClient(supabaseUrl, publishableKey);

async function testOtpFlow() {
  const testEmail = "test.otp.verify@gmail.com";

  console.log("1. Cleaning test user if exists...");
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const existing = users.find(u => u.email === testEmail);
  if (existing) {
    await adminClient.auth.admin.deleteUser(existing.id);
  }

  console.log("2. Signing up test user...");
  const { data: signUpData, error: signErr } = await client.auth.signUp({
    email: testEmail,
    password: "Password123!",
  });

  if (signErr) {
    console.error("Sign up error:", signErr);
    return;
  }
  console.log("SignUp User created, ID:", signUpData.user?.id);

  // Check the user in admin
  const { data: { user } } = await adminClient.auth.admin.getUserById(signUpData.user.id);
  console.log("User details from DB:", {
    email: user.email,
    confirmed_at: user.email_confirmed_at,
    confirmation_sent_at: user.confirmation_sent_at,
  });

  // Let's generate an OTP via admin.generateLink
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email: testEmail,
    password: "Password123!",
  });

  if (linkErr) {
    console.error("generateLink error:", linkErr);
  } else {
    console.log("Generated Link OTP properties:", {
      email_otp: linkData.properties?.email_otp,
      hashed_token: linkData.properties?.hashed_token,
      verification_type: linkData.properties?.verification_type,
    });

    if (linkData.properties?.email_otp) {
      const otp = linkData.properties.email_otp;
      console.log(`3. Testing verifyOtp with type: 'signup' using OTP: [${otp}]`);
      const v1 = await client.auth.verifyOtp({
        email: testEmail,
        token: otp,
        type: "signup",
      });
      console.log("Verify result type=signup:", v1.error ? v1.error.message : "SUCCESS!");

      console.log(`4. Testing verifyOtp with type: 'email' using OTP: [${otp}]`);
      const v2 = await client.auth.verifyOtp({
        email: testEmail,
        token: otp,
        type: "email",
      });
      console.log("Verify result type=email:", v2.error ? v2.error.message : "SUCCESS!");
    }
  }
}

testOtpFlow();

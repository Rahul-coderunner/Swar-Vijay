import https from "node:https";

const apiKey = "re_LH9KnZsk_Mx2uiRyrxzZypE1KHwRfNvEt";

const data = JSON.stringify({
  from: "otp@vijaybodkhe.tech",
  to: "writesmindcontent@gmail.com",
  subject: "Swar Vijay OTP Test with Verified Domain",
  html: "<h2>Swar Vijay Music Academy</h2><p>Aapka Verified OTP Code: <strong>998877</strong></p>",
});

const req = https.request(
  {
    hostname: "api.resend.com",
    path: "/emails",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", body);
    });
  }
);

req.on("error", (err) => console.error("Error:", err));
req.write(data);
req.end();

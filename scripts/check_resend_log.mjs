import https from "node:https";

const apiKey = "re_LH9KnZsk_Mx2uiRyrxzZypE1KHwRfNvEt";

const req = https.request(
  {
    hostname: "api.resend.com",
    path: "/emails",
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("Resend Emails Log:", JSON.parse(body));
    });
  }
);

req.on("error", (err) => console.error("Error:", err));
req.end();

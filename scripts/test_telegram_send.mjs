const botToken = "8603250040:AAFwrpW6Xrpst7Onc5t94TPB_GABBtRfzTo";
const adminChatId = "7645083105";

async function testTelegramSend() {
  const text = "🎵 <b>Swar Vijay Academy</b>: Telegram notification test successful! 🚀";
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json();
  console.log("Telegram send result:", data);
}

testTelegramSend();

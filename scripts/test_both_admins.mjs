const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const chatIds = ["7645083105", "6800916173"];

async function sendToBoth() {
  for (const cid of chatIds) {
    console.log(`Sending test message to Chat ID: ${cid}...`);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cid,
          text: `🔔 <b>SWAR VIJAY BOT ACTIVE TEST!</b>\n\nYe message check karne ke liye hai ki aapko Telegram par notification mil raha hai ya nahi.\n\nAgar aapko ye message mila hai, to aapka bot 100% active hai! 🚀`,
          parse_mode: "HTML",
        }),
      });
      const result = await res.json();
      console.log(`Result for ${cid}:`, result);
    } catch (e) {
      console.error(`Error for ${cid}:`, e);
    }
  }
}

sendToBoth();

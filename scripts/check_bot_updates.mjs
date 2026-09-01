const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";

async function checkBot() {
  console.log("1. Checking Webhook Info...");
  const whRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const wh = await whRes.json();
  console.log("Webhook Info:", wh);

  console.log("2. Checking Updates...");
  const updRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
  const upd = await updRes.json();
  console.log("Updates:", JSON.stringify(upd, null, 2));
}

checkBot();

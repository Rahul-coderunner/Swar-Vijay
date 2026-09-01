const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";

async function checkTelegramUpdates() {
  const updRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
  const upd = await updRes.json();
  console.log("All Recent Telegram Updates:", JSON.stringify(upd, null, 2));
}

checkTelegramUpdates();

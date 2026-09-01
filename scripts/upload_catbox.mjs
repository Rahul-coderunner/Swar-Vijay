import fs from "node:fs";

async function uploadToCatbox() {
  const filePath = "C:/Users/Dell/Downloads/swar-vijay-app-full/swar-vijay-newbot.tar.gz";
  const fileData = fs.readFileSync(filePath);
  const blob = new Blob([fileData], { type: "application/gzip" });

  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, "swar-vijay-newbot.tar.gz");

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
  });

  const url = await res.text();
  console.log("Catbox Upload URL:", url.trim());
}

uploadToCatbox();

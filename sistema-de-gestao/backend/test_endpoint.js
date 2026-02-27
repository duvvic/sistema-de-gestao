import fetch from "node-fetch";

async function check() {
  const url = "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/clients";
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    console.log("Snippet:", text.substring(0, 100));
  } catch (e) {
    console.error("Fetch failed:", e.message);
  }
}
check();
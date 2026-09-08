import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const RAPIDAPI_HOST = "facebook-reel-and-video-downloader.p.rapidapi.com";
const RAPIDAPI_ENDPOINT = `https://${RAPIDAPI_HOST}/app/main.php`;

app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

function isFacebookUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return ["facebook.com", "m.facebook.com", "fb.watch"].includes(host) ||
           host.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

app.post("/api/download", async (req, res) => {
  const url = String(req.body?.url || "").trim();

  if (!url) {
    return res.status(400).json({ error: "Facebook URL is required." });
  }

  if (!isFacebookUrl(url)) {
    return res.status(400).json({ error: "Please enter a valid Facebook URL." });
  }

  if (!process.env.RAPIDAPI_KEY) {
    return res.status(500).json({
      error: "RapidAPI key is not configured. Add RAPIDAPI_KEY to your .env file."
    });
  }

  try {
    const apiUrl = `${RAPIDAPI_ENDPOINT}?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": process.env.RAPIDAPI_KEY
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || data?.error || `RapidAPI returned HTTP ${response.status}`,
        details: data
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not contact the downloader API." });
  }
});

app.listen(PORT, () => {
  console.log(`Facebook Reel Downloader running at http://localhost:${PORT}`);
});

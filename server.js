const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.UV_API_KEY || "zx3sbkxp63rl";
const API_BASE = "http://indiceuv.cl/ws/wsIndiceUVREST.php";

if (process.env.NODE_ENV !== "production") { app.use(cors()); }

function httpGet(urlStr, redirects) {
  redirects = redirects || 0;
  return new Promise(function(resolve, reject) {
    if (redirects > 5) return reject(new Error("Too many redirects"));
    var parsedUrl = new URL(urlStr);
    var lib = parsedUrl.protocol === "https:" ? https : http;
    var options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IndiceuVProxy/1.0)",
        "Accept": "application/json, text/plain, */*"
      }
    };
    var req = lib.request(options, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        var nextUrl = new URL(res.headers.location, urlStr).toString();
        res.resume();
        return resolve(httpGet(nextUrl, redirects + 1));
      }
      var data = "";
      res.setEncoding("utf8");
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() { resolve({ status: res.statusCode, body: data }); });
    });
    req.on("timeout", function() { req.destroy(); reject(new Error("ETIMEDOUT")); });
    req.on("error", reject);
    req.end();
  });
}

app.get("/api/uv", async (req, res) => {
  const region = req.query.region ?? "0";
  const url = `${API_BASE}?id_region=${region}&llave=${API_KEY}`;
  try {
    const { status, body } = await httpGet(url);
    if (status !== 200) return res.status(status).json({ error: `Error upstream: ${status}` });
    const data = JSON.parse(body);
    res.json(data);
  } catch (err) {
    console.error("Error al consultar indiceuv.cl:", err.message, "code:", err.code);
    res.status(500).json({ error: "No se pudo conectar con indiceuv.cl", code: err.code || err.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => { console.log(`Servidor en http://localhost:${PORT}`); });

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

const app  = express();
const PORT = process.env.PORT || 3001;
const API_KEY  = process.env.UV_API_KEY || "zx3sbkxp63rl";
const API_BASE = "http://indiceuv.cl/ws/wsIndiceUVREST.php";

if (process.env.NODE_ENV !== "production") { app.use(cors()); }

app.get("/api/uv", async (req, res) => {
  const region = req.query.region ?? "0";
  const url = `${API_BASE}?id_region=${region}&llave=${API_KEY}`;
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Error upstream: ${upstream.status}` });
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error("Error al consultar indiceuv.cl:", err.message);
    res.status(500).json({ error: "No se pudo conectar con indiceuv.cl" });
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

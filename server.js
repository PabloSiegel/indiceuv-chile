const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "production") { app.use(cors()); }

const REGIONES = [
  { id_region: "1",  nombre_region: "Arica y Parinacota", lat: -18.4783, lng: -70.3126 },
  { id_region: "2",  nombre_region: "Tarapaca",            lat: -20.2141, lng: -70.1522 },
  { id_region: "3",  nombre_region: "Antofagasta",         lat: -23.6509, lng: -70.3975 },
  { id_region: "4",  nombre_region: "Atacama",             lat: -27.3668, lng: -70.3322 },
  { id_region: "5",  nombre_region: "Coquimbo",            lat: -29.9027, lng: -71.2520 },
  { id_region: "6",  nombre_region: "Valparaiso",          lat: -33.0472, lng: -71.6127 },
  { id_region: "7",  nombre_region: "Metropolitana",       lat: -33.4569, lng: -70.6483 },
  { id_region: "8",  nombre_region: "O'Higgins",           lat: -34.1708, lng: -70.7397 },
  { id_region: "9",  nombre_region: "Maule",               lat: -35.4264, lng: -71.6554 },
  { id_region: "10", nombre_region: "Nuble",               lat: -36.6063, lng: -72.1034 },
  { id_region: "11", nombre_region: "Biobio",              lat: -36.8201, lng: -73.0444 },
  { id_region: "12", nombre_region: "La Araucania",        lat: -38.7359, lng: -72.5904 },
  { id_region: "13", nombre_region: "Los Rios",            lat: -39.8142, lng: -73.2459 },
  { id_region: "14", nombre_region: "Los Lagos",           lat: -41.4693, lng: -72.9424 },
  { id_region: "15", nombre_region: "Aysen",               lat: -45.5752, lng: -72.0662 },
  { id_region: "16", nombre_region: "Magallanes",          lat: -53.1638, lng: -70.9171 },
];

function getCategoria(uv) {
  if (uv <= 2) return "1";
  if (uv <= 5) return "2";
  if (uv <= 7) return "3";
  if (uv <= 10) return "4";
  return "5";
}

async function getUVForRegion(region) {
  const url = "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + region.lat +
    "&longitude=" + region.lng +
    "&daily=uv_index_max" +
    "&timezone=America/Santiago" +
    "&forecast_days=2";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error("HTTP " + res.status + " from Open-Meteo: " + text.slice(0, 200));
    }
    const data = await res.json();
    if (!data.daily || !data.daily.uv_index_max) {
      throw new Error("Respuesta inesperada de Open-Meteo: " + JSON.stringify(data).slice(0, 200));
    }
    const uvHoy = Math.round(data.daily.uv_index_max[0] || 0);
    const uvManana = Math.round(data.daily.uv_index_max[1] || 0);
    return {
      id_region: region.id_region,
      nombre_region: region.nombre_region,
      max_diaria: uvHoy,
      max_manana: uvManana,
      categoria: getCategoria(uvHoy),
    };
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/uv", async (req, res) => {
  try {
    const region = req.query.region || "0";
    const regiones = region === "0"
      ? REGIONES
      : REGIONES.filter((r) => r.id_region === region);
    if (regiones.length === 0) return res.status(404).json({ error: "Region not found" });

    const results = await Promise.all(regiones.map(getUVForRegion));

    const today = new Date().toLocaleDateString("es-CL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Santiago",
    });
    res.json({ data: results, message: "Datos del " + today });
  } catch (err) {
    console.error("Error al obtener UV:", err.message);
    res.status(500).json({ error: err.message });
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

app.listen(PORT, () => {
  console.log("Servidor en http://localhost:" + PORT);
});

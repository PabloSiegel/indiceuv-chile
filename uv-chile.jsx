/**
 * uv-chile.jsx
 * App Índice UV Chile — datos reales de indiceuv.cl vía proxy local
 *
 * Requiere que `server.js` esté corriendo en el puerto 3001.
 * Routing: hash-based → #/region/{id_region} | #/widget/{id_region}
 */
import { useState, useEffect, useCallback } from "react";

// ─── Configuración ───────────────────────────────────────────────────────────
const PROXY_URL = "/api/uv";

const CITY_MAP = {
  "1": "Arica", "2": "Iquique", "3": "Antofagasta", "4": "Copiapó",
  "5": "La Serena", "6": "Valparaíso", "7": "Santiago", "8": "Rancagua",
  "9": "Talca", "10": "Chillán", "11": "Concepción", "12": "Temuco",
  "13": "Valdivia", "14": "Puerto Montt", "15": "Coyhaique", "16": "Punta Arenas",
};

// ─── Helpers UV ──────────────────────────────────────────────────────────────
function getUVInfo(uv, categoria) {
  const n = Number(uv);
  if (n <= 2 || categoria === "1") return { level: "Bajo", spf: "SPF 15", textColor: "text-green-400", accent: "from-green-400 to-green-500", pill: "bg-green-500/20 text-green-300 border-green-500/30", recommendation: "No se requiere protección especial. Disfruta el sol de forma segura.", reapply: "No necesario", hat: "Opcional" };
  if (n <= 5 || categoria === "2") return { level: "Moderado", spf: "SPF 30", textColor: "text-yellow-400", accent: "from-green-400 via-yellow-400 to-yellow-500", pill: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", recommendation: "Usa bloqueador solar y gafas de sol. Busca sombra al mediodía.", reapply: "Cada 2 horas", hat: "Recomendado" };
  if (n <= 7 || categoria === "3") return { level: "Alto", spf: "SPF 50+", textColor: "text-orange-400", accent: "from-green-400 via-yellow-400 to-orange-500", pill: "bg-orange-500/20 text-orange-300 border-orange-500/30", recommendation: "Usa bloqueador, lentes y evita el sol entre 11:00 y 16:00.", reapply: "Cada 2 horas", hat: "Recomendado" };
  if (n <= 10 || categoria === "4") return { level: "Muy Alto", spf: "SPF 50+", textColor: "text-red-400", accent: "from-yellow-400 via-orange-400 to-red-500", pill: "bg-red-500/20 text-red-300 border-red-500/30", recommendation: "Protección máxima. Evita exponerte entre 10:00 y 17:00.", reapply: "Cada hora", hat: "Obligatorio" };
  return { level: "Extremo", spf: "SPF 50+", textColor: "text-violet-400", accent: "from-orange-400 via-red-500 to-violet-600", pill: "bg-violet-500/20 text-violet-300 border-violet-500/30", recommendation: "Peligro extremo. Permanece bajo techo entre 09:00 y 18:00.", reapply: "Cada hora", hat: "Obligatorio" };
}

// ─── Reloj ───────────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

// ─── Routing con hash ─────────────────────────────────────────────────────────
function useRoute() {
  const parse = () => {
    const mWidget = window.location.hash.match(/^#\/widget\/(\d+)$/);
    if (mWidget) return { regionId: mWidget[1], isWidget: true };
    const mRegion = window.location.hash.match(/^#\/region\/(\d+)$/);
    if (mRegion) return { regionId: mRegion[1], isWidget: false };
    return { regionId: null, isWidget: false };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const handler = () => setRoute(parse());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const navigate = useCallback((id) => {
    window.location.hash = id ? `#/region/${id}` : "";
  }, []);
  return { regionId: route.regionId, isWidget: route.isWidget, navigate };
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
      <span className="text-sm">Cargando datos UV…</span>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────
function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center max-w-xs">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-400 text-sm font-semibold">No se pudo obtener los datos</p>
      <p className="text-slate-400 text-xs leading-relaxed">{message}</p>
      <button onClick={onRetry} className="mt-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors">
        Reintentar
      </button>
    </div>
  );
}

// ─── Tarjeta UV ──────────────────────────────────────────────────────────────
function UVCard({ data, onBack, widget = false }) {
  const time = useClock();
  const uv = Number(data.max_diaria);
  const info = getUVInfo(uv, data.categoria);
  const progress = Math.min((uv / 11) * 100, 100);
  const city = CITY_MAP[data.id_region] ?? data.nombre_region;

  const card = (
    <div className="w-[446px] h-[213px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      <div className="h-full grid grid-cols-[1.1fr_0.9fr]">
        {/* Panel izquierdo */}
        <div className="p-4 flex flex-col justify-between bg-gradient-to-br from-sky-50 via-white to-amber-50">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold">Índice UV</div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-none mt-1">{city}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{data.nombre_region}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Hoy · {time} hrs</p>
          </div>
          <div>
            <div className="flex items-end gap-2">
              <span className="text-[52px] font-black text-slate-900 leading-none">{uv}</span>
              <span className={`text-[15px] font-semibold mb-2 ${info.textColor}`}>{info.level}</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug max-w-[210px]">{info.recommendation}</p>
          </div>
        </div>
        {/* Panel derecho */}
        <div className="p-4 bg-slate-950 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Protección</div>
              <div className="text-[18px] font-bold mt-1">{info.spf}</div>
            </div>
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-[20px] shadow-md">☀️</div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Nivel actual</span>
              <span className="font-semibold text-white">{uv}/11+</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${info.accent} transition-all duration-700`} style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Bajo</span><span>Moderado</span><span>Alto</span><span>Extremo</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-white/5 border border-white/10 p-2">
              <div className="text-slate-400">Reaplicar</div>
              <div className="font-semibold mt-0.5">{info.reapply}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2">
              <div className="text-slate-400">Mañana máx.</div>
              <div className="font-semibold mt-0.5">{data.max_manana ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

// Fondo transparente en modo widget
  useEffect(() => {
    if (isWidget) {
      document.body.style.background = "transparent";
      document.documentElement.style.background = "transparent";
    }
  }, [isWidget]);

    // Modo widget: solo la tarjeta, sin chrome
  if (widget) return card;

  // Modo normal: con botón volver y footer
  return (
    <div className="flex flex-col items-center">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a regiones
      </button>
      <div className="mb-3 text-xs text-slate-500 font-mono tracking-widest">#/region/{data.id_region}</div>
      {card}
      <p className="mt-3 text-[10px] text-slate-600">Fuente: indiceuv.cl · Actualizado hoy</p>
    </div>
  );
}

// ─── Lista de regiones ────────────────────────────────────────────────────────
function RegionList({ regions, onSelect, onRefresh, dateMessage }) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="text-[11px] tracking-[0.22em] uppercase text-slate-500 font-semibold mb-1">Chile · Índice UV</div>
        <h1 className="text-2xl font-black text-white">Selecciona tu región</h1>
        {dateMessage && <p className="text-slate-400 text-xs mt-1">{dateMessage}</p>}
      </div>
      <div className="space-y-2">
        {regions.map((r) => {
          const uv = Number(r.max_diaria);
          const info = getUVInfo(uv, r.categoria);
          const pct = Math.min((uv / 11) * 100, 100);
          return (
            <button key={r.id_region} onClick={() => onSelect(r.id_region)} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-xl px-4 py-3 transition-all group">
              <div className="w-10 text-right flex-shrink-0">
                <span className={`text-xl font-black ${info.textColor}`}>{uv}</span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-white truncate">{r.nombre_region}</div>
                <div className="text-[11px] text-slate-500">{CITY_MAP[r.id_region] ?? ""}</div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${info.accent} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${info.pill}`}>{info.level}</span>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
      <button onClick={onRefresh} className="mt-4 w-full text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-1.5 py-2">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualizar datos
      </button>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function UVIndiceApp() {
  const { regionId, isWidget, navigate } = useRoute();
  const [allRegions, setAllRegions] = useState([]);
  const [dateMessage, setDateMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${PROXY_URL}?region=0`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAllRegions(json.data ?? []);
      setDateMessage(json.message ?? "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeRegion = regionId
    ? allRegions.find((r) => String(r.id_region) === String(regionId))
    : null;

  // ── Modo widget: sin fondo, sin padding, solo la tarjeta ──
  if (isWidget) {
    if (loading) return <div style={{ width: 446, height: 213, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#94a3b8", fontSize: 13, borderRadius: 16 }}>Cargando…</div>;
    if (!activeRegion) return <div style={{ width: 446, height: 213, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#f87171", fontSize: 13, borderRadius: 16 }}>Región no encontrada</div>;
    return <UVCard data={activeRegion} widget />;
  }

  // ── Modo normal ──
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4">
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={loadAll} />
      ) : regionId && activeRegion ? (
        <UVCard data={activeRegion} onBack={() => navigate(null)} />
      ) : regionId && !activeRegion ? (
        <div className="text-slate-400 text-sm">
          Región no encontrada.{" "}
          <button onClick={() => navigate(null)} className="underline">Volver</button>
        </div>
      ) : (
        <RegionList regions={allRegions} dateMessage={dateMessage} onSelect={(id) => navigate(id)} onRefresh={loadAll} />
      )}
    </div>
  );
    }

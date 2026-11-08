// Utilidades puras del conector de GanaderoOS (sin Firebase).

const crypto = require("crypto");

/** Día de hoy en Venezuela, "YYYY-MM-DD". */
function hoy(ahora = new Date()) {
    const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(ahora);
    return p; // en-CA ya da YYYY-MM-DD
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida "YYYY-MM-DD" con un día que exista. Devuelve la fecha o lanza. */
function fechaValida(v, campo = "fecha") {
    if (typeof v !== "string" || !RE_FECHA.test(v)) throw new Error(`${campo}: debe ser "AAAA-MM-DD" (llegó ${JSON.stringify(v)}).`);
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
        throw new Error(`${campo}: el día ${v} no existe.`);
    }
    return v;
}

/** Días entre dos fechas "YYYY-MM-DD" (b − a). */
function diasEntre(a, b) {
    if (!a || !b) return null;
    const ta = Date.parse(String(a).slice(0, 10) + "T00:00:00Z");
    const tb = Date.parse(String(b).slice(0, 10) + "T00:00:00Z");
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
    return Math.round((tb - ta) / 86400000);
}

function sumarDias(fecha, n) {
    const t = Date.parse(String(fecha).slice(0, 10) + "T00:00:00Z");
    return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

const mesDe = (f) => (typeof f === "string" && f.length >= 7 ? f.slice(0, 7) : null);
const anioDe = (f) => (typeof f === "string" && f.length >= 4 ? f.slice(0, 4) : null);

/** Semana ISO "AAAA-Www". */
function semanaDe(f) {
    if (!f || !RE_FECHA.test(String(f).slice(0, 10))) return null;
    const d = new Date(Date.parse(String(f).slice(0, 10) + "T00:00:00Z"));
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dia);
    const y = d.getUTCFullYear();
    const sem = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return `${y}-W${String(sem).padStart(2, "0")}`;
}

const r2 = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const r1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null);
const pct = (a, b) => (b > 0 ? r1((a / b) * 100) : null);

function promedio(xs) {
    const v = xs.filter(Number.isFinite);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
function mediana(xs) {
    const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
function desviacion(xs) {
    const v = xs.filter(Number.isFinite);
    if (v.length < 2) return null;
    const p = promedio(v);
    return Math.sqrt(v.reduce((s, x) => s + (x - p) ** 2, 0) / (v.length - 1));
}

const normId = (v) => String(v ?? "").trim().toUpperCase();
const normNombre = (v) => String(v ?? "").trim().toLowerCase();

/** Copia sin `undefined`, `NaN`/`Infinity` ni campos internos de la app (`_synced`). */
function limpiarParaGuardar(v) {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
    if (Array.isArray(v)) return v.map(limpiarParaGuardar).filter(x => x !== undefined);
    if (typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
        const o = {};
        for (const [k, x] of Object.entries(v)) {
            if (k === "_synced") continue;
            const c = limpiarParaGuardar(x);
            if (c !== undefined) o[k] = c;
        }
        return o;
    }
    return v;
}

/** Valor serializable a JSON (Timestamps → ISO). */
function aJson(v) {
    if (v === null || v === undefined) return v;
    if (typeof v?.toDate === "function" && typeof v?.toMillis === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(aJson);
    if (typeof v === "object") {
        const o = {};
        for (const [k, x] of Object.entries(v)) if (k !== "_synced") o[k] = aJson(x);
        return o;
    }
    return v;
}

/** JSON estable (claves ordenadas) para firmar un documento. */
function estable(v) {
    const j = aJson(v);
    const orden = (x) => {
        if (Array.isArray(x)) return x.map(orden);
        if (x && typeof x === "object") return Object.keys(x).sort().reduce((o, k) => { o[k] = orden(x[k]); return o; }, {});
        return x;
    };
    return JSON.stringify(orden(j));
}
const firma = (doc) => (doc == null ? null : crypto.createHash("sha256").update(estable(doc)).digest("hex").slice(0, 16));

/** Edad en meses a una fecha. */
function edadMeses(nacimiento, a) {
    const d = diasEntre(nacimiento, a);
    return d == null ? null : d / 30.4375;
}

module.exports = {
    hoy, fechaValida, diasEntre, sumarDias, mesDe, anioDe, semanaDe,
    r1, r2, pct, promedio, mediana, desviacion,
    normId, normNombre, limpiarParaGuardar, aJson, estable, firma, edadMeses, RE_FECHA,
};

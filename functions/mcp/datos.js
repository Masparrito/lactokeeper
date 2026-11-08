// Acceso a Firestore del conector: lectura acotada al dueño de la finca y
// escritura con copia previa (para deshacer).

const admin = require("firebase-admin");
const { NOMBRES } = require("./esquema");
const U = require("./util");

const db = () => admin.firestore();

// ── Cuenta (dueño de los datos) ─────────────────────────────────────────────
// Todos los documentos de GanaderoOS llevan `userId`. El conector trabaja con
// UNA cuenta: la elegida con `elegir_cuenta` (guardada en mcp_config/cuenta);
// si no se eligió y en Firebase Auth hay una sola, esa.

async function cuentaActiva() {
    const snap = await db().doc("mcp_config/cuenta").get();
    if (snap.exists && snap.data().uid) return { uid: snap.data().uid, email: snap.data().email || null, origen: "elegida" };
    const lista = await admin.auth().listUsers(10);
    if (lista.users.length === 1) return { uid: lista.users[0].uid, email: lista.users[0].email || null, origen: "única cuenta" };
    const err = new Error(`Hay ${lista.users.length} cuentas en GanaderoOS y no se ha elegido con cuál trabajar. Usa 'cuentas' para verlas y 'elegir_cuenta' para fijar la de la finca.`);
    err.sinCuenta = true;
    throw err;
}

async function listarCuentas() {
    const lista = await admin.auth().listUsers(50);
    const out = [];
    for (const u of lista.users) {
        const n = (await db().collection("animals").where("userId", "==", u.uid).count().get()).data().count;
        const cfg = await db().doc(`configuracion/${u.uid}`).get();
        out.push({ uid: u.uid, email: u.email || null, nombre: u.displayName || null, finca: cfg.exists ? cfg.data().nombreFinca || null : null, animales: n, ultimoAcceso: u.metadata.lastSignInTime || null });
    }
    return out;
}

async function elegirCuenta({ uid, email }) {
    let u;
    if (uid) u = await admin.auth().getUser(uid);
    else if (email) u = await admin.auth().getUserByEmail(String(email).trim());
    else throw new Error("indica uid o email.");
    await db().doc("mcp_config/cuenta").set({ uid: u.uid, email: u.email || null, elegidaEn: admin.firestore.Timestamp.now() });
    return { uid: u.uid, email: u.email || null };
}

// ── Lectura ─────────────────────────────────────────────────────────────────

/** Lee las colecciones pedidas (todas por defecto) del dueño, más su configuración. */
async function cargar(uid, colecciones = NOMBRES) {
    const datos = {};
    await Promise.all(NOMBRES.map(async (c) => {
        if (!colecciones.includes(c)) { datos[c] = []; return; }
        const snap = await db().collection(c).where("userId", "==", uid).get();
        datos[c] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }));
    const cfg = await db().doc(`configuracion/${uid}`).get();
    datos.config = cfg.exists ? cfg.data() : {};
    return datos;
}

// ── Escritura con copia previa ──────────────────────────────────────────────

const POR_TANDA = 200; // 200 documentos + 200 copias = 400 escrituras (< 500 por lote)

/**
 * Aplica escrituras ({col, id, op:'set'|'delete', data}) guardando en
 * `mcp_cambios` la versión exacta anterior de cada documento. Todas quedan bajo
 * un mismo `lote` que se deshace con `deshacer`. Si hay varias escrituras al
 * mismo documento, manda la última.
 */
async function aplicar(uid, escrituras, meta = {}) {
    const ultimas = new Map();
    for (const e of escrituras) ultimas.set(`${e.col}/${e.id}`, e);
    const ops = [...ultimas.values()];
    if (!ops.length) return { lote: null, documentos: 0 };
    const lote = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
    const ahora = admin.firestore.Timestamp.now();
    // Versión anterior de cada documento.
    const refs = ops.map(o => db().collection(o.col).doc(String(o.id)));
    const antes = [];
    for (let i = 0; i < refs.length; i += 300) antes.push(...await db().getAll(...refs.slice(i, i + 300)));
    // Ningún documento de OTRA cuenta se toca.
    antes.forEach((s, i) => {
        if (s.exists && s.data().userId && s.data().userId !== uid) throw new Error(`${ops[i].col}/${ops[i].id} pertenece a otra cuenta: no se toca.`);
    });
    const porCol = {};
    for (let i = 0; i < ops.length; i += POR_TANDA) {
        const b = db().batch();
        ops.slice(i, i + POR_TANDA).forEach((o, j) => {
            const n = i + j;
            const ref = refs[n];
            const prev = antes[n].exists ? antes[n].data() : null;
            if (o.op === "delete") b.delete(ref); else b.set(ref, o.data);
            b.set(db().collection("mcp_cambios").doc(`${lote}_${String(n).padStart(5, "0")}`), {
                lote, n, coleccion: o.col, docId: String(o.id), op: o.op, uid, fecha: ahora,
                antes: prev, firmaDespues: o.op === "delete" ? null : U.firma(o.data),
            });
            porCol[o.col] = porCol[o.col] || { creados: 0, cambiados: 0, borrados: 0 };
            porCol[o.col][o.op === "delete" ? "borrados" : prev ? "cambiados" : "creados"]++;
        });
        await b.commit();
    }
    await db().doc(`mcp_lotes/${lote}`).set({
        lote, uid, fecha: ahora, herramienta: meta.herramienta || null, resumen: meta.resumen || null,
        motivo: meta.motivo || null, documentos: ops.length, porColeccion: porCol, deshecho: false, deshaceA: meta.deshaceA || null,
    });
    return { lote, documentos: ops.length, porColeccion: porCol };
}

/** Restaura cada documento de un lote a como estaba. Se detiene si alguien lo tocó después. */
async function deshacer(uid, lote, { forzar = false } = {}) {
    const meta = await db().doc(`mcp_lotes/${lote}`).get();
    if (!meta.exists) throw new Error(`el cambio ${lote} no existe (mira historial_cambios).`);
    if (meta.data().uid !== uid) throw new Error("ese cambio es de otra cuenta.");
    if (meta.data().deshecho) throw new Error(`el cambio ${lote} ya se deshizo.`);
    const snap = await db().collection("mcp_cambios").where("lote", "==", lote).get();
    const cambios = snap.docs.map(d => d.data()).sort((a, b) => b.n - a.n);
    const actuales = [];
    const refs = cambios.map(c => db().collection(c.coleccion).doc(c.docId));
    for (let i = 0; i < refs.length; i += 300) actuales.push(...await db().getAll(...refs.slice(i, i + 300)));
    const conflictos = [];
    cambios.forEach((c, i) => {
        const hoy = actuales[i].exists ? U.firma(actuales[i].data()) : null;
        if (hoy !== c.firmaDespues) conflictos.push(`${c.coleccion}/${c.docId}`);
    });
    if (conflictos.length && !forzar) {
        return { deshecho: false, conflictos, mensaje: `${conflictos.length} documento(s) cambiaron después (en la app u otro cambio). No se deshizo nada. Repite con forzar: true para restaurarlos igual.` };
    }
    const escrituras = cambios.map(c => (c.antes ? { col: c.coleccion, id: c.docId, op: "set", data: c.antes } : { col: c.coleccion, id: c.docId, op: "delete" }));
    const r = await aplicar(uid, escrituras, { herramienta: "deshacer_cambio", resumen: `Deshace ${lote}`, deshaceA: lote });
    await db().doc(`mcp_lotes/${lote}`).update({ deshecho: true, deshechoPor: r.lote });
    return { deshecho: true, restaurados: cambios.length, conflictosIgnorados: conflictos, nuevoCambio: r.lote };
}

async function historial(uid, limite = 20) {
    const snap = await db().collection("mcp_lotes").where("uid", "==", uid).get();
    return snap.docs.map(d => d.data()).sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis()).slice(0, limite).map(U.aJson);
}

module.exports = { cuentaActiva, listarCuentas, elegirCuenta, cargar, aplicar, deshacer, historial };

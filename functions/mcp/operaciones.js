// Operaciones de carga del conector, PURAS: reciben los datos del usuario ya
// leídos y devuelven la lista de escrituras. Replican lo que hace la app en
// src/context/DataContext.tsx (eventos de la línea de tiempo, estado de la
// madre al parir, número de servicio, secado, etc.) para que un dato cargado
// por el conector sea idéntico a uno cargado a mano.
//
// Regla de todas: se valida TODO antes de escribir. Si algún registro tiene un
// error no se escribe nada (salvo `omitirErrores: true`, que escribe los
// válidos y lista los rechazados).

const crypto = require("crypto");
const { COLECCIONES, UNICOS, ID_ARETE } = require("./esquema");
const U = require("./util");

const nuevoId = () => crypto.randomUUID();

/** Estado en memoria de los datos del usuario, que va registrando escrituras. */
class Estado {
    constructor(datos, ctx) {
        this.ctx = ctx;
        this.config = datos.config || {};
        this.tablas = {};
        for (const c of Object.keys(COLECCIONES)) {
            this.tablas[c] = new Map((datos[c] || []).map(x => [x.id, x]));
        }
        this.escrituras = [];
        this.avisos = [];
        this.diario = []; // [col, id, valor anterior] para revertir un ítem fallido
    }
    marca() { return { e: this.escrituras.length, a: this.avisos.length, d: this.diario.length }; }
    revertir(m) {
        while (this.diario.length > m.d) {
            const [col, id, prev] = this.diario.pop();
            if (prev === undefined) this.tablas[col].delete(id); else this.tablas[col].set(id, prev);
        }
        this.escrituras.length = m.e;
        this.avisos.length = m.a;
    }
    lista(col) { return [...this.tablas[col].values()]; }
    get(col, id) { return this.tablas[col].get(id); }
    /** Crea o reemplaza el documento completo. */
    poner(col, doc) {
        const d = U.limpiarParaGuardar({ ...doc, userId: this.ctx.uid });
        this.diario.push([col, d.id, this.tablas[col].get(d.id)]);
        this.tablas[col].set(d.id, d);
        this.escrituras.push({ col, id: d.id, op: "set", data: d });
        return d;
    }
    /** Cambia campos de un documento existente (null en un campo = borrarlo). */
    cambiar(col, id, cambios) {
        const actual = this.tablas[col].get(id);
        if (!actual) throw new Error(`${col}/${id} no existe.`);
        const nuevo = { ...actual };
        for (const [k, v] of Object.entries(cambios)) {
            if (v === undefined) continue;
            if (v === null && k !== "sireLotId") delete nuevo[k]; else nuevo[k] = v;
        }
        nuevo.userId = this.ctx.uid;
        return this.poner(col, nuevo);
    }
    borrar(col, id) {
        if (!this.tablas[col].has(id)) return false;
        this.diario.push([col, id, this.tablas[col].get(id)]);
        this.tablas[col].delete(id);
        this.escrituras.push({ col, id, op: "delete" });
        return true;
    }
    evento(animalId, date, type, details, extra = {}) {
        return this.poner("events", { id: nuevoId(), animalId, date, type, details, ...extra });
    }
    /** Busca por nombre sin distinguir mayúsculas (lotes, orígenes, productos…). */
    porNombre(col, nombre) {
        const n = U.normNombre(nombre);
        return this.lista(col).find(x => U.normNombre(x.name) === n);
    }
    asegurarLote(nombre) {
        if (!nombre) return null;
        const l = this.porNombre("lots", nombre);
        if (l) return l;
        this.avisos.push(`Se creó el lote "${nombre}" (no existía).`);
        return this.poner("lots", { id: nuevoId(), name: String(nombre).trim() });
    }
    asegurarOrigen(nombre) {
        if (!nombre) return null;
        const o = this.porNombre("origins", nombre);
        if (o) return o;
        this.avisos.push(`Se creó el origen "${nombre}" (no existía).`);
        return this.poner("origins", { id: nuevoId(), name: String(nombre).trim() });
    }
    animal(id) { return this.get("animals", U.normId(id)); }
    /** Padre conocido: animal o reproductor externo. */
    padreExiste(id) { const x = U.normId(id); return !!(this.get("animals", x) || this.get("fathers", x)); }
}

/** Corre la validación + escritura de cada ítem; junta los errores. */
function porItem(items, est, fn, { omitirErrores = false } = {}) {
    if (!Array.isArray(items) || items.length === 0) throw new Error("La lista está vacía.");
    const errores = [];
    const hechos = [];
    items.forEach((it, i) => {
        const m = est.marca();
        try {
            const r = fn(it, i);
            if (r !== undefined) hechos.push(r);
        } catch (e) {
            errores.push({ fila: i + 1, dato: it, error: String(e.message || e) });
            est.revertir(m); // deshace en memoria lo que este ítem alcanzó a escribir
        }
    });
    if (errores.length && !omitirErrores) {
        est.escrituras = [];
        return { escrituras: [], errores, hechos: [], avisos: est.avisos, nadaEscrito: true };
    }
    return { escrituras: est.escrituras, errores, hechos, avisos: est.avisos };
}

// ── Animales ────────────────────────────────────────────────────────────────

const SEXOS = new Set(["Hembra", "Macho"]);
const ETAPAS_H = new Set(["Cabrita", "Cabritona", "Cabra Primípara", "Cabra Multípara", "Cabra"]);
const ETAPAS_M = new Set(["Cabrito", "Macho de Levante", "Reproductor"]);
const ESTADOS_REPRO = new Set(["Vacía", "En Servicio", "Preñada", "Post-Parto", "No Aplica", "Servida"]);
const STATUS = new Set(["Activo", "Venta", "Muerte", "Descarte"]);

function sexoNormal(v) {
    const s = String(v || "").trim().toLowerCase();
    if (["hembra", "h", "f", "female"].includes(s)) return "Hembra";
    if (["macho", "m", "male"].includes(s)) return "Macho";
    throw new Error(`sexo inválido: ${JSON.stringify(v)} (Hembra o Macho).`);
}

function partosValidos(est, id) {
    return est.lista("parturitions").filter(p => p.goatId === id && ["Normal", "Con Mortinatos", "Aborto"].includes(p.parturitionOutcome || "")).length;
}

/** Misma regla que updateAnimal de la app. */
function etapaCalculada(est, actual, cambios) {
    if (cambios.lifecycleStage) return cambios.lifecycleStage;
    const sexo = cambios.sex || actual.sex;
    const destetado = !!(cambios.weaningDate || actual.weaningDate || cambios.weaningWeight || actual.weaningWeight);
    if (sexo === "Hembra") {
        if (partosValidos(est, actual.id) > 0) return "Cabra";
        if (actual.lifecycleStage === "Cabra") return "Cabra";
        if (actual.lifecycleStage === "Cabritona") return "Cabritona";
        return destetado ? "Cabritona" : "Cabrita";
    }
    if (actual.lifecycleStage === "Reproductor") return "Reproductor";
    const meses = U.edadMeses(cambios.birthDate || actual.birthDate, est.ctx.hoy);
    if (meses != null && meses > 12) return "Reproductor";
    return destetado ? "Macho de Levante" : "Cabrito";
}

/** Resuelve el ID final con la regla de colisión de la app (-H / -M). */
function idDisponible(est, idPedido, sexo) {
    let id = U.normId(idPedido);
    if (!id) throw new Error("falta el id (arete).");
    if (id.includes("/")) throw new Error("el id no puede llevar '/'.");
    const exacto = est.get("animals", id);
    const suf = sexo === "Macho" ? "-M" : "-H";
    if (exacto) {
        if (exacto.sex === sexo) throw new Error(`el ID '${id}' ya está registrado para un animal del mismo sexo (${sexo}).`);
        id = `${id}${suf}`;
        if (est.get("animals", id)) throw new Error(`el ID '${id}' ya está registrado.`);
        est.avisos.push(`'${U.normId(idPedido)}' ya existe con el otro sexo: se guardó como '${id}'.`);
        return id;
    }
    if (est.get("animals", `${id}${suf}`)) throw new Error(`el ID '${id}' ya está registrado (variante ${suf}).`);
    return id;
}

function registrarAnimales(datos, ctx, { animales, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(animales, est, (a) => {
        const sex = sexoNormal(a.sex ?? a.sexo);
        const birthDate = a.birthDate ?? a.fechaNacimiento ?? "N/A";
        if (birthDate !== "N/A") U.fechaValida(birthDate, "birthDate");
        const id = idDisponible(est, a.id, sex);
        const status = a.status || "Activo";
        if (!STATUS.has(status)) throw new Error(`status inválido: ${status}.`);
        let lifecycleStage = a.lifecycleStage;
        if (lifecycleStage && !(sex === "Hembra" ? ETAPAS_H : ETAPAS_M).has(lifecycleStage)) throw new Error(`etapa '${lifecycleStage}' no corresponde a ${sex}.`);
        if (!lifecycleStage) {
            const destetado = !!(a.weaningDate || a.weaningWeight);
            const meses = birthDate !== "N/A" ? U.edadMeses(birthDate, ctx.hoy) : null;
            if (sex === "Hembra") lifecycleStage = destetado || (meses != null && meses >= 12) ? "Cabritona" : "Cabrita";
            else lifecycleStage = meses != null && meses > 12 ? "Reproductor" : destetado ? "Macho de Levante" : "Cabrito";
        }
        let reproductiveStatus = a.reproductiveStatus;
        if (reproductiveStatus && !ESTADOS_REPRO.has(reproductiveStatus)) throw new Error(`estado reproductivo inválido: ${reproductiveStatus}.`);
        if (!reproductiveStatus) reproductiveStatus = sex === "Hembra" && ["Cabritona", "Cabra", "Cabra Primípara", "Cabra Multípara"].includes(lifecycleStage) ? "Vacía" : "No Aplica";
        if (a.weaningDate) U.fechaValida(a.weaningDate, "weaningDate");
        const motherId = a.motherId ? U.normId(a.motherId) : undefined;
        const fatherId = a.fatherId ? U.normId(a.fatherId) : undefined;
        if (motherId && !est.get("animals", motherId)) est.avisos.push(`${id}: la madre '${motherId}' no está registrada.`);
        if (fatherId && !est.padreExiste(fatherId)) est.avisos.push(`${id}: el padre '${fatherId}' no está registrado.`);
        const location = a.location ?? a.lote ?? "";
        if (location) est.asegurarLote(location);
        if (a.origin) est.asegurarOrigen(a.origin);
        const doc = {
            ...a, id, sex, birthDate, status, lifecycleStage, reproductiveStatus, location,
            motherId, fatherId, createdAt: ctx.ahora,
        };
        delete doc.sexo; delete doc.fechaNacimiento; delete doc.lote;
        est.poner("animals", doc);
        const fn = birthDate !== "N/A" ? ` F.N.: ${birthDate}.` : " F.N. desconocida.";
        est.evento(id, ctx.hoy, "Registro", `${doc.isReference ? "Animal de Referencia" : "Animal (Activo)"} registrado en el sistema.${fn}`, location ? { lotName: location } : {});
        if (status !== "Activo") est.evento(id, a.endDate || ctx.hoy, "Cambio de Estado", `Animal dado de baja: ${status}${a.cullReason ? ` (${a.cullReason})` : ""}`);
        return id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} animal(es) registrados.` };
}

function actualizarAnimales(datos, ctx, { cambios: lista, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(lista, est, ({ id: idPedido, cambios = {}, fecha }) => {
        const id = U.normId(idPedido);
        const actual = est.get("animals", id);
        if (!actual) throw new Error(`el animal '${id}' no existe.`);
        if (cambios.id && U.normId(cambios.id) !== id) throw new Error("el ID no se cambia aquí (usa la app: Configuración → protección de ID).");
        const c = { ...cambios };
        delete c.id; delete c.userId; delete c.createdAt;
        const dia = fecha ? U.fechaValida(fecha) : ctx.hoy;
        if (c.sex) c.sex = sexoNormal(c.sex);
        if (c.status && !STATUS.has(c.status)) throw new Error(`status inválido: ${c.status}.`);
        if (c.reproductiveStatus && !ESTADOS_REPRO.has(c.reproductiveStatus)) throw new Error(`estado reproductivo inválido: ${c.reproductiveStatus}.`);
        for (const k of ["birthDate", "weaningDate", "endDate"]) if (c[k] && c[k] !== "N/A") U.fechaValida(c[k], k);
        if (c.motherId) c.motherId = U.normId(c.motherId);
        if (c.fatherId) c.fatherId = U.normId(c.fatherId);
        if (c.status && c.status !== "Activo" && !c.endDate && !actual.endDate) c.endDate = dia;
        if (c.location) est.asegurarLote(c.location);
        if (c.origin) est.asegurarOrigen(c.origin);
        const etapa = etapaCalculada(est, actual, c);
        if (etapa !== actual.lifecycleStage) c.lifecycleStage = etapa;
        est.cambiar("animals", id, c);
        if (c.location !== undefined && c.location !== actual.location) {
            est.evento(id, dia, "Movimiento", `Movido de '${actual.location || "Sin Asignar"}' a '${c.location || "Sin Asignar"}'`, { lotName: c.location || "" });
        }
        if (c.reproductiveStatus !== undefined && c.reproductiveStatus !== actual.reproductiveStatus) {
            est.evento(id, dia, "Cambio de Estado", `Estado reproductivo: ${c.reproductiveStatus}`);
        }
        if (c.status !== undefined && c.status !== actual.status) {
            est.evento(id, c.endDate || dia, "Cambio de Estado", `Animal dado de baja: ${c.status} ${c.cullReason ? `(${c.cullReason})` : ""}`.trim());
        }
        if ((c.weaningDate && c.weaningDate !== actual.weaningDate) || (c.weaningWeight && !c.weaningDate && c.weaningWeight !== actual.weaningWeight)) {
            const peso = c.weaningWeight ?? actual.weaningWeight;
            est.evento(id, c.weaningDate || actual.weaningDate || dia, "Destete", `Destete: ${peso ?? "?"} Kg.`, peso ? { metaWeight: peso } : {});
        }
        return id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} animal(es) actualizados.` };
}

// ── Pesajes ─────────────────────────────────────────────────────────────────

function registrarPesajes(datos, ctx, { tipo, fecha, pesajes, siExiste = "omitir", omitirErrores }) {
    if (!["leche", "corporal"].includes(tipo)) throw new Error("tipo debe ser 'leche' o 'corporal'.");
    const leche = tipo === "leche";
    const col = leche ? "weighings" : "bodyWeighings";
    const campo = leche ? "goatId" : "animalId";
    const est = new Estado(datos, ctx);
    let omitidos = 0;
    const r = porItem(pesajes, est, (p) => {
        const id = U.normId(p.animalId ?? p.goatId ?? p.id);
        const dia = U.fechaValida(p.fecha ?? p.date ?? fecha, "fecha");
        const kg = Number(String(p.kg).replace(",", "."));
        if (!Number.isFinite(kg) || kg <= 0) throw new Error(`${id}: kg inválido (${JSON.stringify(p.kg)}).`);
        if (leche && kg > 15) throw new Error(`${id}: ${kg} kg de leche en un día no es creíble (máx. 15).`);
        if (!leche && kg > 150) throw new Error(`${id}: ${kg} kg de peso vivo no es creíble (máx. 150).`);
        const a = est.get("animals", id);
        if (!a) throw new Error(`el animal '${id}' no existe.`);
        if (leche && a.sex !== "Hembra") throw new Error(`${id} es macho: no lleva pesaje de leche.`);
        if (dia > ctx.hoy) throw new Error(`${id}: la fecha ${dia} es futura.`);
        if (leche) {
            const lact = est.lista("parturitions").filter(x => x.goatId === id && x.parturitionDate <= dia)
                .sort((x, y) => (x.parturitionDate < y.parturitionDate ? 1 : -1))[0];
            if (!lact) est.avisos.push(`${id}: no tiene parto registrado antes del ${dia}; el pesaje no entra a ninguna lactancia (cárgale el parto, o uno provisional).`);
            else if (lact.status === "seca" && lact.dryingStartDate && lact.dryingStartDate < dia) est.avisos.push(`${id}: su última lactancia está SECA desde ${lact.dryingStartDate}.`);
        }
        const previos = est.lista(col).filter(w => w[campo] === id && w.date === dia);
        if (previos.length) {
            if (siExiste === "omitir") { omitidos++; est.avisos.push(`${id} ${dia}: ya tenía pesaje (${previos.map(w => w.kg).join(", ")} kg); se omitió.`); return undefined; }
            if (siExiste === "reemplazar") {
                for (const w of previos) {
                    est.borrar(col, w.id);
                    const tipoEv = leche ? "Pesaje Lechero" : "Pesaje Corporal";
                    est.lista("events").filter(e => e.animalId === id && e.date === dia && e.type === tipoEv).forEach(e => est.borrar("events", e.id));
                }
            }
            // "agregar": se deja el anterior y se suma uno nuevo.
        }
        const w = est.poner(col, { id: nuevoId(), [campo]: id, date: dia, kg });
        est.evento(id, dia, leche ? "Pesaje Lechero" : "Pesaje Corporal", `Registro de ${kg} Kg`);
        if (!leche) est.cambiar("animals", id, { lastWeighing: masReciente(est, id) });
        return w.id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} pesaje(s) de ${tipo} registrados${omitidos ? `, ${omitidos} omitidos por ya existir` : ""}.` };
}

function masReciente(est, id) {
    const w = est.lista("bodyWeighings").filter(x => x.animalId === id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return w ? { date: w.date, kg: w.kg } : null;
}

// ── Partos ──────────────────────────────────────────────────────────────────

const TIPOS_PARTO = ["", "Simple", "Doble", "Triple", "Cuádruple", "Quíntuple"];

function registrarPartos(datos, ctx, { partos, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(partos, est, (p) => {
        const madre = U.normId(p.madre ?? p.goatId);
        const fecha = U.fechaValida(p.fecha ?? p.parturitionDate, "fecha");
        if (fecha > ctx.hoy) throw new Error(`fecha futura ${fecha}.`);
        const m = est.get("animals", madre);
        if (!m) throw new Error(`la madre '${madre}' no existe.`);
        if (m.sex !== "Hembra") throw new Error(`'${madre}' es macho.`);
        const provisional = !!p.provisional;
        const resultado = p.resultado ?? p.parturitionOutcome ?? "Normal";
        if (!["Normal", "Aborto", "Con Mortinatos"].includes(resultado)) throw new Error(`resultado inválido: ${resultado}.`);
        const padre = U.normId(p.padre ?? p.sireId ?? "");
        if (!provisional && !padre) throw new Error("falta el padre (semental).");
        if (padre && !est.padreExiste(padre)) {
            est.poner("fathers", { id: padre, name: padre });
            est.avisos.push(`El padre '${padre}' no existía: se creó como reproductor externo.`);
        }
        const crias = (p.crias ?? p.liveOffspring ?? []).map((k, j) => {
            const sexo = sexoNormal(k.sexo ?? k.sex);
            const kid = String(k.id || "").trim();
            if (!kid) throw new Error(`cría ${j + 1}: falta el id.`);
            const peso = k.peso ?? k.birthWeight;
            const pesoNum = peso == null || peso === "" ? undefined : Number(String(peso).replace(",", "."));
            if (pesoNum !== undefined && (!Number.isFinite(pesoNum) || pesoNum <= 0 || pesoNum > 10)) throw new Error(`cría ${kid}: peso al nacer inválido (${peso}).`);
            return { id: idDisponible(est, kid, sexo), sex: sexo, birthWeight: pesoNum, lote: k.lote };
        });
        if (resultado === "Aborto" && crias.length) throw new Error("un aborto no lleva crías vivas.");
        const muertas = Number(p.muertas ?? 0);
        const total = Number(p.totalCrias ?? p.offspringCount ?? crias.length + muertas);
        if (!provisional && resultado !== "Aborto" && total < 1) throw new Error("un parto lleva al menos una cría (viva o muerta).");
        if (total < crias.length) throw new Error("las crías totales no pueden ser menos que las vivas.");
        if (resultado === "Normal" && total > crias.length) throw new Error(`hay ${total - crias.length} cría(s) sin id: si nacieron muertas, usa resultado 'Con Mortinatos'.`);
        const dup = est.lista("parturitions").find(x => x.goatId === madre && x.parturitionDate === fecha && !x.provisional);
        if (dup && !provisional) throw new Error(`'${madre}' ya tiene un parto el ${fecha}.`);
        // Un parto real reemplaza la lactancia PROVISIONAL de esa madre (lo que hace la app).
        if (!provisional) {
            for (const prov of est.lista("parturitions").filter(x => x.goatId === madre && x.provisional)) {
                est.borrar("parturitions", prov.id);
                est.avisos.push(`${madre}: se reemplazó su lactancia provisional del ${prov.parturitionDate}.`);
            }
        }
        const inducida = !!(p.lactanciaInducida ?? p.inducedLactation);
        const parto = est.poner("parturitions", {
            id: nuevoId(), goatId: madre, parturitionDate: fecha, sireId: padre || "", offspringCount: total,
            parturitionType: p.tipo ?? p.parturitionType ?? (TIPOS_PARTO[Math.min(total, 5)] || "Simple"),
            parturitionOutcome: resultado,
            status: resultado === "Aborto" && !inducida ? "finalizada" : "activa",
            dryingStartDate: inducida && resultado === "Aborto" ? fecha : undefined,
            liveOffspring: crias.length ? crias.map(k => ({ id: k.id, sex: k.sex, birthWeight: k.birthWeight })) : undefined,
            provisional: provisional || undefined,
        });
        const cambiosMadre = {};
        if (m.lifecycleStage !== "Cabra") cambiosMadre.lifecycleStage = "Cabra";
        if (m.sireLotId) cambiosMadre.sireLotId = null;
        if (m.reproductiveStatus !== "Post-Parto") cambiosMadre.reproductiveStatus = "Post-Parto";
        if (Object.keys(cambiosMadre).length) est.cambiar("animals", madre, cambiosMadre);
        if (!provisional) {
            let tipo = "Parto";
            let det = `Parto ${parto.parturitionType} (${total} crías) con Semental: ${padre}. Vivas: ${crias.length}.`;
            if (resultado === "Aborto") { tipo = "Aborto"; det = `Aborto registrado con Semental: ${padre}. ${inducida ? "Se induce lactancia." : ""}`.trim(); }
            else if (resultado === "Con Mortinatos") {
                if (!crias.length) { tipo = "Aborto"; det = `Mortinato completo (${total} crías). Padre: ${padre}.`; }
                else det = `Padre: ${padre}. Crías: ${crias.length} vivas, ${total - crias.length} mortinatos.`;
            }
            est.evento(madre, fecha, tipo, det);
        }
        for (const k of crias) {
            if (k.lote) est.asegurarLote(k.lote);
            est.poner("animals", {
                id: k.id, sex: k.sex, status: "Activo", birthDate: fecha, motherId: madre, fatherId: padre || undefined,
                birthWeight: k.birthWeight, createdAt: ctx.ahora, lifecycleStage: k.sex === "Hembra" ? "Cabrita" : "Cabrito",
                location: k.lote || "", reproductiveStatus: "No Aplica", isReference: false,
            });
            est.evento(k.id, fecha, "Nacimiento", `Nacido con ${k.birthWeight || "N/A"} Kg. Madre: ${madre}. Padre: ${padre || "?"}.`);
        }
        return parto.id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} parto(s) registrados.` };
}

// ── Servicios ───────────────────────────────────────────────────────────────

function registrarServicios(datos, ctx, { servicios, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const gest = Number(est.config.diasGestacion) || 150;
    const r = porItem(servicios, est, (s) => {
        const hembra = U.normId(s.hembra ?? s.femaleId);
        const fecha = U.fechaValida(s.fecha ?? s.serviceDate, "fecha");
        const a = est.get("animals", hembra);
        if (!a) throw new Error(`la hembra '${hembra}' no existe.`);
        if (a.sex !== "Hembra") throw new Error(`'${hembra}' es macho.`);
        let lote = s.sireLotId ? est.get("sireLots", s.sireLotId) : null;
        if (s.sireLotId && !lote) throw new Error(`el lote de monta ${s.sireLotId} no existe.`);
        if (!lote && s.semental) {
            const sem = U.normId(s.semental);
            const temporadaVigente = (l) => {
                const t = est.get("breedingSeasons", l.seasonId);
                return t && t.startDate <= fecha && (t.endDate >= fecha || t.status === "Activo");
            };
            const candidatos = est.lista("sireLots").filter(l => l.sireId === sem && (!l.startDate || l.startDate <= fecha) && (!l.retiredDate || l.retiredDate >= fecha));
            lote = candidatos.find(temporadaVigente) || (candidatos.length === 1 ? candidatos[0] : null);
            if (!lote) throw new Error(`no hay un lote de monta del semental '${sem}' vigente el ${fecha}: créalo con guardar_registros (breedingSeasons + sireLots).`);
        }
        if (!lote && a.sireLotId) lote = est.get("sireLots", a.sireLotId);
        if (!lote) throw new Error("indica 'semental' o 'sireLotId' (la hembra no está asignada a ningún lote de monta).");
        const partos = est.lista("parturitions").filter(p => p.goatId === hembra).sort((x, y) => (x.parturitionDate < y.parturitionDate ? 1 : -1));
        const corte = partos[0]?.parturitionDate || "2000-01-01";
        const n = est.lista("serviceRecords").filter(x => x.femaleId === hembra && x.serviceDate > corte).length + 1;
        const sr = est.poner("serviceRecords", { id: nuevoId(), sireLotId: lote.id, femaleId: hembra, serviceDate: fecha });
        est.cambiar("animals", hembra, { reproductiveStatus: "Servida" });
        const semental = est.get("fathers", lote.sireId) || est.get("animals", lote.sireId);
        est.evento(hembra, fecha, "Servicio", `Servicio #${n} (Visto) con ${semental?.name || semental?.id || lote.sireId}. Parto est.: ${U.sumarDias(fecha, gest)}`, { lotName: `Servicio #${n}` });
        return sr.id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} servicio(s) registrados.` };
}

// ── Secado ──────────────────────────────────────────────────────────────────

function secado(datos, ctx, { lactancias, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(lactancias, est, (x) => {
        const accion = x.accion;
        if (!["iniciar", "secar", "revertir"].includes(accion)) throw new Error("accion: 'iniciar' | 'secar' | 'revertir'.");
        const fecha = x.fecha ? U.fechaValida(x.fecha) : ctx.hoy;
        let p = x.parturitionId ? est.get("parturitions", x.parturitionId) : null;
        if (!p && x.animalId) {
            const id = U.normId(x.animalId);
            const busca = accion === "revertir" ? ["seca", "en-secado"] : ["activa", "en-secado"];
            p = est.lista("parturitions").filter(q => q.goatId === id && busca.includes(q.status)).sort((a, b) => (a.parturitionDate < b.parturitionDate ? 1 : -1))[0];
        }
        if (!p) throw new Error("no encontré la lactancia (da parturitionId o animalId con una lactancia en el estado correcto).");
        if (accion === "iniciar") {
            est.cambiar("parturitions", p.id, { status: "en-secado", dryingStartDate: fecha });
            est.evento(p.goatId, fecha, "Cambio de Estado", `Inició proceso de secado (Lactancia de ${p.parturitionDate})`);
        } else if (accion === "secar") {
            if (fecha < p.parturitionDate) throw new Error("la fecha de secado es anterior al parto.");
            est.cambiar("parturitions", p.id, { status: "seca", dryingStartDate: fecha });
        } else {
            est.cambiar("parturitions", p.id, { status: "activa", dryingStartDate: null });
            est.lista("events").filter(e => e.animalId === p.goatId && e.type === "Cambio de Estado" && /^(Declarada Seca|Inició proceso de secado)/.test(e.details || ""))
                .forEach(e => est.borrar("events", e.id));
        }
        return p.id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} lactancia(s) actualizadas.` };
}

// ── Sanidad ─────────────────────────────────────────────────────────────────

function mlDePresentacion(prod) {
    const v = Number(prod.presentationValue);
    if (!Number.isFinite(v) || v <= 0) return null;
    return prod.presentationUnit === "L" ? v * 1000 : v;
}

/** Dosis (ml) y costo con la regla del producto y el último peso del animal. */
function dosisYCosto(est, prod, animalId, dia) {
    let dosis = null;
    if (prod.dosageType === "fixed") dosis = Number(prod.dosageFixed) || null;
    else if (prod.dosageType === "per_kg") {
        const w = est.lista("bodyWeighings").filter(b => b.animalId === animalId && b.date <= dia).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        const kg = Number(prod.dosagePerKg_kg), ml = Number(prod.dosagePerKg_ml);
        if (w && kg > 0 && ml > 0) dosis = U.r2((w.kg / kg) * ml);
    }
    const ml = mlDePresentacion(prod);
    const costo = dosis != null && ml && Number(prod.price) > 0 ? U.r2((Number(prod.price) / ml) * dosis) : null;
    return { dosis, costo };
}

function animalesDeLote(est, lote) {
    const n = U.normNombre(lote);
    return est.lista("animals").filter(a => U.normNombre(a.location) === n && a.status === "Activo" && !a.isReference);
}

function registrarSanidad(datos, ctx, { eventos, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(eventos, est, (ev) => {
        const dia = U.fechaValida(ev.fecha ?? ev.date, "fecha");
        const tipo = String(ev.tipo ?? ev.type ?? "").trim();
        if (!tipo) throw new Error("falta el tipo (p. ej. 'Desparasitación', 'Vacunación').");
        let prod = null;
        if (ev.producto || ev.productUsed) {
            const p = ev.producto ?? ev.productUsed;
            prod = est.get("products", p) || est.porNombre("products", p);
            if (!prod) throw new Error(`el producto '${p}' no existe (créalo con guardar_registros en 'products').`);
        }
        const ids = ev.lote ? animalesDeLote(est, ev.lote).map(a => a.id) : [U.normId(ev.animalId)];
        if (ev.lote && !ids.length) throw new Error(`el lote '${ev.lote}' no tiene animales activos.`);
        const hechos = [];
        for (const id of ids) {
            if (!est.get("animals", id)) throw new Error(`el animal '${id}' no existe.`);
            const calc = prod ? dosisYCosto(est, prod, id, dia) : { dosis: null, costo: null };
            const dosis = ev.dosis != null ? Number(ev.dosis) : calc.dosis;
            let costo = ev.costo != null ? Number(ev.costo) : calc.costo;
            if (ev.dosis != null && ev.costo == null && prod) {
                const ml = mlDePresentacion(prod);
                costo = ml && Number(prod.price) > 0 ? U.r2((Number(prod.price) / ml) * dosis) : null;
            }
            const he = est.poner("healthEvents", {
                id: nuevoId(), animalId: id, lotName: ev.lote || est.get("animals", id).location || undefined, date: dia,
                activityId: ev.actividadId ?? ev.activityId, type: tipo, productUsed: prod?.id, doseApplied: dosis ?? undefined,
                unit: ev.unidad ?? (dosis != null ? "ml" : undefined), calculatedCost: costo ?? undefined, notes: ev.notas ?? ev.notes,
                executedBy: ev.ejecutadoPor ?? ev.executedBy, famachaGrade: ev.famachaGrade,
                diasRetiroLeche: prod?.withdrawalDaysMilk, diasRetiroCarne: prod?.withdrawalDaysMeat,
            });
            est.evento(id, dia, "Tratamiento", `${tipo}${prod ? ` con ${prod.name}` : ""}`, { notes: ev.notas ?? ev.notes, lotName: he.lotName });
            hechos.push(he.id);
        }
        return hechos.length;
    }, { omitirErrores });
    const total = r.hechos.reduce((s, n) => s + n, 0);
    return { ...r, resumen: `${total} evento(s) sanitarios registrados.` };
}

// ── FAMACHA (misma regla que src/utils/famachaLogic.ts) ─────────────────────

function calcularAccion(revs, animalId, fecha, score) {
    if (score <= 2) return "−";
    if (score === 5) return "+ separar";
    const prev = revs.filter(r => r.animalId === animalId && r.fecha < fecha).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    if (prev && prev.score >= 3 && (prev.accion === "+" || prev.accion === "+ separar")) return "=";
    return "+";
}

function registrarFamacha(datos, ctx, { fecha, revisiones, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(revisiones, est, (x) => {
        const id = U.normId(x.animalId);
        const dia = U.fechaValida(x.fecha ?? fecha, "fecha");
        const score = Number(x.score);
        if (![1, 2, 3, 4, 5].includes(score)) throw new Error(`${id}: score debe ser 1..5.`);
        if (!est.get("animals", id)) throw new Error(`el animal '${id}' no existe.`);
        const accion = calcularAccion(est.lista("famachaRevs"), id, dia, score);
        const dosis = x.dosis != null ? !!x.dosis : accion === "+" || accion === "+ separar";
        const rev = est.poner("famachaRevs", {
            id: `${id}_${dia}`, animalId: id, arete: id, fecha: dia, score, accion, dosis,
            producto: dosis ? (x.producto || "") : "", dispositivo: "Conector Claude", createdAt: ctx.ahora,
        });
        return { id: rev.id, accion };
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} revisión(es) FAMACHA registradas.` };
}

// ── Eventos generales ───────────────────────────────────────────────────────

const TIPOS_EVENTO = new Set(COLECCIONES.events.campos.type.split(" | "));

function registrarEventos(datos, ctx, { eventos, omitirErrores }) {
    const est = new Estado(datos, ctx);
    const r = porItem(eventos, est, (ev) => {
        const dia = U.fechaValida(ev.fecha ?? ev.date, "fecha");
        const tipo = ev.tipo ?? ev.type;
        if (!TIPOS_EVENTO.has(tipo)) throw new Error(`tipo de evento inválido: ${tipo}.`);
        const det = String(ev.detalles ?? ev.details ?? "").trim();
        if (!det) throw new Error("faltan los detalles.");
        const ids = ev.lote ? animalesDeLote(est, ev.lote).map(a => a.id) : [U.normId(ev.animalId)];
        if (ev.lote && !ids.length) throw new Error(`el lote '${ev.lote}' no tiene animales activos.`);
        for (const id of ids) {
            if (!est.get("animals", id)) throw new Error(`el animal '${id}' no existe.`);
            est.evento(id, dia, tipo, det, {
                notes: ev.notas ?? ev.notes ?? (ev.lote ? `Evento aplicado a todo el lote: ${ev.lote}` : undefined),
                lotName: ev.lote, metaWeight: ev.metaWeight, metaOutcome: ev.metaOutcome, metaSire: ev.metaSire,
            });
        }
        return ids.length;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.reduce((s, n) => s + n, 0)} evento(s) registrados.` };
}

// ── Registros genéricos (catálogos y correcciones) ──────────────────────────

function guardarRegistros(datos, ctx, { coleccion, registros, modo = "crear", omitirErrores }) {
    const def = COLECCIONES[coleccion];
    if (!def) throw new Error(`colección desconocida: ${coleccion}.`);
    if (!["crear", "actualizar", "reemplazar"].includes(modo)) throw new Error("modo: 'crear' | 'actualizar' | 'reemplazar'.");
    const est = new Estado(datos, ctx);
    const r = porItem(registros, est, (reg) => {
        const doc = { ...reg };
        delete doc.userId; delete doc._synced;
        if (ID_ARETE.has(coleccion) && doc.id) doc.id = U.normId(doc.id);
        if (modo === "crear") {
            if (coleccion === "famachaRevs" && !doc.id && doc.animalId && doc.fecha) doc.id = `${U.normId(doc.animalId)}_${doc.fecha}`;
            if (!doc.id) { if (ID_ARETE.has(coleccion)) throw new Error("falta el id."); doc.id = nuevoId(); }
            if (String(doc.id).includes("/")) throw new Error("el id no puede llevar '/'.");
            if (est.get(coleccion, doc.id)) throw new Error(`${coleccion}/${doc.id} ya existe (usa modo 'actualizar').`);
            const faltan = def.requeridos.filter(k => doc[k] === undefined || doc[k] === null || doc[k] === "");
            if (faltan.length) throw new Error(`faltan campos: ${faltan.join(", ")}.`);
            if (coleccion === "animals") doc.createdAt = ctx.ahora;
        } else {
            if (!doc.id) throw new Error("falta el id del registro a cambiar.");
            if (!est.get(coleccion, doc.id)) throw new Error(`${coleccion}/${doc.id} no existe.`);
            if (modo === "reemplazar") {
                const faltan = def.requeridos.filter(k => doc[k] === undefined || doc[k] === null || doc[k] === "");
                if (faltan.length) throw new Error(`al reemplazar faltan campos: ${faltan.join(", ")}.`);
            }
        }
        for (const [k, v] of Object.entries(doc)) {
            if (/(^date$|Date$|^fecha$)/.test(k) && typeof v === "string" && v && v !== "N/A") U.fechaValida(v, k);
        }
        const unico = UNICOS[coleccion];
        if (unico && doc[unico] !== undefined) {
            const otro = est.lista(coleccion).find(x => x.id !== doc.id && U.normNombre(x[unico]) === U.normNombre(doc[unico]));
            if (otro) throw new Error(`ya existe ${def.nombre.toLowerCase()} con ${unico} "${doc[unico]}" (id ${otro.id}). Repetirlo rompería la sincronización de la app.`);
        }
        if (modo === "actualizar") est.cambiar(coleccion, doc.id, doc);
        else est.poner(coleccion, modo === "reemplazar" && coleccion === "animals" ? { createdAt: est.get(coleccion, doc.id).createdAt, ...doc } : doc);
        return doc.id;
    }, { omitirErrores });
    if (coleccion === "animals" && modo === "crear") r.avisos.push("Para dar de alta animales conviene registrar_animales: valida el ID y crea su evento de Registro.");
    return { ...r, resumen: `${r.hechos.length} registro(s) guardados en ${coleccion}.` };
}

/** Borrado con las mismas cascadas que la app (pesaje → su evento, parto → evento, etc.). */
function borrarRegistros(datos, ctx, { coleccion, ids, forzar = false, omitirErrores }) {
    const def = COLECCIONES[coleccion];
    if (!def) throw new Error(`colección desconocida: ${coleccion}.`);
    const est = new Estado(datos, ctx);
    const r = porItem(ids, est, (idPedido) => {
        const id = ID_ARETE.has(coleccion) ? U.normId(idPedido) : String(idPedido);
        const doc = est.get(coleccion, id);
        if (!doc) throw new Error(`${coleccion}/${id} no existe.`);
        if (coleccion === "animals") {
            const rel = ["weighings:goatId", "bodyWeighings:animalId", "parturitions:goatId", "serviceRecords:femaleId", "healthEvents:animalId", "famachaRevs:animalId"]
                .map(s => s.split(":")).reduce((n, [c, k]) => n + est.lista(c).filter(x => x[k] === id).length, 0);
            const hijos = est.lista("animals").filter(a => a.motherId === id || a.fatherId === id).length;
            if ((rel || hijos) && !forzar) throw new Error(`${id} tiene ${rel} registro(s) y ${hijos} cría(s) asociados. Para sacarlo del rebaño usa actualizar_animales con status Venta/Muerte/Descarte; si de verdad quieres borrarlo, usa forzar: true.`);
            est.lista("events").filter(e => e.animalId === id).forEach(e => est.borrar("events", e.id));
        }
        if (coleccion === "weighings" || coleccion === "bodyWeighings") {
            const campo = coleccion === "weighings" ? "goatId" : "animalId";
            const tipo = coleccion === "weighings" ? "Pesaje Lechero" : "Pesaje Corporal";
            const ev = est.lista("events").find(e => e.animalId === doc[campo] && e.date === doc.date && e.type === tipo);
            if (ev) est.borrar("events", ev.id);
        }
        if (coleccion === "parturitions") {
            est.lista("events").filter(e => e.animalId === doc.goatId && e.date === doc.parturitionDate && (e.type === "Parto" || e.type === "Aborto")).forEach(e => est.borrar("events", e.id));
            if (doc.liveOffspring?.length) est.avisos.push(`Las crías del parto (${doc.liveOffspring.map(k => k.id).join(", ")}) NO se borran.`);
        }
        if (coleccion === "serviceRecords") {
            est.lista("events").filter(e => e.animalId === doc.femaleId && e.date === doc.serviceDate && e.type === "Servicio").forEach(e => est.borrar("events", e.id));
            const partos = est.lista("parturitions").filter(p => p.goatId === doc.femaleId).sort((a, b) => (a.parturitionDate < b.parturitionDate ? 1 : -1));
            const corte = partos[0]?.parturitionDate || "2000-01-01";
            const quedan = est.lista("serviceRecords").filter(s => s.femaleId === doc.femaleId && s.id !== id && s.serviceDate > corte);
            const h = est.get("animals", doc.femaleId);
            if (!quedan.length && h?.reproductiveStatus === "Servida") est.cambiar("animals", doc.femaleId, { reproductiveStatus: "Vacía" });
        }
        if (coleccion === "lots") {
            const dentro = est.lista("animals").filter(a => a.location === doc.name && !a.isReference).length;
            if (dentro && !forzar) throw new Error(`el lote '${doc.name}' tiene ${dentro} animal(es).`);
        }
        if (coleccion === "healthPlans") est.lista("planActivities").filter(a => a.healthPlanId === id).forEach(a => est.borrar("planActivities", a.id));
        est.borrar(coleccion, id);
        return id;
    }, { omitirErrores });
    return { ...r, resumen: `${r.hechos.length} registro(s) borrados de ${coleccion}.` };
}

module.exports = {
    Estado, registrarAnimales, actualizarAnimales, registrarPesajes, registrarPartos, registrarServicios,
    secado, registrarSanidad, registrarFamacha, registrarEventos, guardarRegistros, borrarRegistros,
    calcularAccion, dosisYCosto, etapaCalculada,
};

// Conector MCP de GanaderoOS para Claude (claude.ai → "conector personalizado").
//
// URL: https://us-central1-lactokeeper.cloudfunctions.net/mcp
// Clave: encabezado `X-API-Key` (= MCP_API_KEY del servidor, 40+ caracteres).
//
// Diseño (el mismo del conector de GK, probado en claude.ai):
// - Sin estado: servidor y transporte nuevos por solicitud, respuesta JSON.
// - NUNCA responde 401: claude.ai lo tomaría como OAuth o como conector caído.
//   La conexión (initialize, tools/list) se atiende siempre y la clave se exige
//   en cada HERRAMIENTA. Sin clave no se lee ni se escribe nada.
// - GET /estado: diagnóstico sin secretos (huella de la clave, últimos rechazos).
// - Toda escritura guarda la versión anterior de cada documento (mcp_cambios) y
//   se puede deshacer. Todas aceptan `simular: true` para ver qué cambiaría.

const admin = require("firebase-admin");
const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");

const U = require("./util");
const { COLECCIONES, NOMBRES } = require("./esquema");
const OP = require("./operaciones");
const INF = require("./informes");
const D = require("./datos");

if (!admin.apps.length) admin.initializeApp();

const LIMITE_RESPUESTA = 200 * 1024;
const huella = (v) => crypto.createHash("sha256").update(String(v)).digest("hex").slice(0, 8);
const claveEsperada = () => String(process.env.MCP_API_KEY || "").trim();

function claveValida(recibida, esperada) {
    if (!recibida || !esperada) return false;
    const a = Buffer.from(String(recibida)), b = Buffer.from(String(esperada));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function respuesta(obj) {
    let txt = JSON.stringify(U.aJson(obj), null, 1);
    if (txt.length > LIMITE_RESPUESTA) {
        txt = txt.slice(0, LIMITE_RESPUESTA) + `\n… [respuesta recortada: ${Math.round(txt.length / 1024)} KB. Pide menos filas (limite, filtros, desde/hasta) o sin 'detalle'.]`;
    }
    return { content: [{ type: "text", text: txt }] };
}
const fallo = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });

async function anotar(col, data) {
    try { await admin.firestore().collection(col).add({ ...data, fecha: admin.firestore.Timestamp.now() }); } catch (e) { /* diagnóstico */ }
}

/** Ejecuta una herramienta con clave, auditoría y errores legibles. */
function herramienta(nombre, fn, contexto) {
    return async (args) => {
        if (!contexto.autenticado) {
            await anotar("mcp_rechazos", { ...contexto.rechazo, herramienta: nombre });
            return fallo(contexto.rechazo?.motivo === "servidor_sin_clave"
                ? "El servidor del conector no tiene la clave configurada (MCP_API_KEY). Hay que agregarla en GitHub y volver a desplegar."
                : contexto.rechazo?.motivo === "clave_incorrecta"
                    ? "La clave X-API-Key del conector no coincide con la del servidor. Elimina el conector en claude.ai y créalo de nuevo con la clave vigente."
                    : "La llamada llegó sin el encabezado X-API-Key. Reintenta; si se repite, desconecta y reconecta el conector GanaderoOS.");
        }
        try {
            const salida = await fn(args || {});
            await anotar("mcp_auditoria", { herramienta: nombre, parametros: resumirArgs(args) });
            return respuesta(salida);
        } catch (e) {
            await anotar("mcp_auditoria", { herramienta: nombre, parametros: resumirArgs(args), error: String(e?.message || e).slice(0, 300) });
            return fallo(`Error: ${String(e?.message || e).slice(0, 800)}`);
        }
    };
}

function resumirArgs(args) {
    const s = JSON.stringify(args || {});
    return s.length > 3000 ? s.slice(0, 3000) + "…" : s;
}

const ctxDe = (cuenta) => ({ uid: cuenta.uid, hoy: U.hoy(), ahora: Date.now() });

// Colecciones que lee cada escritura. La de eventos es la más grande: solo se
// lee cuando la operación borra o revisa eventos.
const SIN_EVENTOS = NOMBRES.filter(c => c !== "events");

/** Flujo común de toda escritura: leer → validar/armar → (simular | aplicar). */
async function escribir(nombre, operacion, args, { colecciones = SIN_EVENTOS } = {}) {
    const cuenta = await D.cuentaActiva();
    const datos = await D.cargar(cuenta.uid, colecciones);
    const ctx = ctxDe(cuenta);
    const r = operacion(datos, ctx, args);
    const base = { cuenta: cuenta.email || cuenta.uid, resumen: r.resumen, avisos: r.avisos?.length ? r.avisos : undefined, errores: r.errores?.length ? r.errores : undefined };
    if (r.nadaEscrito) return { ...base, resumen: `No se escribió nada: ${r.errores.length} registro(s) con error. Corrígelos, o repite con omitirErrores: true para cargar solo los válidos.` };
    const plan = {};
    for (const e of r.escrituras) {
        plan[e.col] = plan[e.col] || { escribir: 0, borrar: 0 };
        plan[e.col][e.op === "delete" ? "borrar" : "escribir"]++;
    }
    if (args.simular) {
        return { ...base, simulacion: true, nota: "Nada se escribió. Repite sin simular para aplicarlo.", plan, muestra: r.escrituras.slice(0, 25).map(e => ({ coleccion: e.col, id: e.id, op: e.op, datos: e.data })) };
    }
    const a = await D.aplicar(cuenta.uid, r.escrituras, { herramienta: nombre, resumen: r.resumen, motivo: args.motivo });
    return { ...base, cambio: a.lote, documentos: a.documentos, porColeccion: a.porColeccion, ids: r.hechos?.length <= 200 ? r.hechos : undefined,
        nota: a.lote ? `Se puede revertir con deshacer_cambio('${a.lote}'). La app lo recibe sola en cuanto tenga conexión.` : "No había nada que escribir." };
}

// ── Esquemas comunes ────────────────────────────────────────────────────────

const zFecha = z.string().describe("AAAA-MM-DD");
const comunes = {
    simular: z.boolean().optional().describe("true = solo muestra qué se escribiría, sin escribir"),
    omitirErrores: z.boolean().optional().describe("true = carga los registros válidos aunque otros tengan error (por defecto, con un solo error no se carga nada)"),
    motivo: z.string().optional().describe("Por qué se hace el cambio (queda en el historial)"),
};
const obj = (forma) => z.object(forma).passthrough();
const zFiltro = z.object({
    campo: z.string().describe("campo (admite rutas: animal.lote, lactancia.numero…)"),
    operador: z.enum(["==", "!=", ">", ">=", "<", "<=", "en", "no_en", "contiene", "existe"]),
    valor: z.any().optional(),
});

function crearServidor(contexto = {}) {
    const h = (n, fn) => herramienta(n, fn, contexto);
    const server = new McpServer({ name: "ganaderoos", version: "1.0.0" });
    const lectura = (n, cfg, fn) => server.registerTool(n, { ...cfg, annotations: { readOnlyHint: true, openWorldHint: false } }, h(n, fn));
    const escritura = (n, cfg, fn, destructiva = false) => server.registerTool(n, { ...cfg, annotations: { readOnlyHint: false, destructiveHint: destructiva, openWorldHint: false } }, h(n, fn));

    // ── Cuenta ──────────────────────────────────────────────────────────────
    lectura("cuentas", {
        description: "Lista las cuentas de GanaderoOS (Firebase Auth) con su finca y cuántos animales tiene cada una, y cuál usa el conector.",
        inputSchema: {},
    }, async () => {
        let activa = null;
        try { activa = await D.cuentaActiva(); } catch (e) { activa = { nota: e.message }; }
        return { activa, cuentas: await D.listarCuentas() };
    });
    escritura("elegir_cuenta", {
        description: "Fija con qué cuenta (dueño de la finca) trabaja el conector. Todo lo que se lee y escribe es de esa cuenta.",
        inputSchema: { uid: z.string().optional(), email: z.string().optional() },
    }, async (a) => ({ elegida: await D.elegirCuenta(a) }));

    // ── Lectura ─────────────────────────────────────────────────────────────
    lectura("resumen_finca", {
        description: "Panorama de la finca: rebaño activo por sexo, etapa, lote y estado reproductivo; cabras en ordeño; cuántos registros hay de cada tipo y la fecha del último; configuración principal. Úsala primero para orientarte.",
        inputSchema: {},
    }, async () => {
        const cuenta = await D.cuentaActiva();
        const d = await D.cargar(cuenta.uid);
        const ctx = ctxDe(cuenta);
        const reb = INF.INFORMES.rebano(d, ctx, {});
        const FECHA = { weighings: "date", bodyWeighings: "date", events: "date", healthEvents: "date", parturitions: "parturitionDate", serviceRecords: "serviceDate", famachaRevs: "fecha" };
        const registros = Object.fromEntries(NOMBRES.map(c => [c, { total: d[c].length, ...(FECHA[c] ? { ultimo: d[c].reduce((m, x) => (x[FECHA[c]] > (m || "") ? x[FECHA[c]] : m), null) } : {}) }]));
        const c = d.config;
        return {
            cuenta: cuenta.email || cuenta.uid, finca: c.nombreFinca || null, hoy: ctx.hoy,
            rebano: { activos: reb.activos, porSexo: reb.porSexo, porEtapa: reb.porEtapa, porLote: reb.porLote, hembrasPorEstadoReproductivo: reb.hembrasPorEstadoReproductivo, cabrasEnOrdeno: reb.cabrasEnOrdeno, deReferencia: reb.animalesDeReferencia },
            lotes: d.lots.map(l => l.name), temporadasDeMontaActivas: d.breedingSeasons.filter(s => s.status === "Activo").map(s => ({ id: s.id, nombre: s.name, desde: s.startDate, hasta: s.endDate })),
            registros,
            configuracion: { moneda: c.monedaSimbolo, precioLecheKg: c.precioLecheKg, diasGestacion: c.diasGestacion, diasLactanciaObjetivo: c.diasLactanciaObjetivo, metaGdpDiaria: c.metaGdpDiaria },
        };
    });

    lectura("esquema", {
        description: "Describe las 17 colecciones de GanaderoOS: campos, valores válidos y obligatorios. Consúltala antes de cargar datos con guardar_registros o de filtrar con consultar/analizar.",
        inputSchema: { coleccion: z.enum(NOMBRES).optional() },
    }, async ({ coleccion }) => ({
        nota: "Todo documento lleva userId (lo pone el conector). Fechas como 'AAAA-MM-DD'. IDs de animales en MAYÚSCULAS. Para cargar, prefiere las herramientas registrar_* (crean los eventos de la línea de tiempo y actualizan estados como la app); guardar_registros es para catálogos y correcciones.",
        colecciones: coleccion ? { [coleccion]: COLECCIONES[coleccion] } : COLECCIONES,
    }));

    lectura("consultar", {
        description: "Lee registros de una colección con filtros, orden y paginación. Para cruces y totales usa 'analizar' o 'informe'.",
        inputSchema: {
            coleccion: z.enum(NOMBRES),
            filtros: z.array(zFiltro).optional(),
            ordenarPor: z.string().optional(), direccion: z.enum(["asc", "desc"]).optional(),
            limite: z.number().int().min(1).max(1000).optional().describe("por defecto 100"),
            desdeFila: z.number().int().min(0).optional().describe("para paginar"),
            campos: z.array(z.string()).optional().describe("devolver solo estos campos"),
        },
    }, async ({ coleccion, filtros = [], ordenarPor, direccion = "asc", limite = 100, desdeFila = 0, campos }) => {
        const cuenta = await D.cuentaActiva();
        const d = await D.cargar(cuenta.uid, [coleccion, "animals", "parturitions", "products", "sireLots"]);
        let filas = d[coleccion];
        for (const f of filtros) filas = filas.filter(x => INF.pasaFiltro(x, f));
        if (ordenarPor) filas = [...filas].sort((a, b) => {
            const va = a[ordenarPor], vb = b[ordenarPor];
            const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va ?? "").localeCompare(String(vb ?? ""), "es", { numeric: true });
            return direccion === "desc" ? -c : c;
        });
        const total = filas.length;
        let pag = filas.slice(desdeFila, desdeFila + limite);
        if (campos?.length) pag = pag.map(x => Object.fromEntries(["id", ...campos].map(k => [k, x[k]])));
        return { coleccion, total, desdeFila, mostrados: pag.length, siguiente: desdeFila + pag.length < total ? desdeFila + pag.length : null, registros: pag };
    });

    lectura("ficha_animal", {
        description: "Todo de un animal: datos, madre, padre, crías, partos/lactancias, pesajes de leche y corporales, servicios, sanidad, FAMACHA y su línea de tiempo.",
        inputSchema: { id: z.string() },
    }, async ({ id }) => {
        const cuenta = await D.cuentaActiva();
        const d = await D.cargar(cuenta.uid);
        return INF.fichaAnimal(d, ctxDe(cuenta), U.normId(id));
    });

    lectura("configuracion_finca", {
        description: "Lee los parámetros de la finca (precios, gestación, metas de crecimiento, categorías…).",
        inputSchema: {},
    }, async () => {
        const cuenta = await D.cuentaActiva();
        const s = await admin.firestore().doc(`configuracion/${cuenta.uid}`).get();
        return s.exists ? s.data() : { nota: "Esta cuenta todavía no tiene configuración guardada (la app la crea al abrirse)." };
    });

    lectura("informe", {
        description: "Informes que cruzan los datos cargados. Tipos: rebano (inventario y movimientos), produccion_leche (control lechero por período, lote, raza, n.º de lactancia, tramo DEL, padre; mejores y peores), lactancias (pico, promedio, leche estimada, proyección), reproduccion (servicios, partos, prolificidad, intervalo entre partos, fertilidad, por semental, próximos partos, vacías), crecimiento (GDP, hitos de peso vs metas, por padre/sexo/tipo de parto), sanidad (aplicaciones, costos, productos, retiros vigentes, FAMACHA), bajas (mortalidad, descartes, ventas), economico (leche estimada × precio, costos sanitarios, margen por animal y mes), padres (prueba de progenie). Cada informe declara período, método y muestra.",
        inputSchema: {
            tipo: z.enum(Object.keys(INF.INFORMES)),
            desde: zFecha.optional(), hasta: zFecha.optional(),
            lote: z.string().optional().describe("solo produccion_leche"),
            agruparPor: z.enum(["dia", "semana", "mes"]).optional().describe("produccion_leche"),
            sexo: z.enum(["Hembra", "Macho"]).optional().describe("crecimiento"),
            estado: z.enum(["activas", "todas"]).optional().describe("lactancias"),
            precioLecheKg: z.number().optional().describe("economico: otro precio para simular"),
            top: z.number().int().optional(), detalle: z.boolean().optional().describe("incluir la lista completa por animal"),
        },
    }, async (a) => {
        const cuenta = await D.cuentaActiva();
        const d = await D.cargar(cuenta.uid, SIN_EVENTOS);
        return INF.INFORMES[a.tipo](d, ctxDe(cuenta), a);
    });

    lectura("analizar", {
        description: "Cruce libre: toma una colección, le agrega los datos del animal (animal.sexo, animal.raza, animal.lote, animal.etapa, animal.padre, animal.madre, animal.edadMeses…), de la lactancia (lactancia.numero, lactancia.del, lactancia.tramoDEL) y la fecha (mes, semana, anio); filtra, agrupa y calcula métricas (conteo, suma, promedio, mediana, min, max, desviacion, distintos). Ej.: leche promedio por raza y mes = {coleccion:'weighings', agruparPor:['animal.raza','mes'], metricas:[{op:'promedio',campo:'kg'},{op:'distintos',campo:'goatId'}]}.",
        inputSchema: {
            coleccion: z.enum(NOMBRES),
            desde: zFecha.optional(), hasta: zFecha.optional(),
            filtros: z.array(zFiltro).optional(),
            agruparPor: z.array(z.string()).optional(),
            metricas: z.array(z.object({ op: z.enum(["conteo", "suma", "promedio", "mediana", "min", "max", "desviacion", "distintos"]), campo: z.string().optional(), nombre: z.string().optional() })).optional(),
            ordenarPor: z.string().optional(), direccion: z.enum(["asc", "desc"]).optional(), limite: z.number().int().optional(),
        },
    }, async (a) => {
        const cuenta = await D.cuentaActiva();
        const cols = a.coleccion === "events" ? NOMBRES : SIN_EVENTOS;
        const d = await D.cargar(cuenta.uid, cols);
        return INF.analizar(d, ctxDe(cuenta), a);
    });

    lectura("historial_cambios", {
        description: "Últimos cambios hechos por el conector (cada uno con su id para deshacer_cambio).",
        inputSchema: { limite: z.number().int().min(1).max(100).optional() },
    }, async ({ limite = 20 }) => {
        const cuenta = await D.cuentaActiva();
        return { cambios: await D.historial(cuenta.uid, limite) };
    });

    // ── Carga ───────────────────────────────────────────────────────────────
    escritura("registrar_animales", {
        description: "Da de alta animales (como el formulario de la app): valida el ID (si una hembra y un macho comparten arete, el segundo queda con -H/-M), calcula la etapa y el estado reproductivo si no se dan, crea el lote y el origen si no existen y escribe el evento 'Registro'. Para crías de un parto usa registrar_partos.",
        inputSchema: {
            animales: z.array(obj({
                id: z.string().describe("arete"), sex: z.string().describe("Hembra | Macho"), birthDate: z.string().optional().describe("AAAA-MM-DD o 'N/A'"),
                name: z.string().optional(), motherId: z.string().optional(), fatherId: z.string().optional(), birthWeight: z.number().optional(),
                location: z.string().optional().describe("lote"), breed: z.string().optional(), racialComposition: z.string().optional(), origin: z.string().optional(),
                lifecycleStage: z.string().optional(), reproductiveStatus: z.string().optional(), isReference: z.boolean().optional(),
                parturitionType: z.string().optional(), weaningDate: z.string().optional(), weaningWeight: z.number().optional(), observations: z.string().optional(),
                status: z.string().optional(), endDate: z.string().optional(),
            })),
            ...comunes,
        },
    }, (a) => escribir("registrar_animales", OP.registrarAnimales, a));

    escritura("actualizar_animales", {
        description: "Cambia datos de animales con la lógica de la app: mover de lote (evento Movimiento), estado reproductivo (p. ej. 'Preñada' con la fecha del diagnóstico), dar de baja (status Venta/Muerte/Descarte + endDate, deathReason, cullReason, salePrice, saleBuyer, salePurpose), destete (weaningDate + weaningWeight → evento Destete), raza, nombre, padres… Recalcula la etapa (Cabrita→Cabritona→Cabra, etc.).",
        inputSchema: {
            cambios: z.array(z.object({ id: z.string(), cambios: z.record(z.any()), fecha: zFecha.optional().describe("fecha del hecho (por defecto hoy)") })),
            ...comunes,
        },
    }, (a) => escribir("actualizar_animales", OP.actualizarAnimales, a));

    escritura("registrar_pesajes", {
        description: "Carga pesajes de LECHE (kg del día por cabra) o CORPORALES (kg de peso vivo), uno o cientos a la vez, con su evento. Avisa si una cabra no tiene lactancia abierta. Si ya hay pesaje ese día: 'omitir' (por defecto), 'reemplazar' o 'agregar'.",
        inputSchema: {
            tipo: z.enum(["leche", "corporal"]),
            fecha: zFecha.optional().describe("fecha común (cada pesaje puede traer la suya)"),
            pesajes: z.array(obj({ animalId: z.string(), kg: z.union([z.number(), z.string()]), fecha: zFecha.optional() })),
            siExiste: z.enum(["omitir", "reemplazar", "agregar"]).optional(),
            ...comunes,
        },
    }, (a) => escribir("registrar_pesajes", OP.registrarPesajes, a, { colecciones: NOMBRES }));

    escritura("registrar_partos", {
        description: "Registra partos como la app: crea la lactancia (activa), da de alta las crías vivas (con evento Nacimiento), pasa a la madre a 'Cabra' y 'Post-Parto' y la saca del lote de monta, y escribe el evento Parto/Aborto. Reemplaza la lactancia PROVISIONAL de la madre si la había. Crea el padre como reproductor externo si no existe. provisional: true crea solo la lactancia (para cargar pesajes) sin parto real.",
        inputSchema: {
            partos: z.array(obj({
                madre: z.string(), fecha: zFecha, padre: z.string().optional(),
                crias: z.array(obj({ id: z.string(), sexo: z.string(), peso: z.union([z.number(), z.string()]).optional(), lote: z.string().optional() })).optional(),
                muertas: z.number().int().optional().describe("crías nacidas muertas"),
                resultado: z.enum(["Normal", "Aborto", "Con Mortinatos"]).optional(),
                tipo: z.string().optional().describe("Simple | Doble | Triple… (si no, se deduce del total)"),
                lactanciaInducida: z.boolean().optional(), provisional: z.boolean().optional(),
            })),
            ...comunes,
        },
    }, (a) => escribir("registrar_partos", OP.registrarPartos, a, { colecciones: NOMBRES }));

    escritura("registrar_servicios", {
        description: "Registra servicios (montas vistas): busca el lote de monta del semental vigente en esa fecha (o el de la hembra), numera el servicio dentro del ciclo, pone a la hembra 'Servida' y escribe el evento con la fecha estimada de parto.",
        inputSchema: {
            servicios: z.array(obj({ hembra: z.string(), fecha: zFecha, semental: z.string().optional(), sireLotId: z.string().optional() })),
            ...comunes,
        },
    }, (a) => escribir("registrar_servicios", OP.registrarServicios, a));

    escritura("secado_lactancias", {
        description: "Secado: 'iniciar' (proceso de secado), 'secar' (lactancia seca en esa fecha) o 'revertir' (vuelve a activa). Por animalId toma su lactancia abierta (o la última seca, al revertir).",
        inputSchema: {
            lactancias: z.array(obj({ accion: z.enum(["iniciar", "secar", "revertir"]), animalId: z.string().optional(), parturitionId: z.string().optional(), fecha: zFecha.optional() })),
            ...comunes,
        },
    }, (a) => escribir("secado_lactancias", OP.secado, a, { colecciones: NOMBRES }));

    escritura("registrar_sanidad", {
        description: "Registra tratamientos y controles sanitarios por animal o por LOTE completo. Con producto: calcula la dosis (fija o por kg con el último peso) y el costo, y copia los días de retiro en leche y carne. Escribe el evento Tratamiento.",
        inputSchema: {
            eventos: z.array(obj({
                fecha: zFecha, tipo: z.string().describe("p. ej. Desparasitación, Vacunación, Vitaminas, Control"),
                animalId: z.string().optional(), lote: z.string().optional().describe("en vez de animalId: todos los activos del lote"),
                producto: z.string().optional().describe("nombre o id"), dosis: z.number().optional(), unidad: z.enum(["ml", "g", "unidad"]).optional(),
                costo: z.number().optional(), notas: z.string().optional(), ejecutadoPor: z.string().optional(), actividadId: z.string().optional(),
            })),
            ...comunes,
        },
    }, (a) => escribir("registrar_sanidad", OP.registrarSanidad, a));

    escritura("registrar_famacha", {
        description: "Carga una jornada FAMACHA: un score 1-5 por animal. Calcula la acción con la regla de la app (≤2 '−', 5 '+ separar', 3-4 '+' salvo que ya se haya tratado sin mejorar '='). Una revisión por animal y día (si se repite, se actualiza).",
        inputSchema: {
            fecha: zFecha.optional(),
            revisiones: z.array(obj({ animalId: z.string(), score: z.number().int(), dosis: z.boolean().optional(), producto: z.string().optional(), fecha: zFecha.optional() })),
            ...comunes,
        },
    }, (a) => escribir("registrar_famacha", OP.registrarFamacha, a));

    escritura("registrar_eventos", {
        description: "Agrega eventos a la línea de tiempo de animales o de un LOTE completo (Manejo, Actividad, Diagnóstico, Hito de Crecimiento, Peso de Monta, etc.).",
        inputSchema: {
            eventos: z.array(obj({ fecha: zFecha, tipo: z.string(), detalles: z.string(), animalId: z.string().optional(), lote: z.string().optional(), notas: z.string().optional() })),
            ...comunes,
        },
    }, (a) => escribir("registrar_eventos", OP.registrarEventos, a));

    escritura("guardar_registros", {
        description: "Crea o cambia registros de CUALQUIER colección: catálogos (lots, origins, fathers, products, healthPlans, planActivities, feedingPlans), temporadas de monta (breedingSeasons) y lotes de monta (sireLots), o correcciones puntuales. modo 'crear' (exige los campos obligatorios), 'actualizar' (solo los campos enviados) o 'reemplazar' (documento completo). Impide nombres repetidos en lotes, orígenes, productos, temporadas y planes (romperían la app). No crea eventos: para el día a día usa las registrar_*.",
        inputSchema: {
            coleccion: z.enum(NOMBRES),
            registros: z.array(z.record(z.any())),
            modo: z.enum(["crear", "actualizar", "reemplazar"]).optional(),
            ...comunes,
        },
    }, (a) => escribir("guardar_registros", OP.guardarRegistros, a));

    escritura("borrar_registros", {
        description: "Borra registros con las mismas cascadas que la app (un pesaje se lleva su evento; un parto su evento Parto, no sus crías; un servicio su evento y devuelve a 'Vacía' si era el único del ciclo). Un animal con historia NO se borra (para sacarlo del rebaño usa actualizar_animales con una baja) salvo forzar: true. Todo se puede deshacer.",
        inputSchema: { coleccion: z.enum(NOMBRES), ids: z.array(z.string()), forzar: z.boolean().optional(), ...comunes },
    }, (a) => escribir("borrar_registros", OP.borrarRegistros, a, { colecciones: NOMBRES }), true);

    escritura("actualizar_configuracion", {
        description: "Cambia parámetros de la finca (precioLecheKg, monedaSimbolo, diasGestacion, diasLactanciaObjetivo, metas de crecimiento, nombreFinca…). Solo acepta claves que ya existen en la configuración.",
        inputSchema: { cambios: z.record(z.any()), simular: z.boolean().optional(), motivo: z.string().optional() },
    }, async ({ cambios, simular, motivo }) => {
        const cuenta = await D.cuentaActiva();
        const ref = admin.firestore().doc(`configuracion/${cuenta.uid}`);
        const s = await ref.get();
        if (!s.exists) throw new Error("esta cuenta no tiene configuración todavía (ábrela una vez en la app).");
        const actual = s.data();
        const desconocidas = Object.keys(cambios).filter(k => !(k in actual));
        if (desconocidas.length) throw new Error(`claves que no existen en la configuración: ${desconocidas.join(", ")}.`);
        for (const [k, v] of Object.entries(cambios)) if (typeof actual[k] !== typeof v) throw new Error(`${k}: se esperaba ${typeof actual[k]}.`);
        const antes = Object.fromEntries(Object.keys(cambios).map(k => [k, actual[k]]));
        if (simular) return { simulacion: true, antes, despues: cambios };
        const r = await D.aplicar(cuenta.uid, [{ col: "configuracion", id: cuenta.uid, op: "set", data: { ...actual, ...cambios } }], { herramienta: "actualizar_configuracion", resumen: `Configuración: ${Object.keys(cambios).join(", ")}`, motivo });
        return { cambio: r.lote, antes, despues: cambios };
    });

    escritura("deshacer_cambio", {
        description: "Revierte un cambio del conector (id de historial_cambios): devuelve cada documento a como estaba. Si alguno se tocó después (en la app), se detiene y lo dice, salvo forzar: true.",
        inputSchema: { cambio: z.string(), forzar: z.boolean().optional() },
    }, async ({ cambio, forzar }) => {
        const cuenta = await D.cuentaActiva();
        return D.deshacer(cuenta.uid, cambio, { forzar });
    }, true);

    return server;
}

// ── Función HTTP ───────────────────────────────────────────────────────────

exports.mcp = onRequest({
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300,
    invoker: "public",
    cors: false,
}, async (req, res) => {
    const ruta = String(req.path || "/").replace(/\/+$/, "") || "/";
    if (ruta === "/estado" && req.method === "GET") {
        const esperada = claveEsperada();
        let rechazos = [];
        try {
            const snap = await admin.firestore().collection("mcp_rechazos").orderBy("fecha", "desc").limit(10).get();
            rechazos = snap.docs.map(d => U.aJson(d.data()));
        } catch (e) { rechazos = [{ error: "no se pudieron leer" }]; }
        res.status(200).json({ conector: "GanaderoOS", claveConfigurada: esperada.length >= 40, huellaClaveServidor: esperada ? huella(esperada) : null, ultimosRechazos: rechazos });
        return;
    }
    // Rutas como /.well-known/oauth-*: 404 antes de pedir clave (un 401 haría creer a claude.ai que hay OAuth).
    if (ruta !== "/") { res.status(404).send("Not found"); return; }
    if (req.method !== "POST") {
        res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
        return;
    }
    const recibida = req.get("x-api-key") || "";
    const esperada = claveEsperada();
    const autenticado = esperada.length >= 40 && claveValida(recibida, esperada);
    const metodos = (Array.isArray(req.body) ? req.body : [req.body]).map(m => m?.method).filter(Boolean);
    const rechazo = autenticado ? null : {
        motivo: esperada.length < 40 ? "servidor_sin_clave" : !recibida ? "sin_encabezado" : "clave_incorrecta",
        metodo: metodos.join(",").slice(0, 80) || null,
        huellaRecibida: recibida ? huella(recibida) : null,
        cliente: String(req.get("user-agent") || "").slice(0, 80),
    };
    if (rechazo && !metodos.includes("tools/call")) await anotar("mcp_rechazos", rechazo);
    const server = crearServidor({ autenticado, rechazo });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (e) {
        console.error("MCP:", e);
        if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Error interno." }, id: null });
    }
});

exports._internos = { crearServidor, claveValida, huella };

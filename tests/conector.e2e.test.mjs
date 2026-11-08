// Prueba de punta a punta del conector de Claude (functions/mcp/servidor.js)
// contra los emuladores de Firestore y Auth, con el MISMO código que se
// despliega, llamado como lo hace claude.ai: por HTTP con el cliente oficial
// del SDK de MCP.
//
// Cómo correrla (desde la raíz del repo, con las dependencias de functions/
// instaladas):
//   npx firebase-tools emulators:exec --only firestore,auth --project demo-ganaderoos \
//     "node tests/conector.e2e.test.mjs"

import { createRequire } from 'module';
const require = createRequire(new URL('../functions/package.json', import.meta.url));

process.env.MCP_API_KEY = 'clave-de-prueba-0123456789-abcdefghijklmnopqrstuvwxyz';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-ganaderoos';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const express = require('express');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { mcp } = require('./mcp/servidor.js');
const OP = require('./mcp/operaciones.js');
const INF = require('./mcp/informes.js');

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const db = admin.firestore();

// ── Pruebas puras ──────────────────────────────────────────────────────────
ok(OP.calcularAccion([], 'A', '2025-01-01', 2) === '−', 'FAMACHA: score 2 → −');
ok(OP.calcularAccion([], 'A', '2025-01-01', 5) === '+ separar', 'FAMACHA: score 5 → + separar');
ok(OP.calcularAccion([{ animalId: 'A', fecha: '2024-12-20', score: 4, accion: '+' }], 'A', '2025-01-01', 3) === '=', 'FAMACHA: ya tratada y no mejoró → =');
const est = INF.lecheEstimada([{ date: '2025-01-01', kg: 2 }, { date: '2025-01-11', kg: 3 }]);
ok(Math.abs(est.kg - 27.5) < 1e-9 && est.dias === 11, `leche entre pesajes: 2→3 kg en 10 días + el último día = 27,5 kg en 11 días (dio ${est.kg} / ${est.dias})`);

// ── Datos de prueba ────────────────────────────────────────────────────────
await admin.auth().createUser({ uid: 'dueno', email: 'finca@example.com', password: 'secreta123' }).catch(() => {});
await admin.auth().createUser({ uid: 'otro', email: 'otro@example.com', password: 'secreta123' }).catch(() => {});
await db.doc('configuracion/dueno').set({ nombreFinca: 'Masparrito', monedaSimbolo: '$', precioLecheKg: 2, diasGestacion: 150, diasLactanciaObjetivo: 305, metaGdpDiaria: 150, edadParaAlertaVaciasMeses: 18 });
await db.doc('animals/X1').set({ id: 'X1', userId: 'otro', sex: 'Hembra', status: 'Activo', birthDate: '2023-01-01', lifecycleStage: 'Cabra', location: '', reproductiveStatus: 'Vacía' });

// ── Servidor local ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use((req, res) => mcp(req, res));
const srv = await new Promise(r => { const s = app.listen(0, () => r(s)); });
const url = `http://127.0.0.1:${srv.address().port}/`;
const hdr = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

// Sin clave: conecta (nunca 401) pero no lee ni escribe.
let r = await fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) });
ok(r.status === 200, `tools/list sin clave → ${r.status} (no 401)`);
let j = await (await fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'guardar_registros', arguments: { coleccion: 'lots', registros: [{ name: 'Intruso' }] } } }) })).json();
ok(j.result?.isError === true, 'herramienta sin clave → error');
ok((await db.collection('lots').get()).empty, 'sin clave no escribe');
r = await fetch(url + '.well-known/oauth-protected-resource');
ok(r.status === 404, `/.well-known → ${r.status}`);
r = await fetch(url, { method: 'GET' });
ok(r.status === 405, `GET → ${r.status}`);
j = await (await fetch(url + 'estado')).json();
ok(j.claveConfigurada === true && j.huellaClaveServidor?.length === 8, '/estado sin secretos');

// Con clave.
const c = new Client({ name: 'prueba', version: '1.0.0' });
await c.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { 'X-API-Key': process.env.MCP_API_KEY } } }));
const herramientas = (await c.listTools()).tools.map(t => t.name);
ok(herramientas.length === 23, `${herramientas.length} herramientas`);
const llamar = async (name, args = {}) => {
    const res = await c.callTool({ name, arguments: args });
    const txt = res.content?.[0]?.text || '';
    let data = null; try { data = JSON.parse(txt); } catch (e) { /* texto */ }
    return { error: !!res.isError, txt, data };
};

// Dos cuentas: hay que elegir.
let x = await llamar('resumen_finca');
ok(x.error && /elegir_cuenta/.test(x.txt), 'con dos cuentas pide elegir');
x = await llamar('cuentas');
ok(x.data?.cuentas?.length === 2, 'cuentas lista las dos');
x = await llamar('elegir_cuenta', { email: 'finca@example.com' });
ok(x.data?.elegida?.uid === 'dueno', 'elegir_cuenta por correo');

// Catálogos y nombres únicos.
x = await llamar('guardar_registros', { coleccion: 'lots', registros: [{ name: 'Ordeño' }] });
ok(!x.error && x.data?.documentos === 1, 'crea lote');
x = await llamar('guardar_registros', { coleccion: 'lots', registros: [{ name: 'ordeño' }] });
ok(x.data?.errores?.length === 1 && (await db.collection('lots').get()).size === 1, 'lote repetido (otra mayúscula) → rechazado');

// Animales (simular no escribe).
const animales = [
    { id: 'c001', sex: 'Hembra', birthDate: '2023-01-10', location: 'Ordeño', breed: 'Saanen' },
    { id: 'C002', sex: 'h', birthDate: '2023-02-01', location: 'Ordeño', breed: 'Alpina' },
    { id: 'SEM1', sex: 'Macho', birthDate: '2022-01-01', location: 'Machos', breed: 'Saanen' },
];
x = await llamar('registrar_animales', { animales, simular: true });
ok(x.data?.simulacion && !(await db.doc('animals/C001').get()).exists, 'simular no escribe');
x = await llamar('registrar_animales', { animales });
ok(!x.error && x.data?.cambio, `registra 3 animales (${x.data?.resumen})`);
let a = (await db.doc('animals/C001').get()).data();
ok(a?.userId === 'dueno' && a.lifecycleStage === 'Cabritona' && a.reproductiveStatus === 'Vacía' && !('_synced' in a), 'C001 en mayúsculas, etapa y estado calculados, sin _synced');
ok((await db.collection('lots').where('userId', '==', 'dueno').get()).size === 2, 'creó el lote Machos que faltaba');
ok((await db.collection('events').where('animalId', '==', 'C001').where('type', '==', 'Registro').get()).size === 1, 'evento Registro');
x = await llamar('registrar_animales', { animales: [{ id: 'C001', sex: 'Macho', birthDate: '2024-01-01' }] });
ok((await db.doc('animals/C001-M').get()).exists, 'mismo arete con otro sexo → C001-M');
x = await llamar('registrar_animales', { animales: [{ id: 'C002', sex: 'Hembra', birthDate: '2024-01-01' }] });
ok(x.data?.errores?.length === 1, 'arete repetido del mismo sexo → rechazado');

// Temporada de monta y servicio.
await llamar('guardar_registros', { coleccion: 'breedingSeasons', registros: [{ id: 'T2025', name: 'Monta 2025', startDate: '2025-05-01', endDate: '2025-07-31', status: 'Activo', requiresLightTreatment: false }] });
await llamar('guardar_registros', { coleccion: 'sireLots', registros: [{ id: 'SL1', seasonId: 'T2025', sireId: 'SEM1' }] });
x = await llamar('registrar_servicios', { servicios: [{ hembra: 'C001', fecha: '2025-06-01', semental: 'SEM1' }] });
a = (await db.doc('animals/C001').get()).data();
const evServ = (await db.collection('events').where('animalId', '==', 'C001').where('type', '==', 'Servicio').get()).docs[0]?.data();
ok(a.reproductiveStatus === 'Servida' && /Servicio #1 \(Visto\) con SEM1\. Parto est\.: 2025-10-29/.test(evServ?.details || ''), 'servicio: Servida + evento con parto estimado');

// Parto con dos crías.
x = await llamar('registrar_partos', { partos: [{ madre: 'C001', fecha: '2025-10-29', padre: 'SEM1', crias: [{ id: 'k1', sexo: 'H', peso: 3.2 }, { id: 'K2', sexo: 'Macho', peso: '3,5' }] }] });
ok(!x.error, `parto: ${x.data?.resumen}`);
const parto = (await db.collection('parturitions').where('goatId', '==', 'C001').get()).docs[0]?.data();
a = (await db.doc('animals/C001').get()).data();
const k2 = (await db.doc('animals/K2').get()).data();
ok(parto?.parturitionType === 'Doble' && parto.status === 'activa' && parto.liveOffspring?.length === 2, 'lactancia activa, parto Doble');
ok(a.lifecycleStage === 'Cabra' && a.reproductiveStatus === 'Post-Parto', 'madre → Cabra / Post-Parto');
ok(k2?.motherId === 'C001' && k2.fatherId === 'SEM1' && k2.birthWeight === 3.5 && k2.lifecycleStage === 'Cabrito', 'cría K2 con padres y peso (coma decimal)');
ok((await db.collection('events').where('type', '==', 'Nacimiento').get()).size === 2, 'eventos Nacimiento');

// Pesajes: un error bloquea todo; omitirErrores carga los válidos.
const pesajes = [{ animalId: 'C001', kg: 2.5, fecha: '2025-11-05' }, { animalId: 'C001', kg: 3, fecha: '2025-11-15' }, { animalId: 'C002', kg: 1.8, fecha: '2025-11-05' }, { animalId: 'SEM1', kg: 1, fecha: '2025-11-05' }];
x = await llamar('registrar_pesajes', { tipo: 'leche', pesajes });
ok(x.data?.errores?.length === 1 && (await db.collection('weighings').get()).empty, 'pesaje de un macho → no se escribe nada');
x = await llamar('registrar_pesajes', { tipo: 'leche', pesajes, omitirErrores: true });
ok((await db.collection('weighings').get()).size === 3 && x.data?.avisos?.some(t => /C002.*no tiene parto/.test(t)), 'omitirErrores: 3 pesajes y aviso de C002 sin parto');
x = await llamar('registrar_pesajes', { tipo: 'leche', pesajes: [{ animalId: 'C001', kg: 9, fecha: '2025-11-05' }] });
ok((await db.collection('weighings').get()).size === 3, 'pesaje repetido ese día → omitido');
await llamar('registrar_pesajes', { tipo: 'corporal', fecha: '2025-11-28', pesajes: [{ animalId: 'K1', kg: 8 }] });
ok((await db.doc('animals/K1').get()).data().lastWeighing?.kg === 8, 'pesaje corporal actualiza lastWeighing');

// Sanidad por lote con producto (dosis por kg con el último peso, costo y retiros).
await llamar('guardar_registros', { coleccion: 'products', registros: [{ name: 'Ivermectina', applicationType: 'Inyectable', dosageType: 'per_kg', dosagePerKg_ml: 1, dosagePerKg_kg: 50, price: 20, presentationValue: 500, presentationUnit: 'ml', withdrawalDaysMilk: 7, withdrawalDaysMeat: 21 }] });
await llamar('registrar_pesajes', { tipo: 'corporal', fecha: '2025-11-01', pesajes: [{ animalId: 'C001', kg: 50 }] });
x = await llamar('registrar_sanidad', { eventos: [{ fecha: '2025-11-10', tipo: 'Desparasitación', lote: 'Ordeño', producto: 'ivermectina' }] });
const he = (await db.collection('healthEvents').where('animalId', '==', 'C001').get()).docs[0]?.data();
ok(he?.doseApplied === 1 && he.calculatedCost === 0.04 && he.diasRetiroLeche === 7, `sanidad: dosis 1 ml (50 kg), costo 0,04, retiro 7 d (${x.data?.resumen})`);

// FAMACHA.
await llamar('registrar_famacha', { fecha: '2025-11-10', revisiones: [{ animalId: 'C001', score: 4 }, { animalId: 'C002', score: 2 }] });
x = await llamar('registrar_famacha', { fecha: '2025-11-20', revisiones: [{ animalId: 'C001', score: 4 }] });
const fr = (await db.doc('famachaRevs/C001_2025-11-20').get()).data();
ok(fr?.accion === '=' && fr.dosis === false, 'FAMACHA: segunda revisión sin mejora → =, sin dosis');

// Informes.
x = await llamar('informe', { tipo: 'produccion_leche', desde: '2025-11-01', hasta: '2025-11-30' });
ok(x.data?.muestra?.pesajes === 3 && x.data.kgPromedioPorCabra === 2.43, `producción: 3 pesajes, promedio ${x.data?.kgPromedioPorCabra}`);
ok(x.data?.porNumeroDeLactancia?.some(g => g.grupo === 'Lactancia 1' && g.pesajes === 2), 'producción por n.º de lactancia');
x = await llamar('informe', { tipo: 'reproduccion', desde: '2025-01-01', hasta: '2025-12-31' });
ok(x.data?.partos?.total === 1 && x.data.crias.prolificidad === 2 && x.data.servicios.total === 1, 'reproducción: 1 parto, prolificidad 2');
x = await llamar('informe', { tipo: 'lactancias' });
ok(x.data?.detalle?.[0]?.pico?.kg === 3 && x.data.detalle[0].kgEstimadosEntrePesajes === 30.3, `lactancias: pico 3 kg, ${x.data?.detalle?.[0]?.kgEstimadosEntrePesajes} kg entre pesajes`);
x = await llamar('informe', { tipo: 'sanidad', desde: '2025-01-01', hasta: '2025-12-31' });
ok(x.data?.aplicaciones === 2 && x.data.famacha.ultimaRevisionPorScore['4'] === 1, 'sanidad: 2 aplicaciones, FAMACHA');
for (const t of ['rebano', 'crecimiento', 'bajas', 'economico', 'padres']) {
    x = await llamar('informe', { tipo: t, desde: '2025-01-01', hasta: '2025-12-31' });
    ok(!x.error && x.data?.informe, `informe ${t}`);
}
x = await llamar('analizar', { coleccion: 'weighings', agruparPor: ['animal.raza'], metricas: [{ op: 'promedio', campo: 'kg' }, { op: 'distintos', campo: 'goatId' }] });
const saanen = x.data?.resultado?.find(g => g['animal.raza'] === 'Saanen');
ok(saanen?.promedio_kg === 2.75 && saanen.distintos_goatId === 1, 'analizar: leche promedio por raza');
x = await llamar('ficha_animal', { id: 'c001' });
ok(x.data?.partos?.length === 1 && x.data.crias.length === 2 && x.data.pesajesLeche.length === 2, 'ficha_animal');

// Aislamiento: la otra cuenta no se ve ni se toca.
x = await llamar('consultar', { coleccion: 'animals', limite: 1000 });
ok(!x.data?.registros?.some(r0 => r0.id === 'X1'), 'no ve animales de otra cuenta');
x = await llamar('actualizar_animales', { cambios: [{ id: 'X1', cambios: { location: 'Ordeño' } }] });
ok(x.data?.errores?.length === 1 && (await db.doc('animals/X1').get()).data().location === '', 'no toca animales de otra cuenta');

// Baja y movimiento.
x = await llamar('actualizar_animales', { cambios: [{ id: 'C002', cambios: { status: 'Venta', salePrice: 120, salePurpose: 'Cría' }, fecha: '2025-12-01' }] });
a = (await db.doc('animals/C002').get()).data();
ok(a.status === 'Venta' && a.endDate === '2025-12-01', 'baja por venta con fecha');

// Borrar un pesaje se lleva su evento; deshacer lo devuelve.
const w = (await db.collection('weighings').where('goatId', '==', 'C001').where('date', '==', '2025-11-15').get()).docs[0];
const evAntes = (await db.collection('events').where('animalId', '==', 'C001').where('type', '==', 'Pesaje Lechero').get()).size;
x = await llamar('borrar_registros', { coleccion: 'weighings', ids: [w.id] });
const evDespues = (await db.collection('events').where('animalId', '==', 'C001').where('type', '==', 'Pesaje Lechero').get()).size;
ok(!(await db.doc(`weighings/${w.id}`).exists) && evDespues === evAntes - 1, 'borrar pesaje → también su evento');
const loteBorrado = x.data?.cambio;
x = await llamar('deshacer_cambio', { cambio: loteBorrado });
ok(x.data?.deshecho && (await db.doc(`weighings/${w.id}`).get()).exists, 'deshacer devuelve el pesaje');

// Un animal con historia no se borra sin forzar.
x = await llamar('borrar_registros', { coleccion: 'animals', ids: ['C001'] });
ok(x.data?.errores?.length === 1 && (await db.doc('animals/C001').get()).exists, 'animal con historia no se borra sin forzar');

// Deshacer se detiene si la app tocó el documento después.
x = await llamar('historial_cambios', { limite: 50 });
const loteParto = x.data?.cambios?.find(cb => cb.herramienta === 'registrar_partos')?.lote;
await db.doc('animals/K1').update({ location: 'Cría' });
x = await llamar('deshacer_cambio', { cambio: loteParto });
ok(x.data?.deshecho === false && x.data.conflictos.includes('animals/K1'), 'deshacer se detiene si alguien tocó el documento');

// Secado.
x = await llamar('secado_lactancias', { lactancias: [{ accion: 'secar', animalId: 'C001', fecha: '2026-03-01' }] });
ok((await db.collection('parturitions').where('goatId', '==', 'C001').get()).docs[0].data().status === 'seca', 'secado');

// Configuración.
x = await llamar('actualizar_configuracion', { cambios: { precioLecheKg: 2.5 } });
ok((await db.doc('configuracion/dueno').get()).data().precioLecheKg === 2.5, 'actualiza configuración');
x = await llamar('actualizar_configuracion', { cambios: { inventado: 1 } });
ok(x.error, 'rechaza claves de configuración que no existen');

// Auditoría.
ok((await db.collection('mcp_auditoria').get()).size > 10, 'auditoría escrita');

await c.close();
srv.close();
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo en verde.');
process.exit(fallos ? 1 : 0);

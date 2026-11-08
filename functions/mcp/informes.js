// Informes del conector: funciones PURAS sobre los datos ya cargados.
// Cada informe declara su período, su método y su muestra, para que una cifra
// nunca se lea sin saber de dónde sale.

const U = require("./util");

const ACTIVO = (a) => a.status === "Activo" && !a.isReference;
const ENTRE = (f, desde, hasta) => !!f && (!desde || f >= desde) && (!hasta || f <= hasta);

function periodo(args, ctx, mesesAtras = 12) {
    const hasta = args.hasta ? U.fechaValida(args.hasta, "hasta") : ctx.hoy;
    const desde = args.desde ? U.fechaValida(args.desde, "desde") : U.sumarDias(hasta, -Math.round(mesesAtras * 30.4375));
    if (desde > hasta) throw new Error("desde es posterior a hasta.");
    return { desde, hasta };
}

function indice(d) {
    const animales = new Map(d.animals.map(a => [a.id, a]));
    const partosPorMadre = new Map();
    for (const p of d.parturitions) {
        if (!partosPorMadre.has(p.goatId)) partosPorMadre.set(p.goatId, []);
        partosPorMadre.get(p.goatId).push(p);
    }
    for (const l of partosPorMadre.values()) l.sort((a, b) => (a.parturitionDate < b.parturitionDate ? -1 : 1));
    const productos = new Map(d.products.map(p => [p.id, p]));
    return { animales, partosPorMadre, productos };
}

/** Número de lactancia (1, 2, …) de un parto, contando solo partos reales o lactancias inducidas. */
function numeroLactancia(ix, p) {
    const lista = (ix.partosPorMadre.get(p.goatId) || []).filter(x => x.status !== "finalizada" || x.id === p.id);
    return lista.findIndex(x => x.id === p.id) + 1;
}

/** Lactancia a la que pertenece un pesaje: el último parto de esa cabra a esa fecha. */
function lactanciaDe(ix, goatId, fecha) {
    const lista = ix.partosPorMadre.get(goatId) || [];
    let r = null;
    for (const p of lista) if (p.parturitionDate <= fecha && p.status !== "finalizada") r = p;
    if (r && (r.status === "seca") && r.dryingStartDate && r.dryingStartDate < fecha) return null;
    return r;
}

const tramoDEL = (del) => (del == null ? "sin lactancia" : del <= 60 ? "0-60" : del <= 150 ? "61-150" : del <= 240 ? "151-240" : ">240");

/** Leche estimada entre pesajes consecutivos de una lactancia (trapecios), recortada al período. */
function lecheEstimada(pesajes, desde, hasta) {
    const w = [...pesajes].sort((a, b) => (a.date < b.date ? -1 : 1));
    let total = 0, dias = 0;
    for (let i = 1; i < w.length; i++) {
        const a = w[i - 1], b = w[i];
        const n = U.diasEntre(a.date, b.date);
        if (!n || n <= 0 || n > 60) continue; // un hueco de más de 60 días no se rellena
        for (let k = 0; k < n; k++) {
            const dia = U.sumarDias(a.date, k);
            if (!ENTRE(dia, desde, hasta)) continue;
            total += a.kg + ((b.kg - a.kg) * k) / n;
            dias++;
        }
    }
    // el último día medido también cuenta
    const ult = w[w.length - 1];
    if (ult && ENTRE(ult.date, desde, hasta) && w.length > 1) { total += ult.kg; dias++; }
    return { kg: total, dias };
}

// ── 1. Rebaño ───────────────────────────────────────────────────────────────

function informeRebano(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const act = d.animals.filter(ACTIVO);
    const cuenta = (xs, f) => xs.reduce((o, x) => { const k = f(x) || "(sin dato)"; o[k] = (o[k] || 0) + 1; return o; }, {});
    const hembras = act.filter(a => a.sex === "Hembra");
    const enOrdeno = new Set(d.parturitions.filter(p => p.status === "activa" || p.status === "en-secado").map(p => p.goatId));
    const nacidos = d.animals.filter(a => a.motherId && ENTRE(a.birthDate, desde, hasta));
    const bajas = d.animals.filter(a => a.status !== "Activo" && ENTRE(a.endDate, desde, hasta));
    return {
        informe: "Inventario del rebaño",
        aLaFecha: ctx.hoy,
        periodoMovimientos: { desde, hasta },
        activos: act.length,
        animalesDeReferencia: d.animals.filter(a => a.isReference).length,
        porSexo: cuenta(act, a => a.sex),
        porEtapa: cuenta(act, a => a.lifecycleStage),
        porLote: cuenta(act, a => a.location),
        porRaza: cuenta(act, a => a.breed),
        hembrasPorEstadoReproductivo: cuenta(hembras, a => a.reproductiveStatus),
        cabrasEnOrdeno: act.filter(a => enOrdeno.has(a.id)).length,
        movimientos: {
            nacidos: nacidos.length,
            nacidosPorSexo: cuenta(nacidos, a => a.sex),
            bajas: bajas.length,
            bajasPorTipo: cuenta(bajas, a => a.status),
        },
    };
}

// ── 2. Producción de leche ──────────────────────────────────────────────────

function informeLeche(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 3);
    const ix = indice(d);
    const agr = args.agruparPor || "mes";
    const clavePeriodo = agr === "dia" ? (f) => f : agr === "semana" ? U.semanaDe : U.mesDe;
    const loteN = args.lote ? U.normNombre(args.lote) : null;
    const pes = d.weighings.filter(w => ENTRE(w.date, desde, hasta))
        .map(w => {
            const a = ix.animales.get(w.goatId);
            const lac = lactanciaDe(ix, w.goatId, w.date);
            return { ...w, a, lac, del: lac ? U.diasEntre(lac.parturitionDate, w.date) : null, nLac: lac ? numeroLactancia(ix, lac) : null };
        })
        .filter(w => !loteN || U.normNombre(w.a?.location) === loteN);
    const grupo = (f) => {
        const m = new Map();
        for (const w of pes) {
            const k = f(w) ?? "(sin dato)";
            if (!m.has(k)) m.set(k, { kg: [], cabras: new Set(), dias: new Set() });
            const g = m.get(k); g.kg.push(w.kg); g.cabras.add(w.goatId); g.dias.add(w.date);
        }
        return [...m.entries()].map(([k, g]) => ({
            grupo: k, pesajes: g.kg.length, cabras: g.cabras.size, diasDeControl: g.dias.size,
            kgPromedioPorCabra: U.r2(U.promedio(g.kg)), kgMedianaPorCabra: U.r2(U.mediana(g.kg)),
            kgSumaDeControles: U.r2(g.kg.reduce((s, x) => s + x, 0)),
        })).sort((x, y) => String(x.grupo).localeCompare(String(y.grupo), "es", { numeric: true }));
    };
    // Por animal
    const porAnimal = new Map();
    for (const w of pes) {
        if (!porAnimal.has(w.goatId)) porAnimal.set(w.goatId, []);
        porAnimal.get(w.goatId).push(w);
    }
    const animales = [...porAnimal.entries()].map(([id, ws]) => {
        ws.sort((a, b) => (a.date < b.date ? -1 : 1));
        const ult = ws[ws.length - 1];
        const pend = ws.length >= 3 ? pendiente(ws.map(w => [U.diasEntre(ws[0].date, w.date), w.kg])) : null;
        return {
            animal: id, lote: ult.a?.location || "", raza: ult.a?.breed || "", padre: ult.a?.fatherId || "",
            pesajes: ws.length, kgPromedio: U.r2(U.promedio(ws.map(w => w.kg))), ultimo: { fecha: ult.date, kg: ult.kg },
            delUltimo: ult.del, lactancia: ult.nLac, tendenciaKgPorSemana: pend == null ? null : U.r2(pend * 7),
        };
    }).sort((a, b) => b.kgPromedio - a.kgPromedio);
    const top = Number(args.top) || 10;
    return {
        informe: "Producción de leche (control lechero)",
        periodo: { desde, hasta }, lote: args.lote || "todos",
        metodo: "Cada pesaje es la leche de UNA cabra en un día de control. 'kgPromedioPorCabra' = promedio de esos pesajes. La lactancia de un pesaje es el último parto de la cabra antes de esa fecha; DEL = días desde ese parto.",
        muestra: { pesajes: pes.length, cabras: porAnimal.size, diasDeControl: new Set(pes.map(w => w.date)).size },
        kgPromedioPorCabra: U.r2(U.promedio(pes.map(w => w.kg))),
        porPeriodo: grupo(w => clavePeriodo(w.date)),
        porLote: grupo(w => w.a?.location || "(sin lote)"),
        porRaza: grupo(w => w.a?.breed),
        porNumeroDeLactancia: grupo(w => (w.nLac ? `Lactancia ${w.nLac}` : "sin parto")),
        porTramoDEL: grupo(w => tramoDEL(w.del)),
        porPadreDeLaCabra: grupo(w => w.a?.fatherId),
        mejores: animales.slice(0, top),
        peores: animales.slice(-top).reverse(),
        ...(args.detalle ? { todasLasCabras: animales } : {}),
    };
}

function pendiente(puntos) {
    const n = puntos.length;
    const mx = puntos.reduce((s, p) => s + p[0], 0) / n, my = puntos.reduce((s, p) => s + p[1], 0) / n;
    const num = puntos.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const den = puntos.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
    return den ? num / den : null;
}

// ── 3. Lactancias ───────────────────────────────────────────────────────────

function informeLactancias(d, ctx, args) {
    const ix = indice(d);
    const soloActivas = args.estado === "activas";
    const { desde, hasta } = args.desde || args.hasta ? periodo(args, ctx) : { desde: null, hasta: null };
    const objetivo = Number(d.config?.diasLactanciaObjetivo) || 305;
    const partos = d.parturitions.filter(p => p.status !== "finalizada")
        .filter(p => !soloActivas || p.status === "activa" || p.status === "en-secado")
        .filter(p => !desde || ENTRE(p.parturitionDate, desde, hasta));
    const filas = partos.map(p => {
        const lista = ix.partosPorMadre.get(p.goatId) || [];
        const sig = lista.find(x => x.parturitionDate > p.parturitionDate);
        const fin = p.status === "seca" && p.dryingStartDate ? p.dryingStartDate : sig ? sig.parturitionDate : ctx.hoy;
        const ws = d.weighings.filter(w => w.goatId === p.goatId && w.date >= p.parturitionDate && w.date <= fin);
        const pico = ws.reduce((m, w) => (!m || w.kg > m.kg ? w : m), null);
        const est = lecheEstimada(ws);
        const prom = U.promedio(ws.map(w => w.kg));
        const a = ix.animales.get(p.goatId);
        return {
            cabra: p.goatId, lote: a?.location || "", raza: a?.breed || "", parto: p.parturitionDate, numero: numeroLactancia(ix, p),
            padreDeLasCrias: p.sireId, estado: p.status, provisional: !!p.provisional, del: U.diasEntre(p.parturitionDate, fin),
            pesajes: ws.length, kgPromedio: U.r2(prom), pico: pico ? { kg: pico.kg, del: U.diasEntre(p.parturitionDate, pico.date) } : null,
            kgEstimadosEntrePesajes: U.r1(est.kg), diasCubiertos: est.dias,
            proyeccionKgA_objetivo: prom != null ? U.r1(prom * objetivo) : null,
        };
    }).sort((a, b) => (b.kgPromedio ?? -1) - (a.kgPromedio ?? -1));
    const resumen = (k) => {
        const m = {};
        for (const f of filas) { const g = f[k] ?? "(sin dato)"; (m[g] = m[g] || []).push(f); }
        return Object.entries(m).map(([g, fs]) => ({ grupo: g, lactancias: fs.length, kgPromedio: U.r2(U.promedio(fs.map(f => f.kgPromedio))), picoPromedio: U.r2(U.promedio(fs.map(f => f.pico?.kg))), delPromedio: U.r1(U.promedio(fs.map(f => f.del))) }));
    };
    return {
        informe: "Lactancias",
        filtro: { partosDesde: desde, partosHasta: hasta, estado: soloActivas ? "activas" : "todas" },
        metodo: `kgEstimadosEntrePesajes integra la leche entre pesajes consecutivos (interpolación lineal; huecos de más de 60 días no se rellenan). proyeccionKgA_objetivo = promedio de pesajes × ${objetivo} días (meta de lactancia de Configuración).`,
        lactancias: filas.length,
        porNumeroDeLactancia: resumen("numero"),
        porPadreDeLasCrias: resumen("padreDeLasCrias"),
        porRaza: resumen("raza"),
        detalle: filas,
    };
}

// ── 4. Reproducción ─────────────────────────────────────────────────────────

function informeReproduccion(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const ix = indice(d);
    const gest = Number(d.config?.diasGestacion) || 150;
    const sl = new Map(d.sireLots.map(l => [l.id, l]));
    const serv = d.serviceRecords.filter(s => ENTRE(s.serviceDate, desde, hasta));
    const partos = d.parturitions.filter(p => !p.provisional && ENTRE(p.parturitionDate, desde, hasta));
    const reales = partos.filter(p => p.parturitionOutcome !== "Aborto");
    const vivas = reales.reduce((s, p) => s + (p.liveOffspring?.length || 0), 0);
    const totales = reales.reduce((s, p) => s + (Number(p.offspringCount) || 0), 0);
    const crias = reales.flatMap(p => p.liveOffspring || []);
    // Intervalo entre partos: el segundo parto cae en el período.
    const iep = [];
    for (const lista of ix.partosPorMadre.values()) {
        const r = lista.filter(p => !p.provisional && p.parturitionOutcome !== "Aborto");
        for (let i = 1; i < r.length; i++) if (ENTRE(r[i].parturitionDate, desde, hasta)) iep.push(U.diasEntre(r[i - 1].parturitionDate, r[i].parturitionDate));
    }
    // Edad al primer parto (primer parto en el período).
    const epp = [];
    for (const [id, lista] of ix.partosPorMadre) {
        const p1 = lista.find(p => !p.provisional);
        const a = ix.animales.get(id);
        if (p1 && ENTRE(p1.parturitionDate, desde, hasta) && a?.birthDate && a.birthDate !== "N/A") epp.push(U.edadMeses(a.birthDate, p1.parturitionDate));
    }
    // Servicios que terminaron en parto (parto a gest ± 15 días del servicio).
    const servAnt = d.serviceRecords.filter(s => ENTRE(U.sumarDias(s.serviceDate, gest), desde, hasta) || ENTRE(s.serviceDate, desde, hasta));
    const fecundos = servAnt.filter(s => (ix.partosPorMadre.get(s.femaleId) || []).some(p => !p.provisional && Math.abs(U.diasEntre(s.serviceDate, p.parturitionDate) - gest) <= 15));
    const juzgables = servAnt.filter(s => U.sumarDias(s.serviceDate, gest + 15) <= ctx.hoy);
    // Por semental
    const porSemental = {};
    for (const s of serv) { const k = sl.get(s.sireLotId)?.sireId || "(lote sin semental)"; (porSemental[k] = porSemental[k] || { servicios: 0, hembras: new Set(), partos: 0, criasVivas: 0 }); porSemental[k].servicios++; porSemental[k].hembras.add(s.femaleId); }
    for (const p of reales) { const k = p.sireId || "(sin padre)"; (porSemental[k] = porSemental[k] || { servicios: 0, hembras: new Set(), partos: 0, criasVivas: 0 }); porSemental[k].partos++; porSemental[k].criasVivas += p.liveOffspring?.length || 0; }
    // Próximos partos: hembras activas con servicio posterior a su último parto.
    const proximos = [];
    for (const a of d.animals.filter(x => ACTIVO(x) && x.sex === "Hembra")) {
        const ult = (ix.partosPorMadre.get(a.id) || []).filter(p => !p.provisional).slice(-1)[0];
        const corte = ult?.parturitionDate || "2000-01-01";
        const s = d.serviceRecords.filter(x => x.femaleId === a.id && x.serviceDate > corte).sort((x, y) => (x.serviceDate < y.serviceDate ? 1 : -1))[0];
        if (s) {
            const est = U.sumarDias(s.serviceDate, gest);
            if (est >= U.sumarDias(ctx.hoy, -20)) proximos.push({ cabra: a.id, lote: a.location, estado: a.reproductiveStatus, ultimoServicio: s.serviceDate, partoEstimado: est, enDias: U.diasEntre(ctx.hoy, est) });
        }
    }
    proximos.sort((a, b) => (a.partoEstimado < b.partoEstimado ? -1 : 1));
    const edadVacias = Number(d.config?.edadParaAlertaVaciasMeses) || 18;
    const vaciasViejas = d.animals.filter(a => ACTIVO(a) && a.sex === "Hembra" && a.reproductiveStatus === "Vacía" && (U.edadMeses(a.birthDate, ctx.hoy) || 0) >= edadVacias).map(a => ({ cabra: a.id, lote: a.location, edadMeses: U.r1(U.edadMeses(a.birthDate, ctx.hoy)) }));
    return {
        informe: "Reproducción",
        periodo: { desde, hasta }, diasGestacion: gest,
        servicios: { total: serv.length, hembrasServidas: new Set(serv.map(s => s.femaleId)).size, serviciosPorHembra: U.r2(serv.length / (new Set(serv.map(s => s.femaleId)).size || 1)) },
        partos: {
            total: partos.length, normales: partos.filter(p => p.parturitionOutcome === "Normal").length,
            conMortinatos: partos.filter(p => p.parturitionOutcome === "Con Mortinatos").length, abortos: partos.filter(p => p.parturitionOutcome === "Aborto").length,
            porMes: partos.reduce((o, p) => { const m = U.mesDe(p.parturitionDate); o[m] = (o[m] || 0) + 1; return o; }, {}),
        },
        crias: {
            nacidasTotales: totales, vivas, muertasAlNacer: totales - vivas, prolificidad: U.r2(totales / (reales.length || 1)),
            pctPartosMultiples: U.pct(reales.filter(p => Number(p.offspringCount) > 1).length, reales.length),
            hembras: crias.filter(c => c.sex === "Hembra").length, machos: crias.filter(c => c.sex === "Macho").length,
            pesoNacerPromedio: U.r2(U.promedio(crias.map(c => Number(c.birthWeight)))),
        },
        intervaloEntrePartosDias: { promedio: U.r1(U.promedio(iep)), mediana: U.mediana(iep), muestra: iep.length },
        edadPrimerPartoMeses: { promedio: U.r1(U.promedio(epp)), muestra: epp.length },
        fertilidadPorServicio: { serviciosJuzgables: juzgables.length, terminaronEnParto: fecundos.filter(s => juzgables.includes(s)).length, pct: U.pct(fecundos.filter(s => juzgables.includes(s)).length, juzgables.length), nota: `Un servicio 'terminó en parto' si la hembra parió a ${gest} ± 15 días. Solo se juzgan servicios con ese plazo ya cumplido.` },
        porSemental: Object.entries(porSemental).map(([k, v]) => ({ semental: k, servicios: v.servicios, hembras: v.hembras.size, partos: v.partos, criasVivas: v.criasVivas })),
        proximosPartos: proximos,
        hembrasVaciasMayoresDe: { meses: edadVacias, total: vaciasViejas.length, lista: vaciasViejas },
    };
}

// ── 5. Crecimiento ──────────────────────────────────────────────────────────

function informeCrecimiento(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const ix = indice(d);
    const cfg = d.config || {};
    const porAnimal = new Map();
    for (const w of d.bodyWeighings) {
        if (!porAnimal.has(w.animalId)) porAnimal.set(w.animalId, []);
        porAnimal.get(w.animalId).push(w);
    }
    const filas = [];
    for (const [id, ws0] of porAnimal) {
        const a = ix.animales.get(id);
        if (!a || (args.sexo && a.sex !== args.sexo)) continue;
        let ws = ws0.filter(w => ENTRE(w.date, desde, hasta)).sort((x, y) => (x.date < y.date ? -1 : 1));
        if (Number(a.birthWeight) > 0 && ENTRE(a.birthDate, desde, hasta)) ws = [{ date: a.birthDate, kg: Number(a.birthWeight), nacimiento: true }, ...ws];
        if (ws.length < 2) continue;
        const ini = ws[0], fin = ws[ws.length - 1];
        const dias = U.diasEntre(ini.date, fin.date);
        if (!dias) continue;
        filas.push({
            animal: id, sexo: a.sex, etapa: a.lifecycleStage, lote: a.location, padre: a.fatherId || "", madre: a.motherId || "", tipoParto: a.parturitionType || "",
            desde: ini.date, pesoInicial: ini.kg, hasta: fin.date, pesoFinal: fin.kg, dias, gdpGramosDia: Math.round(((fin.kg - ini.kg) / dias) * 1000),
            edadMeses: U.r1(U.edadMeses(a.birthDate, fin.date)),
        });
    }
    const meta = Number(cfg.metaGdpDiaria) || 150;
    const grupo = (k) => {
        const m = {};
        for (const f of filas) (m[f[k] || "(sin dato)"] = m[f[k] || "(sin dato)"] || []).push(f.gdpGramosDia);
        return Object.entries(m).map(([g, xs]) => ({ grupo: g, animales: xs.length, gdpPromedio: Math.round(U.promedio(xs)), pctSobreMeta: U.pct(xs.filter(x => x >= meta).length, xs.length) }));
    };
    // Hitos: peso más cercano a 90/180/270 días (± 15) contra la meta de Configuración.
    const hitos = [[90, "growthGoal90dWeight", "growthGoal90dWeightMale"], [180, "growthGoal180dWeight", "growthGoal180dWeightMale"], [270, "growthGoal270dWeight", null]].map(([dia, kH, kM]) => {
        const r = { hito: `${dia} días`, hembras: { muestra: 0, cumplen: 0, meta: cfg[kH] ?? null }, machos: { muestra: 0, cumplen: 0, meta: kM ? cfg[kM] ?? null : null } };
        for (const a of d.animals) {
            if (!a.birthDate || a.birthDate === "N/A" || a.isReference) continue;
            const objetivo = U.sumarDias(a.birthDate, dia);
            if (!ENTRE(objetivo, desde, hasta)) continue;
            const w = (porAnimal.get(a.id) || []).map(x => ({ ...x, dif: Math.abs(U.diasEntre(objetivo, x.date)) })).filter(x => x.dif <= 15).sort((x, y) => x.dif - y.dif)[0];
            if (!w) continue;
            const s = a.sex === "Hembra" ? r.hembras : r.machos;
            s.muestra++;
            if (s.meta != null && w.kg >= s.meta) s.cumplen++;
        }
        for (const s of [r.hembras, r.machos]) s.pct = s.meta != null ? U.pct(s.cumplen, s.muestra) : null;
        return r;
    });
    filas.sort((a, b) => b.gdpGramosDia - a.gdpGramosDia);
    return {
        informe: "Crecimiento (peso corporal)",
        periodo: { desde, hasta }, metaGdpGramosDia: meta,
        metodo: "GDP = (último peso − primer peso del período) ÷ días. Si el animal nació en el período, el primer peso es el de nacimiento. Hitos: pesaje a ± 15 días de la edad meta.",
        animalesMedidos: filas.length,
        gdpPromedio: filas.length ? Math.round(U.promedio(filas.map(f => f.gdpGramosDia))) : null,
        pctSobreMeta: U.pct(filas.filter(f => f.gdpGramosDia >= meta).length, filas.length),
        porSexo: grupo("sexo"), porPadre: grupo("padre"), porTipoDeParto: grupo("tipoParto"), porLote: grupo("lote"),
        hitos,
        mejores: filas.slice(0, 10), peores: filas.slice(-10).reverse(),
        ...(args.detalle ? { todos: filas } : {}),
    };
}

// ── 6. Sanidad ──────────────────────────────────────────────────────────────

function informeSanidad(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const ix = indice(d);
    const ev = d.healthEvents.filter(e => ENTRE(e.date, desde, hasta));
    const suma = (xs) => U.r2(xs.reduce((s, e) => s + (Number(e.calculatedCost) || 0), 0));
    const grupo = (f) => {
        const m = {};
        for (const e of ev) { const k = f(e) || "(sin dato)"; (m[k] = m[k] || []).push(e); }
        return Object.entries(m).map(([k, xs]) => ({ grupo: k, aplicaciones: xs.length, animales: new Set(xs.map(x => x.animalId)).size, costo: suma(xs) })).sort((a, b) => b.aplicaciones - a.aplicaciones);
    };
    const retiro = [];
    for (const e of d.healthEvents) {
        const l = Number(e.diasRetiroLeche) || 0, c = Number(e.diasRetiroCarne) || 0;
        const finL = l ? U.sumarDias(e.date, l) : null, finC = c ? U.sumarDias(e.date, c) : null;
        if ((finL && finL >= ctx.hoy) || (finC && finC >= ctx.hoy)) {
            retiro.push({ animal: e.animalId, aplicado: e.date, producto: ix.productos.get(e.productUsed)?.name || e.productUsed || "", lecheHasta: finL && finL >= ctx.hoy ? finL : null, carneHasta: finC && finC >= ctx.hoy ? finC : null });
        }
    }
    // FAMACHA: última revisión de cada animal activo.
    const ult = new Map();
    for (const r of d.famachaRevs) { const x = ult.get(r.animalId); if (!x || r.fecha > x.fecha) ult.set(r.animalId, r); }
    const activos = d.animals.filter(ACTIVO);
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let conRev = 0;
    for (const a of activos) { const r = ult.get(a.id); if (r) { dist[r.score]++; conRev++; } }
    const revPeriodo = d.famachaRevs.filter(r => ENTRE(r.fecha, desde, hasta));
    const jornadas = {};
    for (const r of revPeriodo) { (jornadas[r.fecha] = jornadas[r.fecha] || { revisados: 0, f3omas: 0, dosis: 0 }); jornadas[r.fecha].revisados++; if (r.score >= 3) jornadas[r.fecha].f3omas++; if (r.dosis) jornadas[r.fecha].dosis++; }
    return {
        informe: "Sanidad",
        periodo: { desde, hasta },
        aplicaciones: ev.length, animalesTratados: new Set(ev.map(e => e.animalId)).size, costoTotal: suma(ev),
        costoPorAnimalActivo: U.r2(suma(ev) / (activos.length || 1)),
        porTipo: grupo(e => e.type), porProducto: grupo(e => ix.productos.get(e.productUsed)?.name || (e.productUsed ? e.productUsed : "(sin producto)")),
        porLote: grupo(e => e.lotName || ix.animales.get(e.animalId)?.location), porMes: grupo(e => U.mesDe(e.date)),
        enRetiroHoy: { total: retiro.length, lista: retiro },
        famacha: {
            activosConRevision: conRev, activosSinRevision: activos.length - conRev,
            ultimaRevisionPorScore: dist, pctF3oMas: U.pct(dist[3] + dist[4] + dist[5], conRev),
            jornadasDelPeriodo: Object.entries(jornadas).sort().map(([fecha, j]) => ({ fecha, ...j, pctF3oMas: U.pct(j.f3omas, j.revisados) })),
        },
    };
}

// ── 7. Bajas y mortalidad ───────────────────────────────────────────────────

function informeBajas(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const bajas = d.animals.filter(a => !a.isReference && a.status !== "Activo" && ENTRE(a.endDate, desde, hasta));
    const cuenta = (xs, f) => xs.reduce((o, x) => { const k = f(x) || "(sin dato)"; o[k] = (o[k] || 0) + 1; return o; }, {});
    // Existencias al inicio = vivos al 'desde' (nacidos antes y sin baja antes).
    const alInicio = d.animals.filter(a => !a.isReference && (a.birthDate === "N/A" || !a.birthDate || a.birthDate <= desde) && (a.status === "Activo" || !a.endDate || a.endDate >= desde)).length;
    const nacidos = d.animals.filter(a => !a.isReference && ENTRE(a.birthDate, desde, hasta)).length;
    const muertes = bajas.filter(a => a.status === "Muerte");
    const ventas = bajas.filter(a => a.status === "Venta");
    const enExposicion = alInicio + nacidos / 2;
    return {
        informe: "Bajas y mortalidad",
        periodo: { desde, hasta },
        metodo: "Mortalidad = muertes ÷ (existencias al inicio + la mitad de los nacidos en el período). Solo 'Muerte' es mortalidad biológica; Venta y Descarte no la afectan (misma regla de la app).",
        existenciasAlInicio: alInicio, nacidosEnElPeriodo: nacidos,
        bajas: bajas.length, porTipo: cuenta(bajas, a => a.status), porMes: cuenta(bajas, a => U.mesDe(a.endDate)),
        muertes: { total: muertes.length, pctMortalidad: U.pct(muertes.length, enExposicion), porCausa: cuenta(muertes, a => a.deathReason), porEtapa: cuenta(muertes, a => a.lifecycleStage), porSexo: cuenta(muertes, a => a.sex),
            menoresDe3Meses: muertes.filter(a => (U.edadMeses(a.birthDate, a.endDate) ?? 99) < 3).length },
        descartes: { total: bajas.filter(a => a.status === "Descarte").length, porMotivo: cuenta(bajas.filter(a => a.status === "Descarte"), a => a.cullReason) },
        ventas: { total: ventas.length, montoTotal: U.r2(ventas.reduce((s, a) => s + (Number(a.salePrice) || 0), 0)), porProposito: cuenta(ventas, a => a.salePurpose) },
        detalle: bajas.map(a => ({ animal: a.id, tipo: a.status, fecha: a.endDate, sexo: a.sex, etapa: a.lifecycleStage, motivo: a.deathReason || a.cullReason || "", precio: a.salePrice ?? null })),
    };
}

// ── 8. Económico ────────────────────────────────────────────────────────────

function informeEconomico(d, ctx, args) {
    const { desde, hasta } = periodo(args, ctx, 12);
    const ix = indice(d);
    const cfg = d.config || {};
    const precio = Number(args.precioLecheKg ?? cfg.precioLecheKg) || 0;
    const mon = cfg.monedaSimbolo || "$";
    const porAnimal = new Map();
    const fila = (id) => { if (!porAnimal.has(id)) porAnimal.set(id, { animal: id, lecheKg: 0, diasLeche: 0, costoSanitario: 0, venta: 0 }); return porAnimal.get(id); };
    // Leche por lactancia (los pesajes de una lactancia, integrados y recortados al período).
    for (const p of d.parturitions) {
        const lista = ix.partosPorMadre.get(p.goatId) || [];
        const sig = lista.find(x => x.parturitionDate > p.parturitionDate);
        const ws = d.weighings.filter(w => w.goatId === p.goatId && w.date >= p.parturitionDate && (!sig || w.date < sig.parturitionDate));
        if (ws.length < 2) continue;
        const e = lecheEstimada(ws, desde, hasta);
        if (e.dias) { const f = fila(p.goatId); f.lecheKg += e.kg; f.diasLeche += e.dias; }
    }
    for (const e of d.healthEvents) if (ENTRE(e.date, desde, hasta) && Number(e.calculatedCost)) fila(e.animalId).costoSanitario += Number(e.calculatedCost);
    for (const a of d.animals) if (a.status === "Venta" && ENTRE(a.endDate, desde, hasta) && Number(a.salePrice)) fila(a.id).venta += Number(a.salePrice);
    const filas = [...porAnimal.values()].map(f => ({ ...f, lecheKg: U.r1(f.lecheKg), ingresoLeche: U.r2(f.lecheKg * precio), costoSanitario: U.r2(f.costoSanitario), venta: U.r2(f.venta), margen: U.r2(f.lecheKg * precio + f.venta - f.costoSanitario), lote: ix.animales.get(f.animal)?.location || "" }));
    const tot = (k) => U.r2(filas.reduce((s, f) => s + (f[k] || 0), 0));
    const porMes = {};
    for (const p of d.parturitions) {
        const lista = ix.partosPorMadre.get(p.goatId) || [];
        const sig = lista.find(x => x.parturitionDate > p.parturitionDate);
        const ws = d.weighings.filter(w => w.goatId === p.goatId && w.date >= p.parturitionDate && (!sig || w.date < sig.parturitionDate));
        if (ws.length < 2) continue;
        // por mes calendario dentro del período
        let m = U.mesDe(desde);
        while (m && m <= U.mesDe(hasta)) {
            const ini = m + "-01" < desde ? desde : m + "-01";
            const finMes = U.sumarDias(U.mesDe(U.sumarDias(m + "-28", 7)) + "-01", -1);
            const fin = finMes > hasta ? hasta : finMes;
            const e = lecheEstimada(ws, ini, fin);
            if (e.dias) { porMes[m] = porMes[m] || { lecheKg: 0 }; porMes[m].lecheKg += e.kg; }
            m = U.mesDe(U.sumarDias(finMes, 1));
        }
    }
    for (const e of d.healthEvents) if (ENTRE(e.date, desde, hasta)) { const m = U.mesDe(e.date); porMes[m] = porMes[m] || { lecheKg: 0 }; porMes[m].costoSanitario = (porMes[m].costoSanitario || 0) + (Number(e.calculatedCost) || 0); }
    filas.sort((a, b) => b.margen - a.margen);
    return {
        informe: "Económico",
        periodo: { desde, hasta }, moneda: mon, precioLecheKg: precio,
        metodo: "Leche = estimación entre pesajes consecutivos de cada lactancia (interpolación lineal, huecos > 60 días sin rellenar), por eso depende de la frecuencia de los controles. Ingreso = leche × precio de Configuración. Costos = solo los sanitarios registrados (no hay alimentación ni mano de obra en GanaderoOS).",
        totales: { lecheKg: tot("lecheKg"), ingresoLeche: tot("ingresoLeche"), ventasAnimales: tot("venta"), costoSanitario: tot("costoSanitario"), margen: tot("margen") },
        porMes: Object.entries(porMes).sort().map(([mes, v]) => ({ mes, lecheKg: U.r1(v.lecheKg), ingresoLeche: U.r2(v.lecheKg * precio), costoSanitario: U.r2(v.costoSanitario || 0) })),
        masRentables: filas.slice(0, 10), menosRentables: filas.slice(-10).reverse(),
        ...(args.detalle ? { todos: filas } : {}),
    };
}

// ── 9. Padres (prueba de progenie) ──────────────────────────────────────────

function informePadres(d, ctx, args) {
    const ix = indice(d);
    const nombre = new Map([...d.fathers.map(f => [f.id, f.name]), ...d.animals.map(a => [a.id, a.name || a.id])]);
    const hijos = {};
    for (const a of d.animals) if (a.fatherId && !a.isReference) (hijos[a.fatherId] = hijos[a.fatherId] || []).push(a);
    const filas = Object.entries(hijos).map(([padre, hs]) => {
        const gdps = hs.map(h => {
            const w = d.bodyWeighings.filter(x => x.animalId === h.id).sort((x, y) => (x.date < y.date ? -1 : 1));
            const ini = Number(h.birthWeight) > 0 ? { date: h.birthDate, kg: Number(h.birthWeight) } : w[0];
            const fin = w[w.length - 1];
            const dias = ini && fin ? U.diasEntre(ini.date, fin.date) : 0;
            return dias > 30 ? ((fin.kg - ini.kg) / dias) * 1000 : null;
        });
        const hijas = hs.filter(h => h.sex === "Hembra").map(h => h.id);
        const lecheHijas = d.weighings.filter(w => hijas.includes(w.goatId)).map(w => w.kg);
        return {
            padre, nombre: nombre.get(padre) || padre, crias: hs.length, hembras: hijas.length, machos: hs.length - hijas.length,
            vivasHoy: hs.filter(h => h.status === "Activo").length, muertas: hs.filter(h => h.status === "Muerte").length,
            pesoNacerPromedio: U.r2(U.promedio(hs.map(h => Number(h.birthWeight)))),
            gdpHijosGramosDia: U.promedio(gdps) != null ? Math.round(U.promedio(gdps)) : null, hijosConGdp: gdps.filter(x => x != null).length,
            hijasConPesajeDeLeche: new Set(d.weighings.filter(w => hijas.includes(w.goatId)).map(w => w.goatId)).size,
            kgLechePromedioHijas: U.r2(U.promedio(lecheHijas)),
            partosDeHijas: hijas.reduce((s, h) => s + (ix.partosPorMadre.get(h) || []).filter(p => !p.provisional).length, 0),
        };
    }).sort((a, b) => b.crias - a.crias);
    return {
        informe: "Prueba de progenie por padre",
        metodo: "GDP de cada hijo = desde el peso al nacer (o su primer pesaje) hasta su último pesaje, si hay más de 30 días entre ambos. Leche de hijas = promedio de todos sus pesajes.",
        padres: filas,
    };
}

// ── 10. Ficha del animal ────────────────────────────────────────────────────

function fichaAnimal(d, ctx, id) {
    const ix = indice(d);
    const a = ix.animales.get(id);
    if (!a) throw new Error(`el animal '${id}' no existe.`);
    const por = (col, k) => d[col].filter(x => x[k] === id);
    const partos = (ix.partosPorMadre.get(id) || []).map(p => ({ ...p, numero: numeroLactancia(ix, p) }));
    const ultPeso = por("bodyWeighings", "animalId").sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    return {
        animal: a,
        edadMeses: U.r1(U.edadMeses(a.birthDate, ctx.hoy)),
        madre: a.motherId ? ix.animales.get(a.motherId) || { id: a.motherId, nota: "no registrada" } : null,
        padre: a.fatherId ? ix.animales.get(a.fatherId) || d.fathers.find(f => f.id === a.fatherId) || { id: a.fatherId, nota: "no registrado" } : null,
        crias: d.animals.filter(x => x.motherId === id || x.fatherId === id).map(x => ({ id: x.id, sexo: x.sex, nacimiento: x.birthDate, estado: x.status })),
        partos, pesajesLeche: por("weighings", "goatId").sort((x, y) => (x.date < y.date ? -1 : 1)),
        pesajesCorporales: por("bodyWeighings", "animalId").sort((x, y) => (x.date < y.date ? -1 : 1)), ultimoPeso: ultPeso || null,
        servicios: por("serviceRecords", "femaleId"), sanidad: por("healthEvents", "animalId").sort((x, y) => (x.date < y.date ? -1 : 1)),
        famacha: por("famachaRevs", "animalId").sort((x, y) => (x.fecha < y.fecha ? -1 : 1)),
        eventos: por("events", "animalId").sort((x, y) => (x.date < y.date ? -1 : 1)),
    };
}

// ── 11. Análisis libre (cruces) ─────────────────────────────────────────────

const FECHA_PRINCIPAL = { weighings: "date", bodyWeighings: "date", events: "date", healthEvents: "date", parturitions: "parturitionDate", serviceRecords: "serviceDate", famachaRevs: "fecha", animals: "birthDate", feedingPlans: "startDate", breedingSeasons: "startDate" };
const REF_ANIMAL = { weighings: "goatId", bodyWeighings: "animalId", events: "animalId", healthEvents: "animalId", parturitions: "goatId", serviceRecords: "femaleId", famachaRevs: "animalId", animals: "id" };

function enriquecer(d, ctx, coleccion, ix) {
    const fecha = FECHA_PRINCIPAL[coleccion];
    const ref = REF_ANIMAL[coleccion];
    const sl = new Map(d.sireLots.map(l => [l.id, l]));
    return d[coleccion].map(x => {
        const r = { ...x };
        const f = fecha ? x[fecha] : null;
        if (f && U.RE_FECHA.test(String(f))) { r.mes = U.mesDe(f); r.semana = U.semanaDe(f); r.anio = U.anioDe(f); }
        if (ref) {
            const a = ix.animales.get(x[ref]);
            if (a) {
                r.animal = { sexo: a.sex, raza: a.breed || "", lote: a.location || "", etapa: a.lifecycleStage, estado: a.status, estadoReproductivo: a.reproductiveStatus,
                    padre: a.fatherId || "", madre: a.motherId || "", origen: a.origin || "", composicion: a.racialComposition || "", tipoParto: a.parturitionType || "",
                    edadMeses: U.r1(U.edadMeses(a.birthDate, f || ctx.hoy)), anioNacimiento: U.anioDe(a.birthDate) };
            }
        }
        if (coleccion === "weighings" || coleccion === "famachaRevs" || coleccion === "healthEvents" || coleccion === "bodyWeighings") {
            const lac = lactanciaDe(ix, x[ref], f);
            if (lac) { const del = U.diasEntre(lac.parturitionDate, f); r.lactancia = { numero: numeroLactancia(ix, lac), del, tramoDEL: tramoDEL(del), parto: lac.parturitionDate, padreCrias: lac.sireId }; }
            else r.lactancia = { numero: 0, tramoDEL: "sin lactancia" };
        }
        if (coleccion === "serviceRecords") r.semental = sl.get(x.sireLotId)?.sireId || "";
        if (coleccion === "healthEvents") r.producto = ix.productos.get(x.productUsed)?.name || "";
        if (coleccion === "parturitions") { r.numeroLactancia = numeroLactancia(ix, x); r.criasVivas = x.liveOffspring?.length || 0; }
        return r;
    });
}

const leer = (o, ruta) => String(ruta).split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);

function pasaFiltro(x, f) {
    const v = leer(x, f.campo);
    const w = f.valor;
    switch (f.operador) {
        case "==": return v == w; // eslint-disable-line eqeqeq
        case "!=": return v != w; // eslint-disable-line eqeqeq
        case ">": return v > w;
        case ">=": return v >= w;
        case "<": return v < w;
        case "<=": return v <= w;
        case "en": return Array.isArray(w) && w.includes(v);
        case "no_en": return Array.isArray(w) && !w.includes(v);
        case "contiene": return String(v ?? "").toLowerCase().includes(String(w).toLowerCase());
        case "existe": return w === false ? v == null || v === "" : v != null && v !== "";
        default: throw new Error(`operador desconocido: ${f.operador}`);
    }
}

function metrica(xs, m) {
    const vals = m.campo ? xs.map(x => Number(leer(x, m.campo))).filter(Number.isFinite) : [];
    switch (m.op) {
        case "conteo": return xs.length;
        case "distintos": return new Set(xs.map(x => leer(x, m.campo)).filter(v => v != null && v !== "")).size;
        case "suma": return U.r2(vals.reduce((s, v) => s + v, 0));
        case "promedio": return U.r2(U.promedio(vals));
        case "mediana": return U.r2(U.mediana(vals));
        case "min": return vals.length ? Math.min(...vals) : null;
        case "max": return vals.length ? Math.max(...vals) : null;
        case "desviacion": return U.r2(U.desviacion(vals));
        default: throw new Error(`métrica desconocida: ${m.op}`);
    }
}

function analizar(d, ctx, args) {
    const { coleccion, filtros = [], agruparPor = [], metricas = [{ op: "conteo" }], desde, hasta, ordenarPor, direccion = "desc", limite = 200 } = args;
    if (!d[coleccion]) throw new Error(`colección desconocida: ${coleccion}.`);
    const ix = indice(d);
    let filas = enriquecer(d, ctx, coleccion, ix);
    const fc = FECHA_PRINCIPAL[coleccion];
    if ((desde || hasta) && fc) filas = filas.filter(x => ENTRE(x[fc], desde && U.fechaValida(desde, "desde"), hasta && U.fechaValida(hasta, "hasta")));
    for (const f of filtros) filas = filas.filter(x => pasaFiltro(x, f));
    const nombreM = (m) => m.nombre || `${m.op}${m.campo ? "_" + m.campo.replace(/\./g, "_") : ""}`;
    const grupos = new Map();
    for (const x of filas) {
        const clave = agruparPor.map(g => leer(x, g) ?? "(sin dato)");
        const k = JSON.stringify(clave);
        if (!grupos.has(k)) grupos.set(k, { clave, filas: [] });
        grupos.get(k).filas.push(x);
    }
    let res = [...grupos.values()].map(g => {
        const o = {};
        agruparPor.forEach((c, i) => { o[c] = g.clave[i]; });
        for (const m of metricas) o[nombreM(m)] = metrica(g.filas, m);
        return o;
    });
    const ord = ordenarPor || (metricas[0] ? nombreM(metricas[0]) : null);
    if (ord) res.sort((a, b) => {
        const va = a[ord], vb = b[ord];
        const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es", { numeric: true });
        return direccion === "asc" ? c : -c;
    });
    const total = res.length;
    res = res.slice(0, Math.min(Number(limite) || 200, 2000));
    return {
        coleccion, registrosQueCumplen: filas.length, grupos: total, mostrados: res.length,
        camposDerivados: "mes, semana, anio (de la fecha principal); animal.{sexo,raza,lote,etapa,estado,estadoReproductivo,padre,madre,origen,composicion,tipoParto,edadMeses,anioNacimiento}; lactancia.{numero,del,tramoDEL,parto,padreCrias} (pesajes, famacha, sanidad); semental (servicios); producto (sanidad); numeroLactancia y criasVivas (partos).",
        resultado: res,
    };
}

const INFORMES = {
    rebano: informeRebano, produccion_leche: informeLeche, lactancias: informeLactancias, reproduccion: informeReproduccion,
    crecimiento: informeCrecimiento, sanidad: informeSanidad, bajas: informeBajas, economico: informeEconomico, padres: informePadres,
};

module.exports = { INFORMES, analizar, fichaAnimal, lecheEstimada, enriquecer, pasaFiltro, numeroLactancia, lactanciaDe, indice };

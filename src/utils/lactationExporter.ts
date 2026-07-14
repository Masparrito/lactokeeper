// src/utils/lactationExporter.ts
// Exportaciones de la Curva de Lactancia del rebaño:
//   1) PDF (imagen del gráfico + tablas de KPIs y datos)
//   2) CSV para Excel (datos de la curva + KPIs, con BOM UTF-8)
//   3) HTML interactivo autocontenido ("súper gráfico dinámico", offline)
//
// El HTML no depende de ninguna librería externa: el gráfico se dibuja como
// SVG y la interactividad (hover, toggles) es JS puro embebido. Así el archivo
// funciona sin conexión al abrirlo en cualquier navegador.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { HerdLactationResult } from '../hooks/useHerdLactation';

export interface LactationExportMeta {
    periodLabel: string;
    herdAverage?: number;
    activeGoats?: number;
    farmName?: string;
}

const HEADING_COLOR = '#1E6FAD';
const TEXT_COLOR_DARK = '#374151';
const stamp = () => new Date().toISOString().split('T')[0];
const nowStr = () => new Date().toLocaleString('es-VE');

// ---------------------------------------------------------------------------
// 1) PDF
// ---------------------------------------------------------------------------
export const exportLactationToPDF = async (
    element: HTMLElement,
    data: HerdLactationResult,
    meta: LactationExportMeta,
) => {
    const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdfWidth = 210, pdfHeight = 297, m = 12;
    const contentWidth = pdfWidth - m * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(HEADING_COLOR);
    doc.text('LactoKeeper — Curva de Lactancia', m, m + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(TEXT_COLOR_DARK);
    const subtitle = [
        meta.farmName ? meta.farmName : null,
        `Período: ${meta.periodLabel}`,
        `Meta lactancia: ${data.targetDays} días`,
        `Muestra: ${data.sampleSize.weighings} pesajes / ${data.sampleSize.animals} animales`,
    ].filter(Boolean).join('   ·   ');
    doc.text(subtitle, m, m + 13);

    // Imagen del gráfico
    let y = m + 20;
    const maxImgHeight = 150;
    const drawHeight = Math.min(imgHeight, maxImgHeight);
    const drawWidth = (canvas.width * drawHeight) / canvas.height;
    doc.addImage(imgData, 'PNG', m, y, Math.min(contentWidth, drawWidth), drawHeight);
    y += Math.min(imgHeight, maxImgHeight) + 8;

    // Tabla de KPIs
    if (data.kpis) {
        autoTable(doc, {
            startY: y,
            head: [['Indicador', 'Valor']],
            body: [
                ['Día pico', `${data.kpis.peakDay} días`],
                ['Producción pico', `${data.kpis.peakYield.toFixed(2)} Kg/día`],
                ['Persistencia (100 d tras pico)', `${data.kpis.persistence} %`],
                [`Proyección ${data.targetDays} días`, `${data.kpis.projTotal} Kg`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [30, 111, 173], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 2.5 },
            margin: { left: m, right: m },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Tabla de datos (curva por bins de 10 días)
    const rows = data.chart
        .filter(p => p.wood != null || p.n > 0)
        .map(p => [
            String(Math.round(p.del)),
            p.wood != null ? p.wood.toFixed(2) : '—',
            p.p25 != null ? p.p25.toFixed(2) : '—',
            p.p75 != null ? p.p75.toFixed(2) : '—',
            p.mean != null ? p.mean.toFixed(2) : '—',
            String(p.n),
        ]);
    if (rows.length) {
        autoTable(doc, {
            startY: y,
            head: [['DEL', 'Curva (Kg)', 'P25', 'P75', 'Promedio', 'N']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [47, 132, 60], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
            margin: { left: m, right: m },
        });
    }

    // Pie
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#9ca3af');
        doc.text(`Página ${i} de ${pages}`, pdfWidth - m, pdfHeight - 8, { align: 'right' });
        doc.text(`Generado: ${nowStr()}`, m, pdfHeight - 8);
    }

    doc.save(`CurvaLactancia_${stamp()}.pdf`);
};

// ---------------------------------------------------------------------------
// 2) CSV
// ---------------------------------------------------------------------------
const esc = (v: any): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportLactationToCSV = (data: HerdLactationResult, meta: LactationExportMeta) => {
    const lines: string[] = [];
    lines.push('LactoKeeper - Curva de Lactancia del Rebaño');
    if (meta.farmName) lines.push(`Finca,${esc(meta.farmName)}`);
    lines.push(`Generado,${esc(nowStr())}`);
    lines.push(`Período,${esc(meta.periodLabel)}`);
    lines.push(`Meta lactancia (días),${data.targetDays}`);
    lines.push(`Pesajes,${data.sampleSize.weighings}`);
    lines.push(`Animales,${data.sampleSize.animals}`);
    lines.push('');
    if (data.kpis) {
        lines.push('Indicador,Valor,Unidad');
        lines.push(`Día pico,${data.kpis.peakDay},días`);
        lines.push(`Producción pico,${data.kpis.peakYield.toFixed(2)},Kg/día`);
        lines.push(`Persistencia,${data.kpis.persistence},%`);
        lines.push(`Proyección ${data.targetDays}d,${data.kpis.projTotal},Kg`);
        lines.push('');
    }
    lines.push('DEL,Curva Wood (Kg),P25 (Kg),P75 (Kg),Promedio (Kg),N pesajes');
    data.chart.forEach(p => {
        lines.push([
            Math.round(p.del),
            p.wood ?? '',
            p.p25 ?? '',
            p.p75 ?? '',
            p.mean ?? '',
            p.n,
        ].map(esc).join(','));
    });

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CurvaLactancia_${stamp()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// 3) HTML interactivo autocontenido
// ---------------------------------------------------------------------------
export const exportLactationToHTML = (data: HerdLactationResult, meta: LactationExportMeta) => {
    const payload = {
        chart: data.chart,
        kpis: data.kpis,
        targetDays: data.targetDays,
        displayMax: data.displayMax,
        sampleSize: data.sampleSize,
        periodLabel: meta.periodLabel,
        farmName: meta.farmName || '',
        herdAverage: meta.herdAverage ?? null,
        generatedAt: nowStr(),
    };

    const html = buildInteractiveHTML(payload);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CurvaLactancia_Interactiva_${stamp()}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function buildInteractiveHTML(payload: any): string {
    const json = JSON.stringify(payload).replace(/</g, '\\u003c');
    // El gráfico y toda la interactividad se dibujan con SVG + JS puro embebido.
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>LactoKeeper · Curva de Lactancia</title>
<style>
  :root{
    --bg:#f1f5f9; --surface:#ffffff; --surface2:#f8fafc; --border:#e2e8f0;
    --text:#0f172a; --muted:#475569; --faint:#94a3b8;
    --sky:#1E6FAD; --green:#2F843C; --gold:#B45309;
  }
  [data-theme="dark"]{
    --bg:#0b1220; --surface:#111a2b; --surface2:#0f1826; --border:#1e2b40;
    --text:#e6edf6; --muted:#9fb0c4; --faint:#6b7d94;
    --sky:#4ea3e0; --green:#4caf50; --gold:#f0a83c;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);padding:20px;line-height:1.4}
  .wrap{max-width:960px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px}
  h1{font-size:20px;margin:0 0 2px}
  .sub{color:var(--muted);font-size:13px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;margin-top:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(min-width:640px){.kpis{grid-template-columns:repeat(4,1fr)}}
  .kpi{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px}
  .kpi .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;margin-bottom:6px}
  .kpi .val{font-size:24px;font-weight:800}
  .kpi .val small{font-size:13px;font-weight:500;color:var(--faint);margin-left:3px}
  .kpi .hint{font-size:10px;color:var(--faint);margin-top:5px}
  .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
  .chip{border:1px solid var(--border);background:var(--surface2);color:var(--muted);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;user-select:none}
  .chip.on{background:var(--sky);color:#fff;border-color:var(--sky)}
  .chart-wrap{position:relative;width:100%;overflow-x:auto}
  svg{display:block;width:100%;height:auto;touch-action:none}
  .tooltip{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-size:12px;box-shadow:0 6px 20px rgba(0,0,0,.15);opacity:0;transition:opacity .1s;white-space:nowrap}
  .tooltip b{color:var(--text)}
  .legend{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:10px;font-size:11px;color:var(--faint)}
  .legend span{display:flex;align-items:center;gap:6px}
  .swatch{width:16px;height:3px;border-radius:2px;display:inline-block}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
  th,td{padding:6px 8px;text-align:center;border-bottom:1px solid var(--border)}
  th{color:var(--muted);font-weight:600;position:sticky;top:0;background:var(--surface)}
  .tbl-wrap{max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:12px}
  .theme-btn{border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:10px;padding:6px 12px;font-size:12px;cursor:pointer}
  .foot{color:var(--faint);font-size:11px;text-align:center;margin-top:18px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>Curva de Lactancia del Rebaño</h1>
      <div class="sub" id="sub"></div>
    </div>
    <button class="theme-btn" id="themeBtn">🌙 Tema</button>
  </header>

  <div class="card">
    <div class="kpis" id="kpis"></div>
  </div>

  <div class="card">
    <div class="toolbar">
      <span class="chip on" data-k="band">Banda P25–P75</span>
      <span class="chip on" data-k="wood">Curva ajustada</span>
      <span class="chip on" data-k="mean">Promedios</span>
      <span class="chip on" data-k="meta">Meta lactancia</span>
    </div>
    <div class="chart-wrap">
      <div class="tooltip" id="tip"></div>
      <svg id="chart" viewBox="0 0 900 440" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
    <div class="legend">
      <span><i class="swatch" style="background:var(--sky)"></i>Curva ajustada (Wood)</span>
      <span><i class="swatch" style="background:var(--sky);opacity:.25;height:12px;width:12px;border-radius:3px"></i>Rango P25–P75</span>
      <span><i class="swatch" style="background:var(--green)"></i>Pico</span>
      <span><i class="swatch" style="background:var(--gold)"></i>Meta lactancia</span>
    </div>
  </div>

  <div class="card">
    <div class="sub" style="margin-bottom:8px;font-weight:600;color:var(--text)">Datos por intervalo (10 días)</div>
    <div class="tbl-wrap">
      <table id="tbl">
        <thead><tr><th>DEL</th><th>Curva (Kg)</th><th>P25</th><th>P75</th><th>Promedio</th><th>N</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <div class="foot" id="foot"></div>
</div>

<script>
const DATA = ${json};
const show = { band:true, wood:true, mean:true, meta:true };

// --- Subtítulo, KPIs, tabla, pie ---
document.getElementById('sub').textContent =
  [DATA.farmName, 'Período: '+DATA.periodLabel, 'Meta: '+DATA.targetDays+' días',
   DATA.sampleSize.weighings+' pesajes · '+DATA.sampleSize.animals+' animales']
  .filter(Boolean).join('   ·   ');
document.getElementById('foot').textContent = 'LactoKeeper · Generado el '+DATA.generatedAt+' · Archivo interactivo autocontenido';

(function(){
  const k = DATA.kpis; const box = document.getElementById('kpis');
  const cards = k ? [
    {lbl:'Día pico', val:k.peakDay, unit:'días', hint:'DEL del máximo'},
    {lbl:'Producción pico', val:k.peakYield.toFixed(2), unit:'Kg/día', hint:'Máximo del rebaño'},
    {lbl:'Persistencia', val:k.persistence, unit:'%', hint:'100 días tras el pico'},
    {lbl:'Proy. '+DATA.targetDays+' d', val:k.projTotal, unit:'Kg', hint:'Total por lactancia'},
  ] : [{lbl:'Sin datos suficientes', val:'—', unit:'', hint:'Amplía el período'}];
  box.innerHTML = cards.map(c=>'<div class="kpi"><div class="lbl">'+c.lbl+'</div><div class="val">'+c.val+'<small>'+c.unit+'</small></div><div class="hint">'+c.hint+'</div></div>').join('');
})();

(function(){
  const tb = document.querySelector('#tbl tbody');
  tb.innerHTML = DATA.chart.map(p=>'<tr><td>'+Math.round(p.del)+'</td><td>'+(p.wood!=null?p.wood.toFixed(2):'—')+'</td><td>'+(p.p25!=null?p.p25.toFixed(2):'—')+'</td><td>'+(p.p75!=null?p.p75.toFixed(2):'—')+'</td><td>'+(p.mean!=null?p.mean.toFixed(2):'—')+'</td><td>'+p.n+'</td></tr>').join('');
})();

// --- Gráfico SVG ---
const SVG_NS='http://www.w3.org/2000/svg';
const W=900,H=440, pad={l:52,r:20,t:20,b:44};
const plotW=W-pad.l-pad.r, plotH=H-pad.t-pad.b;
const xMax=DATA.displayMax;
let yMax=0;
DATA.chart.forEach(p=>{ [p.wood,p.p75,p.mean].forEach(v=>{ if(v!=null&&v>yMax) yMax=v; }); });
yMax = Math.ceil((yMax*1.1)/0.5)*0.5 || 5;
const X=d=> pad.l + (d/xMax)*plotW;
const Y=v=> pad.t + plotH - (v/yMax)*plotH;

function el(name,attrs){ const e=document.createElementNS(SVG_NS,name); for(const k in attrs) e.setAttribute(k,attrs[k]); return e; }
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

function draw(){
  const svg=document.getElementById('chart'); svg.innerHTML='';
  const cSky=cssVar('--sky'), cGreen=cssVar('--green'), cGold=cssVar('--gold'), cBorder=cssVar('--border'), cFaint=cssVar('--faint');

  // Grid + ejes Y
  const ySteps=5;
  for(let i=0;i<=ySteps;i++){
    const v=yMax*i/ySteps, y=Y(v);
    svg.appendChild(el('line',{x1:pad.l,y1:y,x2:W-pad.r,y2:y,stroke:cBorder,'stroke-dasharray':'3 3'}));
    const t=el('text',{x:pad.l-8,y:y+4,'text-anchor':'end','font-size':11,fill:cFaint}); t.textContent=v.toFixed(1); svg.appendChild(t);
  }
  // Ejes X (cada 50 días)
  for(let d=0; d<=xMax; d+=50){
    const x=X(d);
    const t=el('text',{x:x,y:H-pad.b+18,'text-anchor':'middle','font-size':11,fill:cFaint}); t.textContent=d; svg.appendChild(t);
  }
  const xl=el('text',{x:pad.l+plotW/2,y:H-6,'text-anchor':'middle','font-size':11,fill:cFaint}); xl.textContent='Días en leche (DEL)'; svg.appendChild(xl);

  // Banda P25-P75
  if(show.band){
    const pts=DATA.chart.filter(p=>p.p25!=null&&p.p75!=null);
    if(pts.length>1){
      let d='M'+pts.map(p=>X(p.del)+' '+Y(p.p75)).join(' L');
      for(let i=pts.length-1;i>=0;i--){ d+=' L'+X(pts[i].del)+' '+Y(pts[i].p25); }
      d+=' Z';
      svg.appendChild(el('path',{d:d,fill:cSky,'fill-opacity':.15,stroke:'none'}));
    }
  }
  // Meta
  if(show.meta && DATA.targetDays<=xMax){
    const x=X(DATA.targetDays);
    svg.appendChild(el('line',{x1:x,y1:pad.t,x2:x,y2:pad.t+plotH,stroke:cGold,'stroke-width':1.5,'stroke-dasharray':'2 4'}));
    const t=el('text',{x:x-4,y:pad.t+12,'text-anchor':'end','font-size':10,fill:cGold}); t.textContent='Meta '+DATA.targetDays+'d'; svg.appendChild(t);
  }
  // Pico
  if(DATA.kpis && show.wood){
    const x=X(DATA.kpis.peakDay);
    svg.appendChild(el('line',{x1:x,y1:pad.t,x2:x,y2:pad.t+plotH,stroke:cGreen,'stroke-width':1.5,'stroke-dasharray':'4 4'}));
    const t=el('text',{x:x+4,y:pad.t+12,'text-anchor':'start','font-size':10,fill:cGreen}); t.textContent='Pico'; svg.appendChild(t);
  }
  // Curva Wood
  if(show.wood){
    const pts=DATA.chart.filter(p=>p.wood!=null);
    if(pts.length>1){
      const d='M'+pts.map(p=>X(p.del)+' '+Y(p.wood)).join(' L');
      svg.appendChild(el('path',{d:d,fill:'none',stroke:cSky,'stroke-width':3,'stroke-linejoin':'round'}));
    }
  }
  // Promedios (puntos)
  if(show.mean){
    DATA.chart.filter(p=>p.mean!=null).forEach(p=>{
      svg.appendChild(el('circle',{cx:X(p.del),cy:Y(p.mean),r:3,fill:cSky,'fill-opacity':.55}));
    });
  }
  // Capa de hover
  const tip=document.getElementById('tip');
  const hoverLine=el('line',{x1:0,y1:pad.t,x2:0,y2:pad.t+plotH,stroke:cFaint,'stroke-width':1,opacity:0});
  svg.appendChild(hoverLine);
  const rect=el('rect',{x:pad.l,y:pad.t,width:plotW,height:plotH,fill:'transparent'});
  svg.appendChild(rect);
  rect.addEventListener('pointermove',ev=>{
    const box=svg.getBoundingClientRect();
    const px=(ev.clientX-box.left)*(W/box.width);
    const del=(px-pad.l)/plotW*xMax;
    let best=null,bd=1e9;
    DATA.chart.forEach(p=>{ const dd=Math.abs(p.del-del); if(dd<bd){bd=dd;best=p;} });
    if(!best) return;
    const x=X(best.del);
    hoverLine.setAttribute('x1',x); hoverLine.setAttribute('x2',x); hoverLine.setAttribute('opacity',1);
    tip.style.opacity=1;
    tip.innerHTML='<b>Día '+Math.round(best.del)+'</b>'+
      (best.wood!=null?'<br>Curva: '+best.wood+' Kg':'')+
      (best.p25!=null&&best.p75!=null?'<br>Rango: '+best.p25+'–'+best.p75+' Kg':'')+
      '<br>'+best.n+' pesajes';
    const wrapBox=svg.parentElement.getBoundingClientRect();
    let lx=(x/W)*wrapBox.width+10; if(lx>wrapBox.width-140) lx-=160;
    tip.style.left=lx+'px'; tip.style.top='10px';
  });
  rect.addEventListener('pointerleave',()=>{ tip.style.opacity=0; hoverLine.setAttribute('opacity',0); });
}

document.querySelectorAll('.chip').forEach(ch=>{
  ch.addEventListener('click',()=>{ const k=ch.dataset.k; show[k]=!show[k]; ch.classList.toggle('on',show[k]); draw(); });
});
document.getElementById('themeBtn').addEventListener('click',()=>{
  const cur=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',cur);
  document.getElementById('themeBtn').textContent = cur==='dark'?'☀️ Tema':'🌙 Tema';
  draw();
});
draw();
</script>
</body>
</html>`;
}

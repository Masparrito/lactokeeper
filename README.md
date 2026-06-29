# 🐐 GanaderoOS — LactoKeeper

> El sistema operativo para la gestión ganadera caprina. **Offline‑first**, instalable como PWA y pensado para usarse en el campo, sin conexión, con sincronización automática a la nube.

GanaderoOS (nombre del paquete: `ganadero-os`; marca pública: **LactoKeeper**) no es solo un registro de animales: es una plataforma integral que cubre todo el ciclo productivo de una finca de cabras — reproducción, producción lechera, crecimiento, sanidad, economía y simulación estratégica.

- **Idioma:** Español (es‑VE), con terminología zootécnica venezolana (cabra, cabritona, cabrito, semental…).
- **Filosofía:** *offline‑first*. La base local (IndexedDB vía Dexie) es la **fuente de verdad de escritura**; Firebase Firestore es la capa de respaldo y sincronización en tiempo real.

---

## Tabla de contenidos

1. [Arranque rápido](#-arranque-rápido)
2. [Stack tecnológico](#-stack-tecnológico)
3. [Arquitectura](#-arquitectura)
4. [Sincronización offline‑first](#-sincronización-offline-first)
5. [Módulos](#-módulos)
6. [Modelo de datos](#-modelo-de-datos)
7. [Configuración de la finca](#-configuración-de-la-finca)
8. [Estructura del proyecto](#-estructura-del-proyecto)
9. [Estado y pendientes conocidos](#-estado-y-pendientes-conocidos)

---

## 🚀 Arranque rápido

### Requisitos
- Node.js 18+ y npm.
- Un proyecto de Firebase (Authentication + Firestore).

### Instalación

```bash
npm install
```

### Variables de entorno

La app lee la configuración de Firebase desde variables `VITE_*` (ver `src/firebaseConfig.ts`). Crea un archivo `.env` en la raíz:

```env
VITE_API_KEY=...
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...
VITE_STORAGE_BUCKET=...
VITE_MESSAGING_SENDER_ID=...
VITE_APP_ID=...
```

> En GitHub Codespaces estos valores se inyectan vía **Codespaces Secrets** (no se versionan).

### Scripts

```bash
npm run dev       # Servidor de desarrollo (Vite, puerto 5173)
npm run build     # Chequeo de tipos (tsc) + build de producción
npm run preview   # Previsualiza el build de producción
```

### Despliegue

El proyecto está configurado para **Firebase Hosting** (`firebase.json`, `.firebaserc`). El directorio de salida es `dist/`.

```bash
npm run build
firebase deploy
```

---

## 🧰 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | React 18 + TypeScript + Vite 7 |
| **Estilos** | Tailwind CSS 3 + Chakra UI 3 + Emotion (estética *iOS dark*) |
| **Animación** | Framer Motion |
| **BD local** | Dexie 4 (IndexedDB) — `GanaderoOS_DB` |
| **Nube / Auth** | Firebase 10 (Firestore + Auth con persistencia local) |
| **Gráficos** | Recharts + ApexCharts |
| **Calendario** | FullCalendar + react-day-picker |
| **Listas grandes** | @tanstack/react-virtual (virtualización) |
| **Exportación** | jsPDF + jspdf-autotable + html2canvas (PDF); CSV propio |
| **PWA** | vite-plugin-pwa (instalable, `display: fullscreen`, service worker) |
| **Concurrencia** | Web Workers (optimización y análisis de sensibilidad) |

---

## 🏛️ Arquitectura

La app es un **conmutador de módulos**: un único punto de entrada (`App.tsx`) que renderiza uno de los seis módulos según el módulo activo. Cada módulo tiene su propio "Shell" con navegación interna independiente.

### Contextos (estado global)

- **`AuthContext`** — Autenticación Firebase (`onAuthStateChanged`). Con `browserLocalPersistence`, la sesión persiste offline.
- **`DataContext`** — El **corazón de la app** (~1.300 líneas). Mantiene las 16 colecciones en estado, expone todas las operaciones CRUD y orquesta la sincronización. Cualquier componente accede a los datos vía el hook `useData()`.

### Patrón de escritura (local‑first)

```
Acción del usuario
   └─► Escritura en Dexie (IndexedDB)  [marca _synced: false]
          └─► Encolado de sincronización
                 └─► Subida a Firestore (cuando hay conexión)  [marca _synced: true]
```

Cada cambio relevante genera automáticamente un **Evento** histórico (registro, movimiento, parto, servicio, secado…), dando **trazabilidad completa** por animal.

---

## 🔄 Sincronización offline‑first

La app **abre sin conexión** (carga desde Dexie) y **permite registrar datos sin conexión**. Todo lo cargado en el campo se sube automáticamente al recuperar señal.

### Cómo funciona

- **El flag `_synced` de Dexie es la cola persistente.** Toda escritura se guarda primero en local con `_synced: false`. Este estado sobrevive a recargas y cierres de la app.
- **Cola en memoria** (`syncQueueRef`) para drenar las operaciones cuando hay conexión, una a una, con actualización del estado de sync (`idle` / `syncing` / `offline`).
- **Listeners en tiempo real** (`onSnapshot` por colección) reconcilian Firestore → Dexie en sentido inverso (multi‑dispositivo).
- **Barrido de pendientes** (`syncPendingRecords`): re‑encola **todo** lo que quedó `_synced: false` y lo sube. Se dispara en tres momentos:
  1. Al **arrancar** la app (recupera lo pendiente de sesiones anteriores).
  2. Al **reconectar** (evento `online`).
  3. Al **volver al primer plano** (`visibilitychange`) — importante en móvil de campo.
- **Blindaje de escritura:** se descartan valores `NaN`/`Infinity` antes de escribir a Firestore (que de lo contrario rechazaría y abortaría toda la operación/batch).

> **Limitación conocida:** los **borrados realizados offline** aún no son durables (la operación de borrado vive solo en la cola en memoria). Si se borra un registro sin conexión y se recarga la app antes de reconectar, el registro puede reaparecer desde Firestore. Ver [pendientes](#-estado-y-pendientes-conocidos).

---

## 🧩 Módulos

La app se organiza en **seis módulos** intercambiables (`ModuleSwitcher`):

### 🐐 Rebaño — *núcleo de gestión*
Gestión 360° del animal, desde el nacimiento hasta la baja.
- Lista virtualizada con filtros productivos, reproductivos y por categoría zootécnica; selección múltiple para acciones por lote.
- **Perfil del animal** (Ficha, Genealogía/pedigrí, Progenie, Eventos) con acciones: parto, aborto, servicio visto, peso de monta, secado, destete, mover, dar de baja, reintegrar.
- Temporadas de monta y lotes de sementales, con **Tratamiento de Luz** (fotoestimulación) configurable.
- **Pronóstico de partos** y **Calendario de finca** (confirmados vs probables).
- **Centro de Alertas de Manejo:** Secado, Reproducción, Destete y Manejo (luz), agrupadas e inteligentes.
- Importación masiva, planes de alimentación y tratamientos por lote.

### 🥛 LactoKeeper — *control lechero*
- **Curva de lactancia del rebaño** (la "firma genética") y distribución (campana de Gauss).
- **Análisis diario** con clasificación individual (Pobre/Promedio/Sobresaliente), filtros por tendencia y fase de lactancia, y *scoring ponderado a DEL* que premia la persistencia.
- **Carga de datos** manual, por sesión, o por **OCR/IA de planillas** (foto).
- **Secado**: candidatos automáticos y gestión de En Secado / Secas.
- **Perfil de lactancia** con comparativas (vs anterior, vs rebaño).

### ⚖️ Kilos — *crecimiento y peso corporal*
- KPIs: edad a destete, **GDP (ganancia diaria de peso)**, hitos (90/180/270 días), próximos a servicio.
- Gráfico interactivo (peso real vs meta ideal), análisis por sesión (Gauss, tendencias, candidatos a destete) y perfil individual de crecimiento.
- Registro de pesos manual o por escaneo de cuaderno (OCR).

### ❤️ Salud / StockCare — *sanitario*
- **Agenda sanitaria** que genera tareas por animal combinando planes + *triggers* (por edad, fecha fija o relativa a temporada de partos).
- **Planes sanitarios** (Maternidad/Adultos) y sus actividades (Tratamiento/Control).
- **Inventario de productos** veterinarios (dosis fija o por kg, vía, **días de retiro en leche y carne**).
- Registro de eventos con **cálculo automático de dosis y costo**. Soporta **FAMACHA**.
- Análisis de costos sanitarios.

### 💲 Cents — *económico*
- Rentabilidad real por animal: ingresos (leche) − costos (sanidad) → utilidad neta y costo por litro, con ranking de más/menos rentables.

### 📈 Evolución / GanaGenius — *"Cuarto de Guerra"*
- **Motor de simulación** de dinámica de rebaño (población, reproducción, lactancia y economía) hasta 10 años, alimentable desde datos reales.
- **GanaGenius — Diagnóstico:** identifica el "eslabón más débil" (sensibilidad a preñez, prolificidad, mortalidad) en *Web Worker*.
- **GanaGenius — Optimización de linealidad:** busca la distribución de montas que minimiza la variabilidad de producción (200 simulaciones en *Web Worker*).

---

## 🗂️ Modelo de datos

Base de datos local **Dexie** `GanaderoOS_DB` con **16 tablas** (espejadas en Firestore por usuario):

`animals`, `fathers`, `parturitions`, `weighings` (leche), `bodyWeighings` (corporal), `lots`, `origins`, `breedingSeasons`, `sireLots`, `serviceRecords`, `events`, `feedingPlans`, `products`, `healthPlans`, `planActivities`, `healthEvents`.

Notas relevantes del modelo:
- **Animal:** ciclo de vida (Cabrita → Cabritona → Cabra / Cabrito → Macho de Levante → Reproductor), estado reproductivo (Vacía, En Servicio, Servida, Preñada, Post‑Parto), genealogía, composición racial, y datos de baja con `status`:
  - `Activo` · `Venta` · `Muerte` (natural / enfermedad) · `Descarte` (manejo / sacrificio).
- **Distinción clave:** la **mortalidad biológica** se calcula solo a partir de `Muerte` (ambos sexos). El **descarte/sacrificio** (`Descarte`) y la **venta** (`Venta`) **no** afectan los índices de mortalidad.
- **Colisión de IDs:** se permite el mismo ID para macho y hembra (con sufijos `-M`/`-H`).
- **Eventos** categorizados en General / Manejo / Reproductivo / Productivo.

> La versión del esquema Dexie se gestiona en `src/db/local.ts` (`DB_VERSION`). Subir esta versión dispara una migración automática de Dexie.

---

## ⚙️ Configuración de la finca

Toda la parametrización vive en un único documento por usuario (`/configuracion/{userId}`) descrito por `AppConfig` (`src/types/config.ts`) y editable en la pantalla **Configuración**. Los valores se distribuyen a toda la app vía `DataContext`, de modo que los KPIs reaccionan a ellos.

Grupos de parámetros:
- **General:** nombre de la finca, tema.
- **Económico:** símbolo de moneda, precio de leche, precio/peso de venta de cabrito, precio de descarte.
- **Reproductivo:** edad/peso de 1er servicio, días de gestación, confirmación de preñez, pre‑parto, alerta de vacías.
- **Vientres:** edad mínima de vientre.
- **Productivo (leche):** días de lactancia objetivo, alertas de secado.
- **Crecimiento (kilos):** edades/pesos de destete, metas de peso por hito y sexo, umbral de alerta, meta de GDP diaria.
- **Categorías zootécnicas:** rangos de edad por categoría.

> **Principio de diseño:** los valores por defecto (`DEFAULT_CONFIG`) replican el comportamiento histórico de la app. Liberar un valor "hardcodeado" a la config no cambia los números existentes salvo que el usuario los edite.

---

## 📁 Estructura del proyecto

```
src/
├── App.tsx                 # Conmutador de módulos
├── main.tsx                # Providers + registro PWA
├── firebaseConfig.ts       # Inicialización de Firebase
├── context/                # AuthContext, DataContext (sync + CRUD)
├── db/local.ts             # Esquema Dexie + tipos de entidades
├── types/                  # config.ts (AppConfig), navigation.ts
├── pages/                  # Páginas del módulo Rebaño + shells
│   └── modules/            # lactokeeper · kilos · salud · economy · evolucion
├── hooks/                  # ~30 hooks de KPIs y lógica de negocio
│   ├── simulationEngine.ts # Motor de simulación de rebaño
│   └── useRealtimeKpiCalculator.ts
├── workers/                # optimizationWorker, sensitivityWorker
├── components/             # UI, modales, formularios, gráficos, layout…
└── utils/                  # cálculos, exportación PDF/CSV, notificaciones
```

---

## ✨ Hoja de ruta de usabilidad (UX)

Mejoras para hacer GanaderoOS más amigable y fácil de usar, para ir abordándolas poco a poco. Marcamos `[x]` lo entregado.

**Búsqueda y navegación**
- [x] **1. Búsqueda predecible con selección múltiple** (chips): sugerencias al escribir, varios animales a la vez, removibles. *(Rebaño)*
- [x] **2. Acciones sobre la selección de búsqueda**: con varios chips, botones rápidos (Mover a lote, Pesar, etc.) sobre ese grupo.
- [x] **3. Recientes / favoritos**: animales vistos recientemente o marcados, para volver en un toque.
- [ ] **1b. Búsqueda global** desde cualquier módulo (animal, lote, evento, reproductor).

**Captura de datos en campo**
- [x] **4. Modo "sesión" rápido** de pesaje (leche/corporal unificado) y de revisión Famacha: guardan cada animal al instante con Deshacer, con sugerencias/contexto y resumen en vivo. *(Pendiente: captura por escaneo/voz.)*
- [x] **5. Deshacer** acciones (mover, dar de baja y registrar pesajes leche/corporal, individual y por lote) con toast de 15 s y atajo **Ctrl/Cmd+Z** en escritorio.
- [ ] **6. Entrada por voz** del arete y peso.

**Claridad y confianza**
- [x] **7. Estado de sincronización más visible**: el ícono de nube muestra un badge con los cambios sin subir y, al tocarlo, un panel con conexión, pendientes, última subida y botón "Sincronizar ahora".
- [ ] **8. Onboarding/tooltips** la primera vez en cada módulo (íconos de estado, acciones).
- [x] **9. Panel "para hoy"**: qué hacer hoy (partos próximos, secados, pesajes/alertas pendientes).

**Consistencia visual**
- [ ] **10. Unificar** tarjetas, chips, modales y estados vacíos entre módulos.

---

## 🩺 Estado y pendientes conocidos

La aplicación es funcional y los módulos comparten correctamente los datos vía `DataContext`. Lo siguiente es un mapa honesto de mejoras pendientes, priorizado, para planificar el trabajo.

### ✅ Resuelto recientemente
- **Sincronización offline durable** (cola persistente vía `_synced` + barrido en arranque/reconexión/foreground).
- **Blindaje de `NaN`/`Infinity`** antes de escribir a Firestore.
- **Mortalidad biológica real:** ahora se calcula desde muertes reales (`Muerte`), ambos sexos, excluyendo descarte y venta.
- **Liberación de valores hardcodeados** a `AppConfig` (precio de leche, moneda, precios/peso de venta, días de gestación unificados, meta de GDP).

### 🔴 Alto
- **Borrados offline no durables** (pueden reaparecer al reconectar tras recargar). Requiere *tombstones* o cola persistente de borrados.
- **`useKilosAnalytics` (vista histórica):** reintroduce animales de referencia/vendidos/muertos en algunos KPIs históricos.
- **`getAnimalZootecnicCategory` llamado sin `allAnimals`** en `useManagementAlerts` / `useAnimalIndicators`: no detecta maternidad por progenie → posibles alertas de destete erróneas.
- **IDs autogenerados con `Date.now()`** en altas: riesgo de colisión en importaciones masivas (debería usar `uuid`).

### 🟡 Medio
- **Parseo de fechas inconsistente** (UTC vs local vs crudo) en varios hooks: puede desfasar ±1 día en bordes de periodo (es‑VE = UTC‑4).
- **Unidad kg vs litros** ambigua en KPIs lecheros/económicos (sin conversión de densidad).
- `useGrowthAnalytics`: conteo de "por encima del promedio" inflado; flag `hasEnoughData` fijo.
- `useReportAnalytics`: `Math.max/min` sobre años sin datos → `Infinity`.
- Definición de desviación estándar distinta entre pantallas (poblacional vs muestral).
- `useHistoricalAnalysis`: `quarterlyData` / `yearlyData` sin implementar.

### 🟢 Bajo
- Doble persistencia (Dexie + cache IndexedDB de Firestore) genera `hasPendingWrites` que a veces descartan snapshots.
- KPIs duplicados entre `Dashboard.tsx` y `LactoKeeperDashboardPage.tsx`.
- *Magic numbers* operativos aún fijos (ventana de secado, hora de tratamiento de luz, márgenes de Gauss) — candidatos a liberar a `AppConfig`.
- Bundle grande (>500 kB) — candidato a *code‑splitting* por módulo.

---

<div align="center">

**GanaderoOS / LactoKeeper** — gestión ganadera caprina, hecha para el campo.

</div>

# Conector de Claude para GanaderoOS

Servidor MCP que permite a Claude (claude.ai, "conector personalizado") **leer,
cargar y cruzar** todos los datos de la finca: rebaño, partos y lactancias,
control lechero, pesos, servicios, sanidad, FAMACHA, catálogos y configuración.

- **Código:** `functions/mcp/` (`servidor.js`, `operaciones.js`, `informes.js`, `datos.js`), exportado como la Cloud Function **`mcp`**.
- **URL:** `https://us-central1-lactokeeper.cloudfunctions.net/mcp`
- **Diagnóstico (sin secretos):** `…/mcp/estado`

## Puesta en marcha (una sola vez)

1. **Generar la clave** (40+ caracteres):
   `python3 -c "import secrets;print(secrets.token_urlsafe(48))"`
2. **Guardarla en GitHub:** repo → Settings → Secrets and variables → Actions → New repository secret → nombre **`MCP_API_KEY`**.
3. **Desplegar:** se despliega solo con cada push a `main` (o Actions → "Deploy a Firebase Hosting" → Run workflow).
4. **Agregarlo en claude.ai:** Configuración → Conectores → Agregar conector personalizado → URL de arriba → en *Encabezados de solicitud*, `X-API-Key` = la clave.
   El conector no se puede editar después: para cambiar la clave, se elimina y se crea de nuevo.
5. Si en Firebase Auth hay más de una cuenta, la primera vez pídele a Claude que use `cuentas` y `elegir_cuenta` con la cuenta de la finca.

Para comprobar que la clave pegada en claude.ai es la del servidor sin mostrarla: abre `/estado` y compara `huellaClaveServidor` con `sha256(clave)[:8]`.

## Cómo funciona

- Los datos viven en Firestore, un documento por registro con `userId` (dueño). La app los baja a su base local con un listener en tiempo real, así que **lo que carga el conector aparece solo en la app** de cualquier teléfono con conexión.
- El conector trabaja con **una cuenta** (la de la finca). Nunca lee ni toca documentos de otra.
- Las cargas repiten la lógica de la app (`src/context/DataContext.tsx`): eventos de la línea de tiempo, madre a *Cabra / Post-Parto* al parir, número de servicio, regla de IDs `-H`/`-M`, acción FAMACHA, cálculo de dosis y retiros, etc.
- **Se valida todo antes de escribir.** Con un solo registro malo no se escribe nada, salvo `omitirErrores: true` (escribe los válidos y lista los rechazados).
- **`simular: true`** en cualquier escritura muestra qué cambiaría sin escribir.
- **Toda escritura se puede deshacer:** cada documento guarda su versión anterior en `mcp_cambios` y cada operación queda en `mcp_lotes` (ver `historial_cambios`). `deshacer_cambio` se detiene si alguien tocó el documento después en la app, salvo `forzar: true`.
- Los nombres de lotes, orígenes, productos, temporadas y planes no se pueden repetir (sin distinguir mayúsculas): en la base local de la app son únicos y un repetido rompería su sincronización.
- Seguridad: la clave va solo en el encabezado `X-API-Key`. El conector nunca responde 401 (claude.ai lo tomaría como OAuth o como conector caído): sin clave válida se conecta, pero ninguna herramienta lee ni escribe, y el intento queda en `mcp_rechazos`. Cada llamada queda en `mcp_auditoria`. Las colecciones `mcp_*` están cerradas para la app en `firestore.rules`.
- El conector usa el Admin SDK: no pasa por `firestore.rules`.

## Herramientas

| Lectura | |
|---|---|
| `cuentas` / `elegir_cuenta` | Cuentas de GanaderoOS y cuál usa el conector |
| `resumen_finca` | Panorama: rebaño por sexo, etapa, lote y estado reproductivo; registros y último dato de cada tipo |
| `esquema` | Colecciones, campos y valores válidos |
| `consultar` | Registros con filtros, orden y paginación |
| `ficha_animal` | Todo de un animal: padres, crías, lactancias, pesajes, servicios, sanidad, FAMACHA, eventos |
| `configuracion_finca` | Parámetros de la finca |
| `informe` | `rebano`, `produccion_leche`, `lactancias`, `reproduccion`, `crecimiento`, `sanidad`, `bajas`, `economico`, `padres` |
| `analizar` | Cruce libre: colección + datos del animal, de la lactancia y de la fecha; filtros, agrupación y métricas |
| `historial_cambios` | Cambios hechos por el conector |

| Carga | |
|---|---|
| `registrar_animales` | Altas, con evento Registro |
| `actualizar_animales` | Mover de lote, preñez, destete, bajas (venta/muerte/descarte), datos |
| `registrar_pesajes` | Leche o peso corporal, en lote |
| `registrar_partos` | Parto con crías, abortos, mortinatos, lactancia provisional |
| `registrar_servicios` | Montas vistas con el lote de monta del semental |
| `secado_lactancias` | Iniciar, secar o revertir |
| `registrar_sanidad` | Tratamientos y controles por animal o por lote, con dosis, costo y retiros |
| `registrar_famacha` | Jornadas FAMACHA |
| `registrar_eventos` | Eventos de manejo por animal o por lote |
| `guardar_registros` | Cualquier colección: catálogos (lotes, productos, planes…), temporadas y lotes de monta, correcciones |
| `borrar_registros` | Borrado con las cascadas de la app |
| `actualizar_configuracion` | Parámetros de la finca |
| `deshacer_cambio` | Revierte un cambio |

## Método de los informes

Cada informe dice su período, su muestra y su método. Los dos supuestos principales:

- **Leche:** cada pesaje es la leche de una cabra en un día de control. La leche *total* se estima entre pesajes consecutivos de la misma lactancia, con interpolación lineal; los huecos de más de 60 días no se rellenan.
- **Lactancia de un pesaje:** el último parto de la cabra antes de esa fecha. DEL = días desde ese parto.

## Prueba

```bash
cd functions && npm install && cd ..
npx firebase-tools emulators:exec --config <config con emuladores firestore y auth> \
  --only firestore,auth --project demo-ganaderoos "node tests/conector.e2e.test.mjs"
```

`firebase.json` no trae la sección `emulators`. Para correr la prueba hace falta una configuración aparte con `firestore` + `auth` en 127.0.0.1. Son 58 verificaciones, entre ellas:

- sin clave no lee ni escribe;
- simular;
- IDs `-M`;
- servicio → parto → crías;
- un error bloquea toda la carga;
- dosis por kg;
- FAMACHA;
- informes;
- aislamiento entre cuentas;
- borrar y deshacer;
- deshacer que se detiene.

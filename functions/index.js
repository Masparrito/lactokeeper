// Cloud Functions de LactoKeeper / GanaderoOS.
//
// scanNotebook: proxy SEGURO para el escaneo de cuadernos con Gemini Vision.
//
// Motivación: la app es una PWA que corre en el navegador/iPhone, así que
// cualquier clave incrustada en el cliente queda expuesta y puede usarse desde
// fuera (con costo a nuestra facturación). Esta función mantiene la clave de
// Gemini del lado servidor (Secret Manager), exige que el usuario esté
// autenticado con Firebase, y solo reenvía el texto de respuesta del modelo.
// El "prompt" (que NO es secreto) lo construye el cliente y lo envía aquí.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// La clave de Gemini vive en Google Secret Manager, nunca en el repo ni en el
// bundle del cliente. Se crea una sola vez (ver instrucciones de despliegue).
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Modelo multimodal actual, rápido y estable. Se usa 2.0-flash (sin "modo
// pensamiento") en vez de 2.5-flash porque este último es más lento y superaba
// el tiempo de la llamada, devolviendo un genérico "internal".
// gemini-1.5-flash fue retirado por Google.
const GEMINI_MODEL = "gemini-2.0-flash";

exports.scanNotebook = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: "1GiB",
    timeoutSeconds: 300,
    // Región por defecto (us-central1): coincide con getFunctions(app) en el cliente.
  },
  async (request) => {
   try {
    // 1) Autenticación obligatoria: solo usuarios logueados pueden usar la IA.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar el escaneo.");
    }

    // 2) Validación de entrada.
    const prompt = request.data && request.data.prompt;
    const imageBase64 = request.data && request.data.imageBase64;
    // Tipo real de la imagen (iPhone suele producir HEIC). Gemini acepta
    // jpeg/png/webp/heic/heif; enviar el tipo equivocado provoca un 400.
    const rawMime = (request.data && request.data.mimeType) || "image/jpeg";
    const SUPPORTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const mimeType = SUPPORTED.includes(rawMime) ? rawMime : "image/jpeg";
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError("invalid-argument", "Falta el 'prompt' de la solicitud.");
    }
    if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
      throw new HttpsError("invalid-argument", "Falta la imagen a procesar.");
    }

    // 3) Llamada a Gemini con la clave protegida.
    // Se limpian espacios, saltos de línea y comillas: al pegar la clave en
    // Secret Manager suele colarse un '\n' final que Gemini rechaza con
    // "API key not valid". Una API key no contiene espacios internos, así que
    // eliminar todo el whitespace es seguro.
    const key = (GEMINI_API_KEY.value() || "").replace(/["']/g, "").replace(/\s+/g, "");
    if (!key) {
      logger.error("GEMINI_API_KEY no está configurada en Secret Manager.");
      throw new HttpsError("failed-precondition", "El servicio de IA no está configurado.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
    };

    let response;
    // fetch abortable: si Gemini se cuelga, se convierte en un error legible
    // en vez de agotar el tiempo de la función y devolver un "internal" opaco.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 240000);
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      logger.error("Fallo de red al contactar Gemini:", err);
      const reason = err && err.name === "AbortError" ? "tiempo de espera agotado" : (err && err.message) || "error de red";
      throw new HttpsError("unavailable", `No se pudo conectar con el servicio de IA (${reason}).`);
    } finally {
      clearTimeout(abortTimer);
    }

    if (!response.ok) {
      let msg = "";
      try {
        const errData = await response.json();
        msg = (errData && errData.error && errData.error.message) || "";
      } catch (_) { /* respuesta no-JSON */ }
      logger.error(`Gemini respondió ${response.status}: ${msg}`);
      // Se propaga el motivo real (status + mensaje) para poder diagnosticar
      // en la app. No incluye la clave.
      throw new HttpsError("internal", `IA ${response.status}${msg ? `: ${msg}` : ""}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new HttpsError("internal", "Respuesta ilegible del servicio de IA.");
    }

    // Si el modelo bloqueó la respuesta (safety) o no devolvió candidatos,
    // se refleja el motivo en vez de un genérico ilegible.
    const blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    if (blockReason) {
      throw new HttpsError("internal", `IA bloqueó la respuesta (${blockReason}).`);
    }

    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (typeof text !== "string") {
      const finish = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
      throw new HttpsError("internal", `La IA no devolvió texto${finish ? ` (${finish})` : ""}. Intenta con mejor iluminación.`);
    }

    // El cliente conserva la limpieza/parseo del JSON (misma lógica de antes).
    return { text };
   } catch (err) {
    // Re-lanza los HttpsError tal cual (ya llevan un mensaje claro).
    if (err instanceof HttpsError) throw err;
    // Cualquier otro error inesperado: se registra completo y se expone el
    // mensaje real al cliente, en vez de un genérico "internal" opaco.
    logger.error("scanNotebook error inesperado:", err);
    throw new HttpsError("internal", `Fallo interno: ${(err && err.message) || String(err)}`);
   }
  }
);

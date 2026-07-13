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

const GEMINI_MODEL = "gemini-1.5-flash";

exports.scanNotebook = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 120,
    // Región por defecto (us-central1): coincide con getFunctions(app) en el cliente.
  },
  async (request) => {
    // 1) Autenticación obligatoria: solo usuarios logueados pueden usar la IA.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar el escaneo.");
    }

    // 2) Validación de entrada.
    const prompt = request.data && request.data.prompt;
    const imageBase64 = request.data && request.data.imageBase64;
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError("invalid-argument", "Falta el 'prompt' de la solicitud.");
    }
    if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
      throw new HttpsError("invalid-argument", "Falta la imagen a procesar.");
    }

    // 3) Llamada a Gemini con la clave protegida.
    const key = GEMINI_API_KEY.value();
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
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
    };

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error("Fallo de red al contactar Gemini:", err);
      throw new HttpsError("unavailable", "No se pudo conectar con el servicio de IA.");
    }

    if (!response.ok) {
      let msg = "Error del servicio de IA.";
      try {
        const errData = await response.json();
        msg = (errData && errData.error && errData.error.message) || msg;
      } catch (_) { /* respuesta no-JSON */ }
      // No se filtra la clave ni detalles internos al cliente.
      logger.error(`Gemini respondió ${response.status}: ${msg}`);
      throw new HttpsError("internal", "El servicio de IA devolvió un error. Intenta de nuevo.");
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new HttpsError("internal", "Respuesta ilegible del servicio de IA.");
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
      throw new HttpsError("internal", "La IA no devolvió datos legibles. Intenta con mejor iluminación.");
    }

    // El cliente conserva la limpieza/parseo del JSON (misma lógica de antes).
    return { text };
  }
);

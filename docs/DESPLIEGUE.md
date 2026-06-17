# 🚀 Despliegue automático (CI/CD con GitHub Actions)

Este repo incluye un pipeline (`.github/workflows/deploy.yml`) que **construye y
despliega la app a Firebase Hosting** desde los servidores de GitHub. Así el
despliegue puede dispararse de forma remota (incluido por Claude) sin exponer
tus secretos: estos viven cifrados en **GitHub Secrets** y nadie los ve.

---

## ✅ Configuración por única vez

Todo se hace en GitHub: **repo → Settings → Secrets and variables → Actions →
New repository secret**. Hay que crear **7 secretos**.

### 1) Las 6 claves de Firebase del cliente (las mismas de tus Codespaces Secrets)

| Nombre del secreto | Valor |
|---|---|
| `VITE_API_KEY` | tu apiKey |
| `VITE_AUTH_DOMAIN` | tu authDomain |
| `VITE_PROJECT_ID` | `lactokeeper` |
| `VITE_STORAGE_BUCKET` | tu storageBucket |
| `VITE_MESSAGING_SENDER_ID` | tu messagingSenderId |
| `VITE_APP_ID` | tu appId |

> Estos valores no son "secretos de verdad" (viajan en el bundle del cliente),
> pero se guardan como Secrets para mantener el mismo formato que ya usas.

### 2) La cuenta de servicio para desplegar: `FIREBASE_SERVICE_ACCOUNT`

Es una credencial que autoriza al pipeline a publicar en tu Firebase. La forma
más fácil de generarla (desde tu Codespace o máquina, una sola vez):

```bash
firebase login              # si no has iniciado sesión
firebase init hosting:github
```

Ese comando:
- Crea la cuenta de servicio con permisos de Hosting.
- **Sube automáticamente** el secreto `FIREBASE_SERVICE_ACCOUNT` a tu repo.
- Puede generar su propio workflow: si lo hace, **bórralo o ignóralo**; el que
  vale es `.github/workflows/deploy.yml` (este).

> Alternativa manual: Firebase Console → ⚙️ Configuración del proyecto →
> Cuentas de servicio → "Generar nueva clave privada" → pega el JSON completo
> como el secreto `FIREBASE_SERVICE_ACCOUNT`.

---

## ▶️ Cómo se despliega (una vez configurado)

El workflow está en modo **manual** (seguro): nada se publica sin un disparo
explícito.

- **Desde GitHub:** pestaña **Actions** → "Deploy a Firebase Hosting" →
  **Run workflow**.
- **De forma remota (Claude):** Claude puede disparar este workflow por ti
  cuando se lo pidas.
- **(Opcional) Automático:** descomenta el bloque `push: branches: [ main ]`
  en `deploy.yml` para que cada fusión a `main` despliegue sola.

> El workflow debe estar en la rama **`main`** para poder dispararse. Fusiona
> esta rama a `main` cuando estés listo.

---

## 🔒 Notas de seguridad y operación

- Claude **nunca ve** tus secretos: GitHub los inyecta solo dentro del runner.
- Primer arranque de la app tras desplegar: **con internet**, para aplicar la
  migración local de base de datos (v22→v23, aditiva y no destructiva) y
  sincronizar limpio.
- Recomendado: probar la nueva versión en un dispositivo antes de difundirla.

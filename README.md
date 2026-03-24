# KHN_botics — Panel Web React

Panel de operaciones para gestión de mensajes, preguntas y reclamos de MercadoLibre.

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variable de entorno
cp .env.example .env
# Editar .env y poner la URL de Railway del worker

# 3. Correr en desarrollo
npm run dev
# Panel disponible en http://localhost:5173
```

## Variables de entorno

```env
VITE_API_URL=https://worker-production-d575.up.railway.app
```

## Build para producción

```bash
npm run build
# Genera carpeta dist/
```

## Deploy en Railway

1. Crear nuevo servicio en el proyecto Railway
2. Conectar repo GitHub de este panel
3. Variables de entorno:
   - `VITE_API_URL=https://worker-production-d575.up.railway.app`
4. Build command: `npm run build`
5. Start command: `npx serve dist`

## Credenciales por defecto

- Usuario: `admin`
- Contraseña: `khn2026` ← **CAMBIAR INMEDIATAMENTE**

## Estructura

```
src/
  api/client.js       → axios con JWT auto-inject
  hooks/useInbox.js   → fetch + polling del inbox
  hooks/useSSE.js     → Server-Sent Events (tiempo real)
  pages/Login.jsx     → pantalla de login
  pages/Dashboard.jsx → layout principal (desktop + mobile)
  components/
    Sidebar.jsx       → cola de trabajo con filtros
    ConvPanel.jsx     → vista de conversación + acciones
    MessageCard.jsx   → tarjeta de mensaje en la cola
    ClaimTimer.jsx    → cronómetro de reclamos en vivo
```

# Asistente Financiero Personal (PWA)

Aplicación Web Progresiva (PWA) para la administración inteligente de finanzas personales, diseñada para gestionar ingresos diarios variables, deudas con vencimientos estrictos, gastos fijos y reservas virtuales en **pesos argentinos (ARS)**.

## 🛠️ Arquitectura y Tecnologías

- **Frontend**: React 19 + TypeScript + Vite
- **Estilos**: Tailwind CSS + Lucide Icons (diseño moderno, mobile-first y ergonómico)
- **Persistencia Local (Offline-First)**: Dexie.js (IndexedDB)
- **PWA**: `vite-plugin-pwa` con Workbox para funcionamiento offline y cache de assets
- **Backend / Sincronización Nube**: Supabase (PostgreSQL + RLS + Auth) — Costo $0 en Free Tier
- **Pruebas**: Vitest + React Testing Library
- **Moneda**: Pesos Argentinos (ARS) en **enteros directos**, eliminando errores de redondeo IEEE-754.

## 📂 Estructura del Proyecto

```text
App-Finanzas/
├── .gitignore               # Exclusión de secretos, dependencias y builds
├── .env.example             # Plantilla de variables de entorno (sin credenciales)
├── package.json             # Dependencias y scripts
├── tsconfig.json            # Configuración TypeScript estricta
├── vite.config.ts           # Configuración Vite + PWA + Vitest
├── tailwind.config.js       # Configuración Tailwind CSS
├── postcss.config.js        # Pipeline PostCSS
├── index.html               # Entry point HTML optimizado para móviles
└── src/
    ├── db/                  # Esquemas y cliente IndexedDB (Dexie)
    │   └── index.ts
    ├── types/               # Definiciones de tipos TypeScript del modelo financiero
    │   └── index.ts
    ├── utils/               # Utilidades de moneda y cálculos aritméticos seguros
    │   ├── money.ts
    │   └── money.test.ts
    ├── test/                # Setup de pruebas para Vitest
    │   └── setup.ts
    ├── App.tsx              # Componente principal con detector de conectividad
    ├── index.css            # Directivas Tailwind
    └── main.tsx             # Bootstrap de React
```

## 🚀 Instalación y Puesta en Marcha

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Copiar `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

4. **Ejecutar pruebas unitarias**:
   ```bash
   npm test
   ```

5. **Compilar para producción**:
   ```bash
   npm run build
   ```

## 🔒 Seguridad y Privacidad

- Sin integración automática con bancos: todos los registros son controlados por el usuario.
- Aislamiento de datos con Row Level Security (RLS) en Supabase.
- Ningún secreto ni archivo `.env` se sube al repositorio de control de versiones.
- Almacenamiento local aislado en IndexedDB con soporte para exportación completa a `.json` y `.csv`.

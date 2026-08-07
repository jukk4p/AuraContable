# AuraContable - Gestión de Facturación Premium

![AuraContable Hero](/images/real_aura_dashboard.png)

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM"/>
  <img src="https://img.shields.io/badge/NextAuth.js-000000?style=for-the-badge&logo=nextauth&logoColor=white" alt="NextAuth.js"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion"/>
</div>

**AuraContable** es una solución premium de facturación autohospedada, diseñada para ofrecer una experiencia visual espectacular y un rendimiento excepcional. Basada en **Next.js 15** y **PostgreSQL**, ofrece a autónomos y pymes el control total sobre sus datos financieros con una estética de vanguardia.

---

## 🏛️ Arquitectura

- **Autorización en el servidor**: cada Server Action resuelve la identidad con `requireUserId()` a partir de la sesión y filtra por `userId`. El cliente nunca envía a quién pertenecen los datos.
- **Server Actions con Zod**: las mutaciones se validan con esquemas Zod. Los importes de una factura se derivan de sus líneas en el servidor, no se aceptan del formulario.
- **ActionResult**: respuestas uniformes (`{ success, data | error }`) para un manejo de errores predecible.
- **Transacciones**: crear o editar una factura escribe cabecera, líneas e impuestos como una sola unidad.
- **Cálculo fiscal**: `src/lib/fiscal.ts` deriva trimestre, vencimientos e IVA de los datos reales y de la fecha actual.

### ⚡ Rendimiento
- **Dynamic Imports**: carga diferida de los gráficos de Recharts mediante `next/dynamic`.
- **Next/Image**: optimización automática de imágenes, WebP y lazy loading.
- **Índices**: las tablas están indexadas por `user_id`, que es la columna por la que filtra todo.

### 🔍 SEO
- **Metadata**: OpenGraph, Twitter Cards y robots.
- **Structured Data**: Schema.org (JSON-LD).
- **Sitemap & Robots**: generación automática.

### 🧪 Calidad
- **TypeScript en modo estricto** y **ESLint**, ambos exigidos durante el build (`next.config.ts` no los silencia).

---

## ⚠️ Estado actual

Lo que hay en el menú funciona, con estas salvedades:

- **Presupuestos** es solo interfaz: no hay tabla ni acciones detrás. Está fuera del menú lateral.
- **La pestaña de Pagos en Ajustes** no permite introducir las claves de Stripe/PayPal todavía; hay que escribirlas en la base de datos.
- **El Modelo 303** calcula sobre datos reales, pero es orientativo: revísalo con tu gestor antes de presentar nada.
- **No hay tests automatizados.** `@playwright/test` está en las dependencias pero no existe ninguna suite.

---

## ✨ Características Destacadas

### 🎨 Interfaz Premium
- **Glassmorphism**: Un sistema de diseño moderno con efectos de transparencia y desenfoque (blur) de alta gama.
- **Animaciones Fluidas**: Transiciones de página y entradas de datos orquestadas con **Framer Motion**.
- **Tipografía Outfit**: Una estética limpia y profesional optimizada para la legibilidad.

### 📊 Análisis Avanzado
- **Dashboard en Tiempo Real**: Visualización de Ingresos vs Gastos con gráficos dinámicos optimizados.
- **Gestión de Clientes**: Directorio sincronizado con mutaciones atomizadas y feedback visual instantáneo via `toast`.
- **Configuración de Empresa**: Panel avanzado para gestionar perfiles, monedas y pasarelas de pago (Stripe/PayPal).

---

## ⚙️ Cómo Empezar

### 1. Prerrequisitos
- Node.js (v20+)
- PostgreSQL (Neon.tech o local)

### 2. Configuración

Crea un `.env` con:

```bash
DATABASE_URL=postgres://...
NEXTAUTH_SECRET=...        # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:9002
```

```bash
npm install
npx drizzle-kit push       # solo la primera vez, sobre una base vacía
npm run dev
```

Si ya tenías datos de una versión anterior, aplica la migración en su lugar:

```bash
psql "$DATABASE_URL" -f drizzle/001_indexes_and_vat.sql
```

### 3. Usuario inicial

```bash
SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts
```

### 4. Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

---

**AuraContable** - Transforma tu facturación en una experiencia espectacular.
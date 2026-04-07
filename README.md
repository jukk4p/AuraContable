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

## 💎 Estándar de Calidad: Diamante

Tras un exhaustivo proceso de modernización, la plataforma alcanza un nivel de excelencia técnica superior:

### 🏛️ Arquitectura Robusta
- **Server Actions con Zod**: Todas las mutaciones de datos están validadas estrictamente con esquemas Zod, garantizando integridad total.
- **ActionResult Pattern**: Estandarización de respuestas del servidor para un manejo de errores predecible y una UX fluida.
- **Optimización de Caché**: Revalidación selectiva de etiquetas y rutas mediante `revalidatePath` y `revalidateTag`.

### ⚡ Rendimiento Optimizado
- **Dynamic Imports**: Carga diferida de componentes pesados (como gráficos de Recharts) mediante `next/dynamic` con `ssr: false`.
- **Next/Image**: Optimización automática de activos visuales, formatos WebP y Lazy Loading para un LCP sobresaliente.
- **Métricas Vitales**: Enfoque en Core Web Vitals para asegurar una interactividad casi instantánea.

### 🔍 SEO Táctico
- **Metadata Dinámica**: Configuración avanzada de OpenGraph, Twitter Cards y robots para máxima visibilidad.
- **Structured Data**: Implementación de Schema.org (JSON-LD) para que AuraContable destaque en los resultados de búsqueda.
- **Sitemap & Robots**: Generación automática de rutas para rastreadores de motores de búsqueda.

### 🧪 Validación y Testing
- **Playwright Suite**: Infraestructura de pruebas E2E lista para validar flujos críticos (Login, Creación de Factura, Generación de PDF).
- **TypeScript Strict Mode**: Tipado exhaustivo para prevenir errores en tiempo de ejecución.

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
```bash
npm install
npx drizzle-kit push
npm run dev
```

### 3. Testing
```bash
npx playwright test
```

---

**AuraContable** - Transforma tu facturación en una experiencia espectacular.
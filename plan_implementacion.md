# Plan de Implementación: AuraContable - Excelencia Web

Este plan detalla la hoja de ruta para elevar **AuraContable** a un estándar de calidad "diamante", optimizando cada capa desde la arquitectura hasta la experiencia de usuario final.

## 🎯 Diagnóstico Actual
- **Estado**: Evolución (Migración de Firebase a PostgreSQL completada en gran medida).
- **Stack**: Next.js 15 (App Router), Drizzle ORM, Tailwind CSS, Framed Motion.
- **Fortalezas**: UI moderna con Framer Motion, stack robusto y tipografía premium (Outfit).
- **Oportunidades**: Sincronización de versiones de Next.js (README vs package.json), limpieza de archivos temporales (`tmp_old_*`), implementación de SEO táctico y testing E2E.

---

## 🏗️ Hitos Técnicos (Hoja de Ruta)

### FASE 1: Diagnóstico y Hoja de Ruta [COMPLETANDO]
- **Skills**: `@00-andruia-consultant`, `@brainstorming`
- [x] Análisis del workspace y dependencias.
- [ ] Definición de la propuesta de valor: "Facturación Premium Autohospedada con Control Total".
- [ ] Creación de este `plan_implementacion.md`.

### FASE 2: Arquitectura y Andamiaje
- **Skills**: `@app-builder`, `@api-design-principles`
- [ ] Auditoría de configuración: ESLint, Prettier y TS (garantizar modo estricto).
- [ ] Estandarización de Server Actions: Asegurar manejo de errores y validación con Zod en `src/actions`.
- [ ] Limpieza de deuda técnica: Eliminar `tmp_old_*.tsx` una vez verificado que su lógica está migrada.

### FASE 3: Diseño Visual y UX Premium
- **Skills**: `@ui-ux-pro-max`, `@web-design-guidelines`
- [ ] Refinamiento de Glassmorphism: Asegurar consistencia en todos los layouts internos del dashboard.
- [ ] Micro-animaciones: Añadir feedbacks visuales en transiciones de facturas y guardado de datos.
- [ ] Accesibilidad: Auditar contraste y etiquetas ARIA en componentes de Shadcn.

### FASE 4: Desarrollo y Buenas Prácticas
- **Skills**: `@react-best-practices`, `@nodejs-best-practices`, `@clean-code`
- [ ] Refactorización selectiva: Revisar componentes complejos en `src/components` para mejorar modularidad.
- [ ] Documentación JSDoc: Añadir documentación a funciones críticas de la API y lógica de negocio.

### FASE 5: Optimización de Rendimiento
- **Skills**: `@web-performance-optimization`
- [ ] Auditoría Core Web Vitals: Medir LCP en la landing y el Dashboard.
- [ ] Implementación de `next/dynamic` para componentes pesados (gráficos de Recharts).
- [ ] Optimización de imágenes: Asegurar uso de formatos modernos y responsive.

### FASE 6: SEO y Visibilidad Estratégica
- **Skills**: `@seo-audit`, `@schema-markup`, `@seo-meta-optimizer`
- [ ] Configuración de `Metadata` dinámica en rutas de facturas/clientes.
- [ ] Implementación de Schema.org (SoftwareApplication) para mejorar la presencia en buscadores.
- [ ] Generación de sitemap.xml y robots.txt.

### FASE 7: Testing y Validación Final
- **Skills**: `@playwright-skill`, `@lint-and-validate`, `@concise-planning`
- [ ] Setup de Playwright: Pruebas funcionales de Login -> Crear Factura -> Generar PDF.
- [ ] Validación final de tipos y linting.
- [ ] Informe de calidad final en el README actualizado.

---

## 🧪 Plan de Verificación

### Verificación Automatizada
- **Linting**: `npm run lint` para asegurar calidad de código.
- **Typecheck**: `npm run typecheck` para consistencia de TS.
- **Testing**: `npx playwright test` (a implementar en Fase 7).

### Verificación Manual
1. **Responsive Test**: Probar el dashboard en breakpoints móviles y tablets.
2. **UX Audit**: Verificar que el "WOW factor" se mantenga en el flujo de creación de gastos.
3. **SEO Check**: Usar [Rich Results Test](https://search.google.com/test/rich-results) para validar el Schema Markup.

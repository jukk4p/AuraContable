# AuraContable

![AuraContable](public/images/real_aura_dashboard.png)

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM"/>
  <img src="https://img.shields.io/badge/NextAuth.js-000000?style=for-the-badge&logo=nextauth&logoColor=white" alt="NextAuth.js"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
</div>

Facturación autohospedada para autónomos y pymes, sobre **Next.js 15** y **PostgreSQL**.
Emite facturas, registra gastos, cobra por Stripe o PayPal y prepara el borrador
del Modelo 303 a partir de tus datos.

---

## ⚙️ Puesta en marcha

**Requisitos:** Node.js 20+ y una base PostgreSQL (Neon, Supabase o local).

**1. Variables de entorno.** Crea un `.env` en la raíz:

```bash
DATABASE_URL=postgres://usuario:clave@host/base
NEXTAUTH_SECRET=...                    # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:9002
# Opcional: conexiones máximas por instancia (por defecto 5)
DATABASE_POOL_MAX=5
```

**2. Esquema.** Sobre una base vacía:

```bash
npm install
npx drizzle-kit push
```

Sobre una base que ya tiene datos, aplica la migración en su lugar:

```bash
# Con psql
psql "$DATABASE_URL" -f drizzle/001_indexes_and_vat.sql

# Sin psql
npx tsx scripts/run-migration.ts drizzle/001_indexes_and_vat.sql
```

Es idempotente y va dentro de una transacción. Aborta con un mensaje claro si
encuentra números de factura repetidos, porque el índice único no los admite.

**3. Usuario inicial.**

```bash
SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts
```

No sobrescribe un usuario que ya exista salvo que añadas `SEED_ADMIN_FORCE=true`.

**4. Arrancar.**

```bash
npm run dev      # http://localhost:9002
```

---

## 🏛️ Arquitectura

**La identidad se resuelve en el servidor.** Un Server Action es un endpoint
HTTP público, así que nada de lo que llegue por parámetro prueba quién eres.
Todas las acciones empiezan por `requireUserId()` y filtran por propietario:

```ts
const userId = await requireUserId();          // desde la sesión, no del cliente
await db.delete(clients)
  .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
```

**Los importes se derivan, no se aceptan.** El total de una factura se calcula
en el servidor a partir de sus líneas e impuestos; el formulario solo muestra
una previsualización. Cabecera, líneas e impuestos se escriben en una
transacción.

**Los secretos no salen del servidor.** `getCompanyProfile` nunca devuelve las
claves de Stripe ni de PayPal al navegador: expone indicadores de si están
configuradas.

**Los pagos se verifican contra la pasarela.** Stripe por firma de webhook;
PayPal consultando la orden y comprobando que estado, importe y moneda coinciden
con la factura.

**El cálculo fiscal sale de los datos.** `src/lib/fiscal.ts` deriva el trimestre,
los vencimientos y el IVA de la fecha actual y de los impuestos reales de cada
factura, sin tipos fijos ni fechas escritas a mano.

### Estructura

```
src/
├── actions/      Server Actions. Todas validan sesión y validan con Zod.
├── app/          Rutas del App Router.
├── db/           Esquema de Drizzle y cliente de PostgreSQL.
└── lib/
    ├── fiscal.ts        Periodos, vencimientos y liquidación de IVA
    ├── session.ts       requireUserId()
    └── action-result.ts Forma uniforme de las respuestas
drizzle/          Migraciones SQL escritas a mano
scripts/          Alta del usuario inicial y ejecución de migraciones
```

---

## ⚠️ Estado actual

Lo que está en el menú lateral funciona contra la base de datos. Con estas
salvedades:

| Área | Situación |
|---|---|
| **Presupuestos** | Solo interfaz, sin tabla ni acciones. Retirado del menú. |
| **Claves de pago** | Se introducen a mano en `company_profiles`; Ajustes solo indica si están puestas. |
| **Modelo 303** | Calcula sobre datos reales, pero es orientativo. Revísalo con tu gestor. |
| **Formulario de contacto** | Abre el cliente de correo con `mailto:`; no hay backend de envío. |
| **Tests** | No hay suite automatizada. `@playwright/test` está instalado pero sin usar. |

El Modelo 303 clasifica los impuestos de cada factura por su nombre: lo que
contiene «IVA» va a la liquidación, «IRPF» y los porcentajes negativos se
excluyen como retención, y el resto aparece aparte como otros tributos. Cada
gasto guarda su propio tipo de IVA (`vat_rate`), así que la cuota deducible es
la real y no una estimación.

---

## 🧪 Comprobaciones

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run build        # exige que los dos anteriores pasen
```

`next.config.ts` no silencia TypeScript ni ESLint: si algo falla, el build falla.

---

## 📦 Despliegue

Hay un `Dockerfile` multi-etapa que produce la salida `standalone` de Next.js, y
un `apphosting.yaml` para Firebase App Hosting.

El build necesita `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` como
argumentos. **Aplica siempre la migración antes de desplegar el código**: el
build nuevo lee columnas que la migración crea.

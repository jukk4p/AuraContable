# InvoiceFlow - Gestión de Facturación Moderna

![InvoiceFlow App](https://placehold.co/1200x675.png/21070%50/FFFFFF?text=InvoiceFlow)
<div align="center" data-ai-hint="app dashboard">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
</div>

**InvoiceFlow** es una aplicación web moderna y completa diseñada para simplificar la gestión de facturas, clientes y gastos para autónomos y pequeñas empresas. Construida con un stack tecnológico de vanguardia, ofrece una experiencia de usuario fluida, rápida y estéticamente agradable.

## ✨ Características Principales

- **Panel de Control Intuitivo**: Visualiza métricas clave de tu negocio de un vistazo, como ingresos totales, facturas pagadas, pendientes y vencidas, junto con gráficos interactivos.
- **Gestión Completa de Facturas (CRUD)**: Crea, edita, visualiza y elimina facturas con facilidad. Genera números de factura secuenciales automáticamente.
- **Administración de Clientes**: Mantén tu base de datos de clientes organizada. Añade, edita y elimina clientes con todos sus datos fiscales y de contacto.
- **Seguimiento de Gastos**: Registra y categoriza tus gastos para tener un control total sobre las finanzas de tu negocio.
- **Generación de PDF**: Descarga facturas individuales en formato PDF con un diseño profesional, listas para ser enviadas a tus clientes.
- **Exportación en Bloque**: Exporta múltiples facturas filtradas en un único archivo ZIP y exporta tu lista de clientes a un archivo CSV compatible con Excel y Google Sheets.
- **Autenticación Segura**: Sistema de registro e inicio de sesión basado en email y contraseña, con verificación de correo electrónico.
- **Soporte Multi-idioma**: La interfaz está disponible en Español, Inglés, Francés, Italiano y Catalán, adaptándose a las preferencias del usuario.
- **Personalización de Apariencia**: Elige entre temas claro, oscuro o el predeterminado del sistema para una mayor comodidad visual.
- **Diseño Responsivo**: Experiencia de usuario optimizada para escritorio, tablet y dispositivos móviles.

## 🚀 Pila Tecnológica

- **Framework Frontend**: [Next.js](https://nextjs.org/) (con App Router)
- **Librería UI**: [React](https://react.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Backend y Base de Datos**: [Firebase](https://firebase.google.com/) (Authentication y Firestore)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [ShadCN/ui](https://ui.shadcn.com/)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Generación de PDF**: [jsPDF](https://github.com/parallax/jsPDF) y `jspdf-autotable`
- **Generación de ZIP**: [JSZip](https://stuk.github.io/jszip/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Manejo de Formularios**: [React Hook Form](https://react-hook-form.com/) con [Zod](https://zod.dev/) para validación.

## ⚙️ Cómo Empezar

Para ejecutar este proyecto en tu entorno local, sigue estos pasos:

### Prerrequisitos

- Node.js (v18 o superior)
- `pnpm` como gestor de paquetes (recomendado)

### 1. Configuración del Proyecto Firebase

Antes de iniciar la aplicación, necesitas un proyecto de Firebase para manejar la autenticación y la base de datos.

1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto.
2.  Dentro de tu proyecto, ve a **Authentication** -> **Sign-in method** y habilita el proveedor **Email/Password**.
3.  Ve a **Firestore Database** y crea una base de datos en modo de producción.
4.  En la configuración de tu proyecto (`Project settings`), crea una nueva aplicación web (`Web App`).
5.  Copia las credenciales de configuración de Firebase.

### 2. Configuración del Entorno Local

1.  Clona este repositorio:
    ```bash
    git clone https://github.com/tu-usuario/invoiceflow.git
    cd invoiceflow
    ```

2.  Crea un archivo `.env` en la raíz del proyecto y añade las credenciales de Firebase que copiaste:
    ```bash
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...
    ```

3.  Instala las dependencias:
    ```bash
    pnpm install
    ```

4.  Ejecuta la aplicación en modo de desarrollo:
    ```bash
    pnpm dev
    ```

5.  Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación en funcionamiento.

### 3. Reglas de Seguridad de Firestore

Para asegurar que los usuarios solo puedan acceder a sus propios datos, aplica las siguientes reglas de seguridad en tu base de datos de Firestore:

```json
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Los usuarios solo pueden leer/escribir sus propios datos
    match /clients/{clientId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    match /invoices/{invoiceId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    match /expenses/{expenseId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    match /companyProfiles/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /notifications/{notificationId} {
        allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Los usuarios pueden crear su propio documento de perfil
    match /users/{userId} {
        allow read, create: if request.auth.uid == userId;
    }
  }
}
```
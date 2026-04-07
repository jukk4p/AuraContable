import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { LocaleProvider } from '@/lib/i18n/locale-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import SchemaOrg from '@/components/seo/schema-org';


export const metadata: Metadata = {
  title: {
    default: 'AuraContable | Gestión de Facturas Premium',
    template: '%s | AuraContable'
  },
  description: 'AuraContable es la plataforma de facturación premium autohospedada que te da control total sobre tus finanzas, clientes y gastos con una interfaz de vanguardia.',
  keywords: ['facturación', 'contabilidad', 'pymes', 'autónomos', 'saas', 'gestión financiera'],
  authors: [{ name: 'AuraContable Team' }],
  creator: 'AuraContable',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://auracontable.app',
    title: 'AuraContable | Facturación Inteligente y Elegante',
    description: 'Gestiona tu negocio con la plataforma de facturación más avanzada y visualmente impactante.',
    siteName: 'AuraContable',
    images: [{
      url: '/images/real_aura_dashboard.png',
      width: 1200,
      height: 630,
      alt: 'AuraContable Dashboard Preview',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuraContable | Facturación Premium',
    description: 'Control total sobre tus finanzas con una interfaz glassmorphism espectacular.',
    images: ['/images/real_aura_dashboard.png'],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SchemaOrg />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LocaleProvider>
              {children}
              <Toaster />
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

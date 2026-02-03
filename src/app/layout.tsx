'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import UserMenu from "@/components/UserMenu";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import OfflineIndicator from '@/components/OfflineIndicator'; // Added import

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="es">
      <head>
        <title>Pocholo's Chicken - Sistema POS</title>
        <meta name="description" content="Sistema de Punto de Venta para Pocholo's Chicken" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFF8E7',
                color: '#5A3E2B',
                border: '2px solid #F2C94C',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#F2C94C',
                  secondary: '#FFF8E7',
                },
              },
              error: {
                iconTheme: {
                  primary: '#C8102E',
                  secondary: '#FFF8E7',
                },
                style: {
                  border: '2px solid #C8102E',
                },
              },
            }}
          />
          <OfflineIndicator />
          {isLoginPage ? (
            // Login page sin sidebar
            <main className="min-h-screen">
              {children}
            </main>
          ) : (
            // Páginas normales con sidebar y UserMenu
            <div className="flex min-h-screen">
              <div className="print:hidden">
                <Sidebar />
              </div>
              <div className="flex-1 ml-64 print:ml-0 bg-slate-200 min-h-screen print:bg-white">
                {/* Header con UserMenu */}
                <div className="fixed top-0 right-0 left-64 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 print:hidden">
                  <div className="flex justify-end p-4">
                    <UserMenu />
                  </div>
                </div>
                {/* Main content con padding-top para el header */}
                <main className="pt-20 print:pt-0">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}

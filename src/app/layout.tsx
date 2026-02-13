'use client';

import { useState } from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import UserMenu from "@/components/UserMenu";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import OfflineIndicator from '@/components/OfflineIndicator';
import { Menu } from 'lucide-react';
import Image from 'next/image';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="es">
      <head>
        <title>Pocholo's Chicken - Sistema POS</title>
        <meta name="description" content="Sistema de Punto de Venta para Pocholo's Chicken" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
            <div id="app-root" className="flex min-h-screen">
              {/* Sidebar */}
              <div className="print:hidden">
                <Sidebar
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />
              </div>

              {/* Main content area */}
              <div className="flex-1 lg:ml-64 print:ml-0 bg-slate-200 min-h-screen print:bg-white">
                {/* Mobile Header - solo visible en móvil */}
                <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-pocholo-red shadow-lg print:hidden">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    {/* Hamburger button */}
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      <Menu size={26} />
                    </button>

                    {/* Logo - centered */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-10 h-10">
                        <Image
                          src="/images/logo-pocholos-icon.png"
                          alt="Pocholo's"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-white font-bold text-base">Pocholo's POS</span>
                    </div>

                    {/* UserMenu mobile */}
                    <UserMenu />
                  </div>
                </div>

                {/* Desktop Header con UserMenu */}
                <div className="hidden lg:block fixed top-0 right-0 left-64 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 print:hidden">
                  <div className="flex justify-end p-4">
                    <UserMenu />
                  </div>
                </div>

                {/* Main content con padding-top para ambos headers */}
                <main className="pt-16 lg:pt-20 print:pt-0">
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


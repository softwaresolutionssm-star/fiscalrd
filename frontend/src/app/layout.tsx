import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { BranchProvider } from '@/contexts/branch-context';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FiscalRD - Sistema de Facturación',
  description: 'Sistema de facturación electrónica - Ley 32-23',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        <AuthProvider>
          <BranchProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
            <Toaster richColors position="top-right" />
          </BranchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import { redirect } from 'next/navigation';

// El registro público está deshabilitado.
// Los negocios se crean desde el panel de administración.
export default function RegisterPage() {
  redirect('/login');
}

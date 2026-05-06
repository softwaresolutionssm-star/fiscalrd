'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Mail, Shield } from 'lucide-react';

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  employee: { label: 'Empleado', color: 'bg-blue-100 text-blue-700' },
  cashier: { label: 'Cajero', color: 'bg-amber-100 text-amber-700' },
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  owner: { label: 'Propietario', color: 'bg-green-100 text-green-700' },
  accountant: { label: 'Contador', color: 'bg-teal-100 text-teal-700' },
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700' },
};

export default function EmployeeProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(r => setMe(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="text-center py-20 text-slate-400">
        No se pudo cargar la información del perfil.
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[me.role] ?? { label: me.role, color: 'bg-slate-100 text-slate-600' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-slate-500 text-sm mt-1">Información de tu cuenta</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm max-w-lg p-8">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {me.firstName?.[0]}{me.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {me.firstName} {me.lastName}
            </h2>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <User size={13} />
              Nombre Completo
            </label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
              {me.firstName} {me.lastName}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <Mail size={13} />
              Correo Electrónico
            </label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
              {me.email}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <Shield size={13} />
              Rol
            </label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-6 text-center">
          Para modificar tu información, contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}

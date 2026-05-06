'use client';

import { useEffect, useState, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Tenant { id: string; businessName: string; rnc: string; email?: string; phone?: string; address?: string; isActive: boolean; logoUrl?: string; }

// ─── Vista Owner: Mi Empresa ──────────────────────────────────────────────────

function MyCompanyView() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ businessName: '', rnc: '', email: '', phone: '', address: '' });
  const [editing, setEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const r = await api.get('/tenants/me');
      const t = r.data.data ?? r.data;
      setTenant(t);
      setForm({ businessName: t.businessName, rnc: t.rnc, email: t.email ?? '', phone: t.phone ?? '', address: t.address ?? '' });
      setLogoPreview(t.logoUrl ?? null);
    } catch { toast.error('Error al cargar datos de la empresa'); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/tenants/me', form);
      toast.success('Datos actualizados');
      setEditing(false);
      load();
    } catch { toast.error('Error al guardar'); }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error('El logo debe pesar menos de 1MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Solo se aceptan imágenes'); return; }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await api.patch('/tenants/me', { logoUrl: base64 });
        setLogoPreview(base64);
        toast.success('Logo actualizado — ya aparece en facturas y sidebar');
        // Forzar recarga del sidebar
        window.dispatchEvent(new Event('tenant-logo-updated'));
      } catch { toast.error('Error al subir logo'); }
      finally { setUploadingLogo(false); }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    try {
      await api.patch('/tenants/me', { logoUrl: null });
      setLogoPreview(null);
      toast.success('Logo eliminado');
      window.dispatchEvent(new Event('tenant-logo-updated'));
    } catch { toast.error('Error al eliminar logo'); }
  };

  if (!tenant) return <div className="text-center py-16 text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Logo del Negocio</h2>
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              : <div className="text-center"><Upload size={24} className="mx-auto text-slate-300 mb-1" /><p className="text-xs text-slate-400">Sin logo</p></div>
            }
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-3">El logo aparecerá en tus <strong>facturas</strong> y en el <strong>menú lateral</strong>.</p>
            <p className="text-xs text-slate-400 mb-3">PNG, JPG o SVG · Máximo 1MB · Recomendado: fondo transparente (PNG)</p>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingLogo}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Upload size={15} /> {uploadingLogo ? 'Subiendo...' : logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoPreview && (
                <button onClick={removeLogo} className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50">
                  <X size={15} /> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Datos del negocio */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Datos de la Empresa</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
              <Pencil size={14} /> Editar
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nombre del negocio *</label>
                <input required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">RNC *</label>
                <input required value={form.rnc} maxLength={9}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" readOnly />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Dirección</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Guardar cambios</button>
              <button type="button" onClick={() => setEditing(false)} className="border border-slate-200 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Nombre', value: tenant.businessName },
              { label: 'RNC', value: tenant.rnc },
              { label: 'Email', value: tenant.email || '—' },
              { label: 'Teléfono', value: tenant.phone || '—' },
              { label: 'Dirección', value: tenant.address || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista Super Admin: listado de todas las empresas ─────────────────────────

function SuperAdminView() {
  const confirm = useConfirm();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ businessName: '', rnc: '', email: '', phone: '', address: '' });

  const load = () => api.get('/tenants').then(r => setTenants(r.data.data ?? [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editing ? await api.patch(`/tenants/${editing.id}`, form) : await api.post('/tenants', form);
      toast.success(editing ? 'Empresa actualizada' : 'Empresa creada');
      setShowForm(false); setEditing(null); setForm({ businessName: '', rnc: '', email: '', phone: '', address: '' }); load();
    } catch { toast.error('Error al guardar empresa'); }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar empresa', message: '¿Estás seguro de que deseas eliminar esta empresa?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/tenants/${id}`); toast.success('Empresa eliminada'); load(); } catch { toast.error('Error'); }
  };

  return (
    <>
      <PageHeader title="Empresas" description="Gestión de empresas (multi-tenancy)"
        action={<button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Empresa</button>} />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar' : 'Nueva'} Empresa</h2>
            <div className="space-y-3">
              <input required placeholder="Nombre *" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input required placeholder="RNC (9 dígitos) *" value={form.rnc} onChange={e => setForm({...form, rnc: e.target.value})} maxLength={9} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Empresa','RNC','Email','Teléfono','Estado',''].map(h => <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {tenants.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay empresas registradas</td></tr>}
            {tenants.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{t.businessName}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{t.rnc}</td>
                <td className="px-4 py-3 text-slate-500">{t.email || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{t.phone || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.isActive ? 'Activa' : 'Inactiva'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditing(t); setForm({ businessName: t.businessName, rnc: t.rnc, email: t.email ?? '', phone: t.phone ?? '', address: t.address ?? '' }); setShowForm(true); }} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TenantsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  if (isSuperAdmin) return <div><SuperAdminView /></div>;

  return (
    <div>
      <PageHeader title="Mi Empresa" description="Información y logo de tu negocio" />
      <MyCompanyView />
    </div>
  );
}

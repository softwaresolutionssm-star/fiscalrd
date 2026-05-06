'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wrench, Car, CheckCircle, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { BranchBadge } from '@/components/ui/branch-badge';

interface ServiceItem { productName: string; quantity: number; unitPrice: number; total: number; }
interface Order {
  id: string; orderNumber: string; customerName: string; customerPhone?: string;
  vehicleInfo?: { make?: string; model?: string; year?: string; plate?: string; mileage?: string };
  problemDescription: string; internalNotes?: string;
  status: string; assignedEmployeeName?: string;
  items: ServiceItem[]; laborCost: number; totalParts: number; totalAmount: number;
  estimatedDelivery?: string; deliveredAt?: string; saleId?: string; createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  PENDING:       { label: 'Pendiente',       color: 'bg-slate-100 text-slate-600',  next: 'IN_PROGRESS',    nextLabel: 'Iniciar' },
  IN_PROGRESS:   { label: 'En Proceso',      color: 'bg-blue-100 text-blue-700',    next: 'COMPLETED',      nextLabel: 'Completar' },
  WAITING_PARTS: { label: 'Esperando Piezas',color: 'bg-amber-100 text-amber-700',  next: 'IN_PROGRESS',    nextLabel: 'Reanudar' },
  COMPLETED:     { label: 'Completado',      color: 'bg-green-100 text-green-700',  next: 'DELIVERED',      nextLabel: 'Entregar' },
  DELIVERED:     { label: 'Entregado',       color: 'bg-purple-100 text-purple-700' },
  CANCELLED:     { label: 'Cancelado',       color: 'bg-red-100 text-red-600' },
};

const EMPTY_FORM = {
  customerName: '', customerPhone: '',
  vehicleMake: '', vehicleModel: '', vehicleYear: '', vehiclePlate: '', vehicleMileage: '',
  problemDescription: '', internalNotes: '', assignedEmployeeName: '', laborCost: '0',
  estimatedDelivery: '',
};

export default function ServiceOrdersPage() {
  const confirm = useConfirm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [itemForm, setItemForm] = useState({ productName: '', quantity: '1', unitPrice: '' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = () => api.get('/service-orders').then(r => setOrders(r.data.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const addItem = () => {
    if (!itemForm.productName || !itemForm.unitPrice) return;
    const qty = parseFloat(itemForm.quantity) || 1;
    const price = parseFloat(itemForm.unitPrice) || 0;
    setItems(prev => [...prev, { productName: itemForm.productName, quantity: qty, unitPrice: price, total: Math.round(qty * price * 100) / 100 }]);
    setItemForm({ productName: '', quantity: '1', unitPrice: '' });
  };

  const openNew = () => {
    setEditing(null); setForm(EMPTY_FORM); setItems([]); setShowForm(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    setForm({
      customerName: o.customerName, customerPhone: o.customerPhone ?? '',
      vehicleMake: o.vehicleInfo?.make ?? '', vehicleModel: o.vehicleInfo?.model ?? '',
      vehicleYear: o.vehicleInfo?.year ?? '', vehiclePlate: o.vehicleInfo?.plate ?? '',
      vehicleMileage: o.vehicleInfo?.mileage ?? '',
      problemDescription: o.problemDescription, internalNotes: o.internalNotes ?? '',
      assignedEmployeeName: o.assignedEmployeeName ?? '',
      laborCost: String(o.laborCost ?? 0),
      estimatedDelivery: o.estimatedDelivery ? String(o.estimatedDelivery).split('T')[0] : '',
    });
    setItems(o.items ?? []);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      vehicleInfo: (form.vehicleMake || form.vehiclePlate) ? {
        make: form.vehicleMake, model: form.vehicleModel, year: form.vehicleYear,
        plate: form.vehiclePlate, mileage: form.vehicleMileage,
      } : undefined,
      problemDescription: form.problemDescription,
      internalNotes: form.internalNotes || undefined,
      assignedEmployeeName: form.assignedEmployeeName || undefined,
      laborCost: parseFloat(form.laborCost) || 0,
      estimatedDelivery: form.estimatedDelivery || undefined,
      items,
    };
    try {
      editing
        ? await api.patch(`/service-orders/${editing.id}`, payload)
        : await api.post('/service-orders', payload);
      toast.success(editing ? 'Orden actualizada' : 'Orden creada');
      setShowForm(false); setEditing(null); load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
  };

  const advanceStatus = async (o: Order) => {
    const cfg = STATUS_CONFIG[o.status];
    if (!cfg?.next) return;
    try {
      await api.patch(`/service-orders/${o.id}`, { status: cfg.next });
      toast.success(`Orden ${cfg.nextLabel?.toLowerCase()}da`);
      load();
    } catch { toast.error('Error al actualizar estado'); }
  };

  const setWaiting = async (o: Order) => {
    await api.patch(`/service-orders/${o.id}`, { status: 'WAITING_PARTS' });
    toast.success('Marcada como esperando piezas'); load();
  };

  const cancel = async (o: Order) => {
    if (!await confirm({ title: 'Cancelar orden', message: '¿Cancelar esta orden de servicio?', confirmText: 'Cancelar orden' })) return;
    await api.patch(`/service-orders/${o.id}`, { status: 'CANCELLED' });
    toast.success('Orden cancelada'); load();
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar', message: '¿Eliminar esta orden?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/service-orders/${id}`); toast.success('Eliminada'); load(); }
    catch { toast.error('Error'); }
  };

  const toggleExpand = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter);

  const totalParts = items.reduce((s, i) => s + i.total, 0);
  const totalEstimate = totalParts + (parseFloat(form.laborCost) || 0);

  return (
    <div>
      <PageHeader title="Órdenes de Servicio" description="Talleres, gomerías, consultorios"
        action={<button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Orden</button>}
      />

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Orden' : 'Nueva Orden de Servicio'}</h2>
              <BranchBadge />
            </div>
            <div className="space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cliente *</label>
                  <input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Nombre del cliente" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                  <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="809-000-0000" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Vehículo / equipo */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Car size={12} /> Vehículo / Equipo (opcional)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[['vehicleMake','Marca'],['vehicleModel','Modelo'],['vehicleYear','Año'],['vehiclePlate','Placa'],['vehicleMileage','Kilometraje'],['assignedEmployeeName','Técnico asignado']].map(([key, label]) => (
                    <input key={key} placeholder={label} value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm" />
                  ))}
                </div>
              </div>

              {/* Problema */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción del problema *</label>
                <textarea required rows={2} value={form.problemDescription}
                  onChange={e => setForm({ ...form, problemDescription: e.target.value })}
                  placeholder="¿Qué tiene el vehículo/equipo?" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notas internas</label>
                <textarea rows={1} value={form.internalNotes}
                  onChange={e => setForm({ ...form, internalNotes: e.target.value })}
                  placeholder="Diagnóstico, observaciones..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* Entrega estimada + mano de obra */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Entrega estimada</label>
                  <input type="date" value={form.estimatedDelivery} onChange={e => setForm({ ...form, estimatedDelivery: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mano de obra (RD$)</label>
                  <input type="number" step="0.01" min="0" value={form.laborCost}
                    onChange={e => setForm({ ...form, laborCost: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Piezas / repuestos */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Package size={12} /> Piezas y Repuestos</p>
                <div className="flex gap-2 mb-2">
                  <input placeholder="Nombre de la pieza *" value={itemForm.productName}
                    onChange={e => setItemForm({ ...itemForm, productName: e.target.value })}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" min="1" step="1" placeholder="Cant." value={itemForm.quantity}
                    onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                    className="w-20 border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" placeholder="Precio" value={itemForm.unitPrice}
                    onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    className="w-28 border rounded-lg px-3 py-2 text-sm" />
                  <button type="button" onClick={addItem} className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-800">+ Agregar</button>
                </div>
                {items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden text-sm">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-0 bg-slate-50">
                        <span className="flex-1">{it.productName}</span>
                        <span className="text-slate-500 w-16 text-center">{it.quantity}</span>
                        <span className="w-24 text-right">{formatCurrency(it.unitPrice)}</span>
                        <span className="w-24 text-right font-medium">{formatCurrency(it.total)}</span>
                        <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                          className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-sm space-y-0.5 text-right">
                  <div className="text-slate-500">Piezas: {formatCurrency(totalParts)}</div>
                  <div className="text-slate-500">Mano de obra: {formatCurrency(parseFloat(form.laborCost) || 0)}</div>
                  <div className="font-bold text-slate-800 text-base">Total: {formatCurrency(totalEstimate)}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s]?.label}
            {s !== 'ALL' && ` (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
            <Wrench size={32} className="mx-auto mb-3 opacity-30" />
            <p>No hay órdenes de servicio</p>
          </div>
        )}
        {filtered.map(o => {
          const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, color: 'bg-slate-100 text-slate-600' };
          const isOpen = expanded.has(o.id);
          return (
            <div key={o.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-slate-400">{o.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="font-semibold text-slate-800">{o.customerName}
                    {o.customerPhone && <span className="text-slate-400 font-normal text-sm ml-2">{o.customerPhone}</span>}
                  </p>
                  {o.vehicleInfo?.plate && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      <Car size={11} className="inline mr-1" />
                      {[o.vehicleInfo.make, o.vehicleInfo.model, o.vehicleInfo.year].filter(Boolean).join(' ')}
                      {o.vehicleInfo.plate && ` · Placa: ${o.vehicleInfo.plate}`}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">{o.problemDescription}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(o.totalAmount)}</p>
                  {o.assignedEmployeeName && <p className="text-xs text-slate-400">{o.assignedEmployeeName}</p>}
                  {o.estimatedDelivery && (
                    <p className="text-xs text-slate-400">Entrega: {new Date(o.estimatedDelivery).toLocaleDateString('es-DO')}</p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {cfg.next && (
                    <button onClick={() => advanceStatus(o)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                      <CheckCircle size={12} /> {cfg.nextLabel}
                    </button>
                  )}
                  {o.status === 'IN_PROGRESS' && (
                    <button onClick={() => setWaiting(o)} className="text-xs text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50">Esperando piezas</button>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(o)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded"><Pencil size={13} /></button>
                    {!['DELIVERED','CANCELLED'].includes(o.status) && (
                      <button onClick={() => cancel(o)} className="text-slate-400 hover:text-red-500 p-1.5 rounded text-xs">✕</button>
                    )}
                    <button onClick={() => remove(o.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded"><Trash2 size={13} /></button>
                    <button onClick={() => toggleExpand(o.id)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded">
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 text-sm space-y-3">
                  {o.internalNotes && (
                    <div><span className="text-xs font-semibold text-slate-500">NOTAS INTERNAS: </span><span className="text-slate-700">{o.internalNotes}</span></div>
                  )}
                  {o.items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">PIEZAS Y REPUESTOS</p>
                      <div className="space-y-1">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-slate-600">
                            <span>{it.productName} × {it.quantity}</span>
                            <span>{formatCurrency(it.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span>Piezas: {formatCurrency(o.totalParts)} · Mano de obra: {formatCurrency(o.laborCost)}</span>
                    <span className="font-bold text-slate-800">Total: {formatCurrency(o.totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

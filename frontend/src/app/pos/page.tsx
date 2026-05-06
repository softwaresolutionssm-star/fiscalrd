'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  Search, Plus, Minus, Trash2, X, UserCheck, CreditCard,
  Banknote, ArrowLeftRight, CheckCircle2, ShoppingCart, Landmark, AlertTriangle, Clock, Printer,
  Barcode, DollarSign, Receipt,
} from 'lucide-react';
import { printThermalReceipt, type ThermalReceiptData } from '@/components/thermal-receipt';
import {
  useOfflineSync,
  savePendingSale,
  consumeNcf,
  ncfPoolCount,
  getCachedProducts,
  setCachedProducts,
  getCachedCustomers,
  setCachedCustomers,
  getNcfPool,
  saveNcfPool,
} from '@/hooks/useOfflinePOS';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  itbisRate: number;
  stock?: number;
}

interface Customer {
  id: string;
  name: string;
  rncCedula: string;
  creditLimit?: number;
}

interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  itbisRate: number;
  quantity: number;
  discountPct: number; // 0–100
}

interface SaleResult {
  id: string;
  saleNumber?: string;
  ncfNumber?: string;
  total: number;
  subtotal: number;
  itbisTotal: number;
  customerName?: string;
  customerRnc?: string;
  ncfType: string;
  createdAt?: string;
  paymentMethod?: string;
  dueDate?: string;
}

interface TenantInfo {
  businessName: string;
  rnc: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

interface StockLevel {
  productId: string;
  currentStock: number;
}

interface ArEntry {
  id: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  balance: number;
  status: string;
  ncfNumber?: string;
  saleId?: string;
}

// E33 (Nota de Débito) y E34 (Nota de Crédito) se excluyen del POS.
// Los ajustes y devoluciones deben ser autorizados por el Admin desde el dashboard.
const NCF_TYPES = [
  { value: 'E32', label: 'E32 - Consumidor Final' },
  { value: 'E31', label: 'E31 - Crédito Fiscal' },
  { value: 'E45', label: 'E45 - Gubernamental' },
  { value: 'E44', label: 'E44 - Régimen Especial' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
  { value: 'credit', label: 'A Crédito', icon: Clock },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcCart(items: CartItem[]) {
  return items.reduce(
    (acc, item) => {
      const base = item.unitPrice * item.quantity;
      const discount = base * (item.discountPct / 100);
      const sub = base - discount;
      const itbis = sub * (item.itbisRate / 100);
      return {
        subtotal: acc.subtotal + sub,
        itbis: acc.itbis + itbis,
        total: acc.total + sub + itbis,
        discount: acc.discount + discount,
      };
    },
    { subtotal: 0, itbis: 0, total: 0, discount: 0 }
  );
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({
  sale,
  cartItems,
  tenant,
  onClose,
}: {
  sale: SaleResult;
  cartItems: CartItem[];
  tenant: TenantInfo | null;
  onClose: () => void;
}) {
  const isCredit = sale.paymentMethod === 'credit';

  const thermalData: ThermalReceiptData = {
    businessName: tenant?.businessName ?? 'Mi Negocio',
    rnc: tenant?.rnc ?? '',
    address: tenant?.address,
    phone: tenant?.phone,
    logoUrl: tenant?.logoUrl,
    ncfNumber: sale.ncfNumber,
    ncfType: sale.ncfType,
    saleDate: sale.createdAt ?? new Date().toISOString(),
    customerName: sale.customerName,
    customerRnc: sale.customerRnc,
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate,
    subtotal: sale.subtotal,
    itbisTotal: sale.itbisTotal,
    total: sale.total,
    items: cartItems.map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPct: i.discountPct || undefined,
      itbisRate: i.itbisRate,
      total: (() => {
        const base = i.unitPrice * i.quantity;
        const disc = base * (i.discountPct / 100);
        const sub = base - disc;
        return sub + sub * (i.itbisRate / 100);
      })(),
    })),
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isCredit ? 'bg-amber-100' : 'bg-green-100'}`}>
            <CheckCircle2 size={32} className={isCredit ? 'text-amber-600' : 'text-green-600'} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {isCredit ? 'Fiado Registrado' : 'Venta Completada'}
          </h2>
          {sale.saleNumber && (
            <p className="text-sm text-slate-500 mt-1">#{sale.saleNumber}</p>
          )}
        </div>

        <div className="space-y-2 text-sm border rounded-xl p-4 bg-slate-50 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Cliente:</span>
            <span className="font-medium">{sale.customerName ?? 'Consumidor Final'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">NCF:</span>
            <span className="font-medium font-mono">{sale.ncfNumber ?? sale.ncfType}</span>
          </div>
          {isCredit && sale.dueDate && (
            <div className="flex justify-between">
              <span className="text-slate-500">Vence:</span>
              <span className="font-medium text-amber-600">{new Date(sale.dueDate + 'T00:00:00').toLocaleDateString('es-DO')}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-semibold text-slate-700">Total:</span>
            <span className={`font-bold text-base ${isCredit ? 'text-amber-700' : 'text-green-700'}`}>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {isCredit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            Esta venta fue registrada en Cuentas por Cobrar. Puedes ver el saldo pendiente desde el módulo de Cuentas por Cobrar.
          </p>
        )}

        <button
          onClick={() => printThermalReceipt(thermalData)}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors mb-3"
        >
          <Printer size={16} /> Imprimir Recibo
        </button>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base transition-colors"
        >
          Nueva Venta
        </button>
      </div>
    </div>
  );
}

// ─── Fiado Payment Modal ────────────────────────────────────────────────────────

function FiadoModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<ArEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState('cash');

  useEffect(() => {
    api.get(`/accounts-receivable/customer/${customer.id}`)
      .then(r => {
        const data = r.data.data ?? r.data;
        const records: ArEntry[] = data.records ?? data;
        setEntries(records.filter((e: ArEntry) => e.status !== 'paid' && e.status !== 'cancelled'));
      })
      .catch(() => toast.error('Error cargando cuentas por cobrar'))
      .finally(() => setLoading(false));
  }, [customer.id]);

  const registerPayment = async (entry: ArEntry) => {
    const amount = parseFloat(payAmounts[entry.id] || String(entry.balance));
    if (!amount || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (amount > Number(entry.balance)) { toast.error('El monto supera el saldo'); return; }
    setPayingId(entry.id);
    try {
      await api.post(`/accounts-receivable/${entry.id}/payments`, {
        paymentDate: new Date().toISOString().split('T')[0],
        amount,
        method: payMethod,
      });
      toast.success(`Pago de ${formatCurrency(amount)} registrado`);
      setEntries(prev => prev.map(e => {
        if (e.id !== entry.id) return e;
        const newBalance = Number(e.balance) - amount;
        return { ...e, balance: newBalance, status: newBalance <= 0 ? 'paid' : 'partial' };
      }).filter(e => e.status !== 'paid'));
      setPayAmounts(prev => ({ ...prev, [entry.id]: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al registrar pago');
    } finally {
      setPayingId(null);
    }
  };

  const totalBalance = entries.reduce((s, e) => s + Number(e.balance), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={18} className="text-amber-500" />
              Cobrar Fiado
            </h2>
            <p className="text-sm text-slate-500">{customer.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Payment method */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Método:</span>
          {(['cash', 'card', 'transfer'] as const).map(m => (
            <button key={m} onClick={() => setPayMethod(m)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${payMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transferencia'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-green-400" />
              <p>Este cliente no tiene saldo pendiente</p>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    {entry.ncfNumber && <p className="text-xs font-mono text-slate-500">{entry.ncfNumber}</p>}
                    <p className="text-xs text-slate-400">Vence: {new Date(entry.dueDate + 'T00:00:00').toLocaleDateString('es-DO')}</p>
                    <p className={`text-xs font-medium mt-0.5 ${entry.status === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>
                      {entry.status === 'overdue' ? 'VENCIDA' : entry.status === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total: {formatCurrency(entry.amount)}</p>
                    <p className="text-base font-bold text-red-600">{formatCurrency(entry.balance)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0.01" max={entry.balance}
                    value={payAmounts[entry.id] ?? ''}
                    onChange={e => setPayAmounts(prev => ({ ...prev, [entry.id]: e.target.value }))}
                    placeholder={String(entry.balance)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={() => registerPayment(entry)}
                    disabled={payingId === entry.id}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <DollarSign size={14} />
                    {payingId === entry.id ? '...' : 'Cobrar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalBalance > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">Saldo total pendiente:</span>
            <span className="text-lg font-bold text-red-600">{formatCurrency(totalBalance)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main POS Page ─────────────────────────────────────────────────────────────

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ncfType, setNcfType] = useState('E32');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [cartSnapshot, setCartSnapshot] = useState<CartItem[]>([]);
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);
  const [lastCartSnapshot, setLastCartSnapshot] = useState<CartItem[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [cajaOpen, setCajaOpen] = useState<boolean | null>(null); // null = loading
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [showFiadoModal, setShowFiadoModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [ncfPool, setNcfPool] = useState<Record<string, number>>({});

  // ── Devolución modal ─────────────────────────────────────────────────────
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSearchLoading, setReturnSearchLoading] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      api.get('/products').then(r => {
        const data = r.data.data ?? [];
        setProducts(data);
        setCachedProducts(data);
      }).catch(() => {
        setProducts(getCachedProducts());
      });
      api.get('/customers').then(r => {
        const data = r.data.data ?? [];
        setCustomers(data);
        setCachedCustomers(data);
      }).catch(() => {
        setCustomers(getCachedCustomers());
      });
    } else {
      setProducts(getCachedProducts());
      setCustomers(getCachedCustomers());
    }

    api.get('/cash-register/current')
      .then(r => { const s = r.data?.data !== undefined ? r.data.data : r.data; setCajaOpen(s !== null && !!s); })
      .catch(() => setCajaOpen(navigator.onLine ? false : true)); // offline: assume open
    api.get('/tenants/me')
      .then(r => { const t = r.data.data ?? r.data; setTenantInfo({ businessName: t.businessName, rnc: t.rnc, address: t.address, phone: t.phone, logoUrl: t.logoUrl }); })
      .catch(() => {});
    api.get('/inventory/stock')
      .then(r => { const data = r.data.data ?? r.data; setStockLevels(data); })
      .catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close customer dropdown on outside click — MUST be before any early return
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Offline sync: auto-sync pending sales when internet returns
  useOfflineSync((count) => {
    toast.success(`${count} venta(s) sincronizada(s)`);
    setPendingCount(0);
  });

  // ── Bloquear POS si caja no está abierta (early returns AFTER all hooks) ───
  if (cajaOpen === null) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  if (cajaOpen === false) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Landmark size={36} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Caja no está abierta</h2>
          <p className="text-sm text-slate-500 mb-6">
            Debes abrir la caja antes de registrar ventas. Declara el fondo inicial en efectivo para empezar el turno.
          </p>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">Sin apertura de caja no se pueden emitir comprobantes fiscales.</p>
          </div>
          <Link href="/pos/caja"
            className="inline-flex items-center gap-2 bg-green-600 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-green-700 transition-colors">
            <Landmark size={16} /> Abrir Caja
          </Link>
        </div>
      </div>
    );
  }

  // ── Cart actions ──────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.productId === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          itbisRate: product.itbisRate,
          quantity: 1,
          discountPct: 0,
        },
      ];
    });
  };

  const changeQty = (idx: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const totals = calcCart(cart);

  const change =
    paymentMethod === 'cash' && amountReceived
      ? parseFloat(amountReceived) - totals.total
      : null;

  // ── Customer search ───────────────────────────────────────────────────────

  const filteredCustomers = customerSearch
    ? customers.filter(
        c =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.rncCedula?.includes(customerSearch)
      )
    : customers.slice(0, 6);

  const selectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c);
    setCustomerSearch(c ? c.name : '');
    setShowCustomerDropdown(false);
    // Auto NCF: credit fiscal for businesses, consumidor final otherwise
    if (paymentMethod !== 'credit') {
      setNcfType(c ? 'E31' : 'E32');
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    if (method === 'credit') {
      setNcfType('E31'); // credit sales must use Crédito Fiscal
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCobrar = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Las ventas a crédito requieren un cliente registrado');
      return;
    }
    if (paymentMethod === 'cash' && amountReceived && parseFloat(amountReceived) < totals.total) {
      toast.error('El monto recibido es menor al total');
      return;
    }

    setLoading(true);
    const snap = [...cart];

    if (!navigator.onLine) {
      // ── Offline path ──────────────────────────────────────────────────────
      const ncf = consumeNcf(ncfType);
      if (!ncf) {
        toast.error('Sin NCFs disponibles offline. Conecta internet y recarga para pre-cargar comprobantes.');
        setLoading(false);
        return;
      }
      try {
        const offlineSale = {
          localId: crypto.randomUUID(),
          ncfNumber: ncf,
          ncfType,
          saleDate: new Date().toISOString(),
          customerName: selectedCustomer?.name ?? 'Consumidor Final',
          customerRncCedula: selectedCustomer?.rncCedula ?? null,
          customerId: selectedCustomer?.id ?? null,
          subtotal: totals.subtotal,
          itbisTotal: totals.itbis,
          total: totals.total,
          paymentMethod,
          items: cart.map(item => {
            const base = item.unitPrice * item.quantity;
            const discount = base * (item.discountPct / 100);
            const sub = base - discount;
            const itbisAmount = Math.round(sub * (item.itbisRate / 100) * 100) / 100;
            return {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              itbisRate: item.itbisRate,
              subtotal: Math.round(sub * 100) / 100,
              itbisAmount,
              total: Math.round((sub + itbisAmount) * 100) / 100,
            };
          }),
        };
        await savePendingSale(offlineSale);
        setPendingCount(p => p + 1);
        setNcfPool(prev => ({ ...prev, [ncfType]: ncfPoolCount(ncfType) }));
        toast.success(`Venta guardada offline (${ncf}). Se sincronizará cuando vuelva internet.`);

        // Show receipt and clear cart
        setCartSnapshot(snap);
        setSaleResult({
          id: offlineSale.localId,
          ncfNumber: ncf,
          total: totals.total,
          subtotal: totals.subtotal,
          itbisTotal: totals.itbis,
          customerName: selectedCustomer?.name,
          customerRnc: selectedCustomer?.rncCedula,
          ncfType,
          createdAt: offlineSale.saleDate,
          paymentMethod,
          dueDate: paymentMethod === 'credit' ? dueDate : undefined,
        });
      } catch {
        toast.error('Error guardando venta offline');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────────
    try {
      const res = await api.post('/sales', {
        customerId: selectedCustomer?.id ?? undefined,
        customerName: selectedCustomer?.name ?? 'Consumidor Final',
        customerRncCedula: selectedCustomer?.rncCedula ?? undefined,
        ncfType,
        paymentMethod,
        dueDate: paymentMethod === 'credit' ? dueDate : undefined,
        saleDate: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itbisRate: item.itbisRate,
          discountPct: item.discountPct || 0,
        })),
      });

      const draft = res.data.data ?? res.data;

      // Auto-emit: assign NCF and set status to ISSUED
      const issued = await api.patch(`/sales/${draft.id}/issue`);
      const data = issued.data.data ?? issued.data;

      setCartSnapshot(snap);
      setSaleResult({
        id: data.id,
        saleNumber: data.saleNumber,
        ncfNumber: data.ncfNumber,
        total: totals.total,
        subtotal: totals.subtotal,
        itbisTotal: totals.itbis,
        customerName: selectedCustomer?.name,
        customerRnc: selectedCustomer?.rncCedula,
        ncfType,
        createdAt: data.createdAt,
        paymentMethod,
        dueDate: paymentMethod === 'credit' ? dueDate : undefined,
      });

      // Replenish NCF pool if running low
      if (ncfPoolCount(ncfType) < 3) {
        prefetchNcfs(ncfType);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const searchReturnSale = async () => {
    if (!returnSearch.trim()) return;
    setReturnSearchLoading(true);
    try {
      const r = await api.get('/sales', { params: { search: returnSearch.trim(), limit: 5 } });
      const list = r.data.data ?? r.data ?? [];
      const found = list.find((s: any) =>
        s.ncfNumber?.toLowerCase().includes(returnSearch.toLowerCase()) ||
        s.id === returnSearch
      ) ?? list[0] ?? null;
      if (!found) { toast.error('No se encontró la factura'); return; }
      if (found.status !== 'ISSUED') { toast.error('Solo se pueden devolver facturas emitidas'); return; }
      setReturnSale(found);
      const init: Record<string, number> = {};
      (found.items ?? []).forEach((i: any) => { init[i.id] = 0; });
      setReturnQtys(init);
    } catch { toast.error('Error al buscar la factura'); }
    finally { setReturnSearchLoading(false); }
  };

  const handleReturn = async () => {
    if (!returnSale) return;
    const items = (returnSale.items ?? [])
      .filter((i: any) => (returnQtys[i.id] ?? 0) > 0)
      .map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: Number(i.unitPrice),
        quantity: returnQtys[i.id],
        itbisRate: Number(i.itbisRate),
      }));
    if (items.length === 0) { toast.error('Selecciona al menos un producto a devolver'); return; }
    setReturnLoading(true);
    try {
      await api.post(`/sales/${returnSale.id}/return`, { items });
      toast.success('Devolución procesada — Nota de Crédito E34 emitida');
      setShowReturnModal(false);
      setReturnSale(null);
      setReturnSearch('');
      setReturnQtys({});
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al procesar devolución');
    } finally { setReturnLoading(false); }
  };

  const handleNewSale = () => {
    if (saleResult) { setLastSale(saleResult); setLastCartSnapshot(cartSnapshot); }
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setNcfType('E32');
    setPaymentMethod('cash');
    setAmountReceived('');
    setSaleResult(null);
    setProductSearch('');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // ── Barcode lookup ────────────────────────────────────────────────────────

  const handleBarcodeSubmit = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await api.get(`/products/barcode/${code.trim()}`);
      const product: Product = res.data.data ?? res.data;
      addToCart(product);
      setBarcodeInput('');
      barcodeRef.current?.focus();
    } catch {
      toast.error(`Producto no encontrado: ${code}`);
      setBarcodeInput('');
    }
  };

  // ── Prefetch NCFs for offline use ─────────────────────────────────────────

  const prefetchNcfs = async (type: string) => {
    if (!navigator.onLine) return;
    try {
      const res = await api.post('/ncf-sequences/reserve-block', { ncfType: type, count: 10 });
      const ncfs: string[] = res.data?.data ?? res.data;
      const pool = getNcfPool();
      pool[type] = [...(pool[type] ?? []), ...ncfs];
      saveNcfPool(pool);
      setNcfPool(prev => ({ ...prev, [type]: pool[type].length }));
    } catch { /* silently ignore — user still has any existing pool */ }
  };

  // ── Stock helper ──────────────────────────────────────────────────────────

  const getStock = (productId: string) => {
    const level = stockLevels.find(s => s.productId === productId);
    return level?.currentStock ?? null;
  };

  // ── Filtered products ─────────────────────────────────────────────────────

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  // ─────────────────────────────────────────────────────────────────────────

  const creditLimitExceeded = paymentMethod === 'credit' && !!selectedCustomer && (() => {
    const custData = customers.find(c => c.id === selectedCustomer.id) as any;
    const limit = Number(custData?.creditLimit ?? 0);
    return limit > 0 && totals.total > limit;
  })();

  return (
    <>
      {saleResult && <ReceiptModal sale={saleResult} cartItems={cartSnapshot} tenant={tenantInfo} onClose={handleNewSale} />}
      {showFiadoModal && selectedCustomer && (
        <FiadoModal customer={selectedCustomer} onClose={() => setShowFiadoModal(false)} />
      )}

      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <span>⚠️ Sin internet — Modo offline activo</span>
          {pendingCount > 0 && <span className="bg-amber-700 rounded-full px-2 py-0.5 text-xs">{pendingCount} pendiente(s)</span>}
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-medium">
          ✓ Internet restaurado — sincronizando {pendingCount} venta(s)...
        </div>
      )}

      <div className="flex h-full" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── LEFT PANEL (60%) ──────────────────────────────────────────── */}
        <div className="flex flex-col w-[60%] h-full bg-slate-100 overflow-hidden border-r border-slate-200">

          {/* Product search + barcode */}
          <div className="p-4 bg-white border-b border-slate-200 flex-shrink-0 space-y-2">
            {lastSale && (
              <button
                onClick={() => printThermalReceipt({
                  businessName: tenantInfo?.businessName ?? 'Mi Negocio',
                  rnc: tenantInfo?.rnc ?? '',
                  address: tenantInfo?.address,
                  phone: tenantInfo?.phone,
                  logoUrl: tenantInfo?.logoUrl,
                  ncfNumber: lastSale.ncfNumber,
                  ncfType: lastSale.ncfType,
                  saleDate: lastSale.createdAt ?? new Date().toISOString(),
                  customerName: lastSale.customerName,
                  customerRnc: lastSale.customerRnc,
                  paymentMethod: lastSale.paymentMethod,
                  dueDate: lastSale.dueDate,
                  subtotal: lastSale.subtotal,
                  itbisTotal: lastSale.itbisTotal,
                  total: lastSale.total,
                  items: lastCartSnapshot.map(i => ({
                    productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice,
                    discountPct: i.discountPct || undefined, itbisRate: i.itbisRate,
                    total: (() => { const b = i.unitPrice * i.quantity; const d = b * (i.discountPct / 100); const s = b - d; return s + s * (i.itbisRate / 100); })(),
                  })),
                })}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-500 text-xs py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Printer size={13} /> Reimprimir último recibo ({lastSale.ncfNumber ?? lastSale.id?.slice(-6)})
              </button>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="relative w-44">
                <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Código de barras"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleBarcodeSubmit(barcodeInput); }}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart size={40} className="mx-auto mb-2 opacity-40" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredProducts.map(product => {
                  const stock = getStock(product.id);
                  const outOfStock = stock !== null && stock <= 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => { if (!outOfStock) addToCart(product); else toast.error(`Sin stock: ${product.name}`); }}
                      className={`rounded-xl border p-4 text-left transition-all relative ${
                        outOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md active:scale-95 cursor-pointer'
                      }`}
                    >
                      {outOfStock && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">SIN STOCK</span>
                      )}
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                        <ShoppingCart size={18} className="text-blue-500" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-blue-600 font-bold text-base">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.itbisRate > 0 && (
                          <p className="text-xs text-slate-400">ITBIS {product.itbisRate}%</p>
                        )}
                        {stock !== null && (
                          <p className={`text-xs font-medium ${stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                            Stock: {stock}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200" style={{ maxHeight: '40%' }}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <ShoppingCart size={16} />
                Carrito
                {cart.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Vaciar
                </button>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
              {cart.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">
                  Toca un producto para agregarlo
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {cart.map((item, idx) => {
                      const base = item.unitPrice * item.quantity;
                      const discount = base * (item.discountPct / 100);
                      const lineTotal = (base - discount) * (1 + item.itbisRate / 100);
                      return (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700 max-w-[180px]">
                            <span className="truncate block">{item.productName}</span>
                            <span className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} c/u</span>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => changeQty(idx, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-8 text-center font-semibold text-base">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => changeQty(idx, 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number" min="0" max="100" step="1"
                                value={item.discountPct || ''}
                                onChange={e => {
                                  const updated = [...cart];
                                  updated[idx] = { ...updated[idx], discountPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) };
                                  setCart(updated);
                                }}
                                className="w-12 text-center text-xs border border-slate-200 rounded px-1 py-1 bg-white/80"
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (40%) — dark theme ───────────────────────────── */}
        <div className="flex flex-col w-[40%] h-full bg-slate-800 text-white overflow-y-auto">
          <div className="flex-1 p-5 space-y-5">

            {/* Customer selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Cliente
              </label>
              <div className="relative" ref={customerRef}>
                <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente o dejar vacío..."
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer(null);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {(customerSearch || selectedCustomer) && (
                  <button
                    onClick={() => selectCustomer(null)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}

                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl z-20 overflow-hidden">
                    <button
                      onClick={() => selectCustomer(null)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-600 text-slate-300 border-b border-slate-600"
                    >
                      Consumidor Final
                    </button>
                    {filteredCustomers.length === 0 ? (
                      <p className="px-4 py-2.5 text-xs text-slate-400">Sin resultados</p>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-600 border-b border-slate-600/50 last:border-0"
                        >
                          <span className="text-white">{c.name}</span>
                          {c.rncCedula && (
                            <span className="text-xs text-slate-400 ml-2">{c.rncCedula}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="flex items-center justify-between mt-1.5 pl-1">
                  <p className="text-xs text-blue-400">
                    Cliente seleccionado: {selectedCustomer.name}
                  </p>
                  <button
                    onClick={() => setShowFiadoModal(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-900/30 hover:bg-amber-900/50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Receipt size={12} />
                    Cobrar Fiado
                  </button>
                </div>
              )}
              {!selectedCustomer && (
                <p className="text-xs text-slate-500 mt-1.5 pl-1">Consumidor Final</p>
              )}
            </div>

            {/* NCF Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Tipo de NCF
              </label>
              <div className="grid grid-cols-3 gap-2">
                {NCF_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setNcfType(t.value)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                      ncfType === t.value
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-700/60 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Descuento</span>
                  <span className="text-red-400">-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-300">
                <span>ITBIS</span>
                <span>{formatCurrency(totals.itbis)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white border-t border-slate-600 pt-2 mt-1">
                <span>Total</span>
                <span className="text-green-400">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handlePaymentMethodChange(value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all border ${
                      paymentMethod === value
                        ? value === 'credit'
                          ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-900/40'
                          : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit — due date + warning */}
            {paymentMethod === 'credit' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-600 rounded-xl p-3">
                  <Clock size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Esta venta se registrará como cuenta por cobrar. Se emitirá con comprobante E31 (Crédito Fiscal).
                    {!selectedCustomer && <span className="block text-red-400 font-medium mt-1">⚠ Debes seleccionar un cliente.</span>}
                  </p>
                </div>
                {paymentMethod === 'credit' && selectedCustomer && (() => {
                  const custData = customers.find(c => c.id === selectedCustomer.id) as any;
                  const limit = Number(custData?.creditLimit ?? 0);
                  if (limit > 0 && totals.total > limit) {
                    return (
                      <div className="flex items-start gap-2 bg-red-900/30 border border-red-600 rounded-xl p-3 mt-2">
                        <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">
                          Este cliente tiene un límite de crédito de {formatCurrency(limit)}. El total de esta venta ({formatCurrency(totals.total)}) lo excede.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Cash — amount received + change */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Monto Recibido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-lg font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {change !== null && (
                  <div className={`rounded-xl p-4 flex justify-between items-center ${
                    change >= 0 ? 'bg-green-800/40 border border-green-700' : 'bg-red-800/40 border border-red-700'
                  }`}>
                    <span className="text-sm font-semibold text-slate-200">Cambio:</span>
                    <span className={`text-xl font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Math.max(0, change))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COBRAR button */}
          <div className="p-5 border-t border-slate-700 flex-shrink-0 space-y-2">
            <button
              onClick={() => { setShowReturnModal(true); setReturnSale(null); setReturnSearch(''); }}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftRight size={15} /> Procesar Devolución
            </button>
            <button
              onClick={handleCobrar}
              disabled={loading || cart.length === 0 || (paymentMethod === 'credit' && !selectedCustomer) || creditLimitExceeded}
              className={`w-full py-4 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-2xl transition-all active:scale-95 shadow-lg ${
                paymentMethod === 'credit'
                  ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-900/30'
                  : 'bg-green-500 hover:bg-green-400 shadow-green-900/30'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : paymentMethod === 'credit' ? (
                `FIADO ${cart.length > 0 ? formatCurrency(totals.total) : ''}`
              ) : (
                `COBRAR ${cart.length > 0 ? formatCurrency(totals.total) : ''}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Return Modal ─────────────────────────────────────────────────── */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <ArrowLeftRight size={20} /> Procesar Devolución
              </h2>
              <button onClick={() => setShowReturnModal(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input
                  placeholder="Número NCF o ID de la factura..."
                  value={returnSearch}
                  onChange={e => setReturnSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchReturnSale()}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button onClick={searchReturnSale} disabled={returnSearchLoading}
                  className="bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                  {returnSearchLoading ? '...' : 'Buscar'}
                </button>
              </div>
              {returnSale && (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Factura:</span><span className="font-semibold">{returnSale.ncfNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Cliente:</span><span>{returnSale.customerName ?? 'Consumidor Final'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total original:</span><span className="font-bold">{formatCurrency(returnSale.total)}</span></div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Selecciona cantidades a devolver</p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {(returnSale.items ?? []).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} · Cant: {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => setReturnQtys(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-sm">−</button>
                          <span className="w-8 text-center font-semibold text-sm">{returnQtys[item.id] ?? 0}</span>
                          <button onClick={() => setReturnQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, (q[item.id] ?? 0) + 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-sm">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {Object.values(returnQtys).some(q => q > 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between">
                      <span className="text-sm text-amber-700 font-medium">Total a devolver:</span>
                      <span className="font-bold text-amber-700">
                        {formatCurrency((returnSale.items ?? []).reduce((acc: number, i: any) => {
                          const qty = returnQtys[i.id] ?? 0;
                          return acc + qty * Number(i.unitPrice) * (1 + Number(i.itbisRate) / 100);
                        }, 0))}
                      </span>
                    </div>
                  )}
                  <button onClick={handleReturn}
                    disabled={returnLoading || !Object.values(returnQtys).some(q => q > 0)}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors">
                    {returnLoading ? 'Procesando...' : 'Confirmar Devolución — Emitir E34'}
                  </button>
                </div>
              )}
              {!returnSale && (
                <p className="text-center text-sm text-slate-400 py-4">Escribe el NCF de la factura y presiona Buscar</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

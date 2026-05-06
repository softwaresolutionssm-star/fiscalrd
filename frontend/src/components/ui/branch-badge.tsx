'use client';

import { GitBranch, Globe } from 'lucide-react';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';

interface Props {
  /**
   * "branch" — muestra la sucursal activa (para ventas, compras, gastos, empleados, nómina)
   * "global"  — muestra "Compartido · todas las sucursales" (para clientes, productos, proveedores)
   */
  mode?: 'branch' | 'global';
  className?: string;
}

export function BranchBadge({ mode = 'branch', className = '' }: Props) {
  const { activeBranch, branches, hasBranches, isOwner } = useBranch();
  const { user } = useAuth();

  // ── Modo global: ítem compartido entre todas las sucursales ──────────────
  if (mode === 'global') {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit bg-slate-100 text-slate-500 ${className}`}>
        <Globe size={11} />
        <span>Compartido · todas las sucursales</span>
      </div>
    );
  }

  // ── Modo branch: ítem de una sucursal específica ─────────────────────────
  if (!hasBranches && !user?.branchId) return null;

  let name: string;
  let isAll = false;

  if (isOwner) {
    if (activeBranch) {
      name = activeBranch.name;
    } else {
      name = branches.length > 1 ? 'Todas las sucursales' : (branches[0]?.name ?? 'Principal');
      isAll = branches.length > 1;
    }
  } else {
    const userBranch = branches.find(b => b.id === user?.branchId);
    name = userBranch?.name ?? 'Sucursal asignada';
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
      isAll
        ? 'bg-slate-100 text-slate-500'
        : 'bg-blue-50 text-blue-700 border border-blue-100'
    } ${className}`}>
      <GitBranch size={11} />
      <span>{name}</span>
    </div>
  );
}

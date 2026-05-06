'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';

interface Branch {
  id: string;
  name: string;
  address?: string;
  isMain: boolean;
  isActive: boolean;
}

interface BranchContextType {
  branches: Branch[];
  activeBranchId: string | null; // null = todas las sucursales
  setActiveBranchId: (id: string | null) => void;
  activeBranch: Branch | null;
  isOwner: boolean;
  isMultiBranch: boolean; // 2+ sucursales (para selector/transferencia)
  hasBranches: boolean;   // 1+ sucursales (para mostrar asignación)
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  activeBranchId: null,
  setActiveBranchId: () => {},
  activeBranch: null,
  isOwner: false,
  isMultiBranch: false,
  hasBranches: false,
});

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (!user?.tenantId) return;

    import('@/lib/api').then(({ default: api }) => {
      if (isOwner) {
        // Owner: carga todas las sucursales para el selector
        api.get('/branches').then(r => {
          const data: Branch[] = r.data?.data ?? r.data ?? [];
          setBranches(data.filter(b => b.isActive));
        }).catch(() => {});
      } else if (user?.branchId) {
        // Admin/manager de sucursal: carga solo su sucursal para mostrar el nombre
        api.get(`/branches/${user.branchId}`).then(r => {
          const data: Branch = r.data?.data ?? r.data;
          if (data?.id) setBranches([data]);
        }).catch(() => {});
      }
    });
  }, [isOwner, user?.tenantId, user?.branchId]);

  // Restore saved branch from localStorage
  useEffect(() => {
    if (!isOwner) return;
    const saved = localStorage.getItem(`activeBranch_${user?.tenantId}`);
    if (saved) setActiveBranchIdState(saved === 'all' ? null : saved);
  }, [isOwner, user?.tenantId]);

  const setActiveBranchId = (id: string | null) => {
    setActiveBranchIdState(id);
    localStorage.setItem(`activeBranch_${user?.tenantId}`, id ?? 'all');
  };

  const activeBranch = branches.find(b => b.id === activeBranchId) ?? null;
  const isMultiBranch = branches.length > 1;
  const hasBranches = branches.length > 0;

  return (
    <BranchContext.Provider value={{
      branches,
      activeBranchId,
      setActiveBranchId,
      activeBranch,
      isOwner,
      isMultiBranch,
      hasBranches,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}

export enum TenantPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export const PLAN_LABELS: Record<TenantPlan, string> = {
  [TenantPlan.FREE]: 'Gratis',
  [TenantPlan.BASIC]: 'Básico',
  [TenantPlan.PRO]: 'Pro',
  [TenantPlan.ENTERPRISE]: 'Empresarial',
};

export const PLAN_LIMITS: Record<TenantPlan, { invoices: number; users: number; price: number }> = {
  [TenantPlan.FREE]:       { invoices: 50,        users: 2,   price: 0      },
  [TenantPlan.BASIC]:      { invoices: 500,        users: 5,   price: 2500   },
  [TenantPlan.PRO]:        { invoices: 2000,       users: 15,  price: 4500   },
  [TenantPlan.ENTERPRISE]: { invoices: 999999999,  users: 999, price: 5500   },
};

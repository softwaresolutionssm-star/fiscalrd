export enum NcfType {
  E31 = 'E31', // Factura de Crédito Fiscal Electrónica (empresa con RNC)
  E32 = 'E32', // Factura de Consumidor Final Electrónica (persona sin RNC)
  E33 = 'E33', // Nota de Débito Electrónica
  E34 = 'E34', // Nota de Crédito Electrónica
  E41 = 'E41', // Comprobante de Compras Electrónico (proveedor informal)
  E43 = 'E43', // Gastos Menores Electrónico
  E44 = 'E44', // Régimen Especial Electrónico
  E45 = 'E45', // Gubernamental Electrónico
  E46 = 'E46', // Comprobante para Exportaciones
  E47 = 'E47', // Comprobante para Pagos al Exterior
}

export const NCF_LABELS: Record<NcfType, string> = {
  [NcfType.E31]: 'E31 - Crédito Fiscal',
  [NcfType.E32]: 'E32 - Consumidor Final',
  [NcfType.E33]: 'E33 - Nota de Débito',
  [NcfType.E34]: 'E34 - Nota de Crédito',
  [NcfType.E41]: 'E41 - Comprobante de Compras',
  [NcfType.E43]: 'E43 - Gastos Menores',
  [NcfType.E44]: 'E44 - Régimen Especial',
  [NcfType.E45]: 'E45 - Gubernamental',
  [NcfType.E46]: 'E46 - Exportaciones',
  [NcfType.E47]: 'E47 - Pagos al Exterior',
};

// e-CF emitidos en ventas (lado receptor: cliente)
export const SALE_NCF_TYPES = [NcfType.E31, NcfType.E32, NcfType.E33, NcfType.E34, NcfType.E44, NcfType.E45, NcfType.E46, NcfType.E47];

// e-CF de compras (lado emisor: proveedor informal)
export const PURCHASE_NCF_TYPES = [NcfType.E41, NcfType.E43];

// Tipos por defecto que se crean al registrar un negocio
export const DEFAULT_ECF_TYPES = [
  NcfType.E31, NcfType.E32, NcfType.E33, NcfType.E34,
  NcfType.E41, NcfType.E43, NcfType.E44, NcfType.E45,
];

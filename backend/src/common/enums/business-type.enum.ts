export enum BusinessType {
  FERRETERIA      = 'ferreteria',       // Ferretería / Materiales de construcción
  COLMADO         = 'colmado',          // Colmado / Mini market / Bodega
  SUPERMERCADO    = 'supermercado',     // Supermercado / Hipermercado
  FARMACIA        = 'farmacia',         // Farmacia / Droguería
  RESTAURANTE     = 'restaurante',      // Restaurante / Cafetería / Comida rápida
  ROPA            = 'ropa',             // Tienda de ropa / Calzado / Accesorios
  SALON           = 'salon',            // Salón de belleza / Barbería / Spa
  TALLER          = 'taller',           // Taller mecánico / Gomera / Eléctrico
  TECNOLOGIA      = 'tecnologia',       // Tienda de tecnología / Electrónica
  SERVICIOS       = 'servicios',        // Empresa de servicios profesionales
  CONSTRUCTORA    = 'constructora',     // Constructora / Inmobiliaria
  IMPORTADORA     = 'importadora',      // Importadora / Exportadora / Distribuidora
  CONSULTORIO     = 'consultorio',      // Consultorio médico / Dental / Veterinaria
  EDUCACION       = 'educacion',        // Centro educativo / Academia / Escuela
  HOTEL           = 'hotel',            // Hotel / Hostal / Apartahotel
  TRANSPORTE      = 'transporte',       // Empresa de transporte / Mudanzas
  AGROPECUARIO    = 'agropecuario',     // Agropecuario / Agricultura / Ganadería
  BAR             = 'bar',              // Bar / Discoteca / Entretenimiento
  JOYERIA         = 'joyeria',          // Joyería / Relojería / Óptica
  PANADERIA       = 'panaderia',        // Panadería / Repostería / Dulcería
  OTRO            = 'otro',             // Otro tipo de negocio
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.FERRETERIA]:   'Ferretería / Materiales',
  [BusinessType.COLMADO]:      'Colmado / Mini Market',
  [BusinessType.SUPERMERCADO]: 'Supermercado',
  [BusinessType.FARMACIA]:     'Farmacia / Droguería',
  [BusinessType.RESTAURANTE]:  'Restaurante / Cafetería',
  [BusinessType.ROPA]:         'Tienda de Ropa / Calzado',
  [BusinessType.SALON]:        'Salón de Belleza / Barbería',
  [BusinessType.TALLER]:       'Taller Mecánico',
  [BusinessType.TECNOLOGIA]:   'Tecnología / Electrónica',
  [BusinessType.SERVICIOS]:    'Empresa de Servicios',
  [BusinessType.CONSTRUCTORA]: 'Constructora / Inmobiliaria',
  [BusinessType.IMPORTADORA]:  'Importadora / Distribuidora',
  [BusinessType.CONSULTORIO]:  'Consultorio Médico / Dental',
  [BusinessType.EDUCACION]:    'Centro Educativo / Academia',
  [BusinessType.HOTEL]:        'Hotel / Hostal',
  [BusinessType.TRANSPORTE]:   'Transporte / Mudanzas',
  [BusinessType.AGROPECUARIO]: 'Agropecuario / Ganadería',
  [BusinessType.BAR]:          'Bar / Entretenimiento',
  [BusinessType.JOYERIA]:      'Joyería / Óptica',
  [BusinessType.PANADERIA]:    'Panadería / Repostería',
  [BusinessType.OTRO]:         'Otro',
};

// Ícono emoji por tipo de negocio (para la UI)
export const BUSINESS_TYPE_EMOJI: Record<BusinessType, string> = {
  [BusinessType.FERRETERIA]:   '🔧',
  [BusinessType.COLMADO]:      '🛒',
  [BusinessType.SUPERMERCADO]: '🏪',
  [BusinessType.FARMACIA]:     '💊',
  [BusinessType.RESTAURANTE]:  '🍽️',
  [BusinessType.ROPA]:         '👗',
  [BusinessType.SALON]:        '💇',
  [BusinessType.TALLER]:       '🚗',
  [BusinessType.TECNOLOGIA]:   '💻',
  [BusinessType.SERVICIOS]:    '🏢',
  [BusinessType.CONSTRUCTORA]: '🏗️',
  [BusinessType.IMPORTADORA]:  '📦',
  [BusinessType.CONSULTORIO]:  '🏥',
  [BusinessType.EDUCACION]:    '🎓',
  [BusinessType.HOTEL]:        '🏨',
  [BusinessType.TRANSPORTE]:   '🚛',
  [BusinessType.AGROPECUARIO]: '🌾',
  [BusinessType.BAR]:          '🍺',
  [BusinessType.JOYERIA]:      '💍',
  [BusinessType.PANADERIA]:    '🥖',
  [BusinessType.OTRO]:         '🏬',
};

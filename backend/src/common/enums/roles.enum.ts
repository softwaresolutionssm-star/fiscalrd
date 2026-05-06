export enum UserRole {
  SUPER_ADMIN = 'super_admin', // Saul — dueño de FiscalRD
  OWNER = 'owner',             // Dueño del negocio cliente
  ADMIN = 'admin',             // Administrador / Gerente general
  MANAGER = 'manager',         // Encargado de sucursal — RR.HH., nómina, operaciones
  CASHIER = 'cashier',         // Cajero — solo POS
  EMPLOYEE = 'employee',       // Empleado — solo sus órdenes
  ACCOUNTANT = 'accountant',   // Contador — finanzas, DGII, contabilidad
}

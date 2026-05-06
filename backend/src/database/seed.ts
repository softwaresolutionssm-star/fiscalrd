import 'dotenv/config'; // must be first
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Customer, CustomerType } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Employee, EmployeeStatus } from '../employees/entities/employee.entity';
import { NcfSequence } from '../ncf-sequences/entities/ncf-sequence.entity';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Purchase, PurchaseStatus } from '../purchases/entities/purchase.entity';
import { PurchaseItem } from '../purchases/entities/purchase-item.entity';
import { AccountsReceivable, ArStatus } from '../accounts-receivable/entities/accounts-receivable.entity';
import { ArPayment } from '../accounts-receivable/entities/ar-payment.entity';
import { AccountsPayable, ApStatus } from '../accounts-payable/entities/accounts-payable.entity';
import { ApPayment } from '../accounts-payable/entities/ap-payment.entity';
import { UserRole } from '../common/enums/roles.enum';
import { NcfType } from '../common/enums/ncf-type.enum';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [
    Tenant,
    User,
    Customer,
    Product,
    Supplier,
    Employee,
    NcfSequence,
    Sale,
    SaleItem,
    Purchase,
    PurchaseItem,
    AccountsReceivable,
    ArPayment,
    AccountsPayable,
    ApPayment,
  ],
  synchronize: false,
});

// Helper: format NCF number, e.g. B0100000001
function formatNcf(type: NcfType, sequence: number): string {
  return `${type}${String(sequence).padStart(8, '0')}`;
}

// Helper: round to 2 decimal places
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function runSeed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(User);
  const customerRepo = AppDataSource.getRepository(Customer);
  const productRepo = AppDataSource.getRepository(Product);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const employeeRepo = AppDataSource.getRepository(Employee);
  const ncfSequenceRepo = AppDataSource.getRepository(NcfSequence);
  const saleRepo = AppDataSource.getRepository(Sale);
  const saleItemRepo = AppDataSource.getRepository(SaleItem);
  const purchaseRepo = AppDataSource.getRepository(Purchase);
  const purchaseItemRepo = AppDataSource.getRepository(PurchaseItem);
  const arRepo = AppDataSource.getRepository(AccountsReceivable);
  const apRepo = AppDataSource.getRepository(AccountsPayable);

  // ─────────────────────────────────────────────────────────────
  // 1. TENANT
  // ─────────────────────────────────────────────────────────────
  console.log('Creating tenant...');
  let tenant = await tenantRepo.findOne({ where: { rnc: '101234567' } });
  if (!tenant) {
    tenant = tenantRepo.create({
      businessName: 'Distribuidora El Caribe SRL',
      rnc: '101234567',
      address: 'Av. 27 de Febrero #45, Santo Domingo',
      phone: '809-555-0100',
      email: 'info@elcaribe.do',
      isActive: true,
    });
    tenant = await tenantRepo.save(tenant);
  }
  console.log(`Tenant ID: ${tenant.id}`);

  // ─────────────────────────────────────────────────────────────
  // 2. PLATFORM SUPER ADMIN (no tenant — dueño de FiscalRD)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating platform super admin...');
  let superAdmin = await userRepo.findOne({ where: { email: 'saul@fiscalrd.do' } });
  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash('FiscalRD2024!', 10);
    superAdmin = userRepo.create({
      email: 'saul@fiscalrd.do',
      password: hashedPassword,
      firstName: 'Saul',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      tenantId: null as any,
      isActive: true,
    });
    superAdmin = await userRepo.save(superAdmin);
  }
  console.log(`Platform super admin ID: ${superAdmin.id}`);

  // ─────────────────────────────────────────────────────────────
  // 3. TENANT OWNER for El Caribe demo
  // ─────────────────────────────────────────────────────────────
  console.log('Creating tenant owner...');
  let adminUser = await userRepo.findOne({ where: { email: 'admin@elcaribe.do' } });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    adminUser = userRepo.create({
      email: 'admin@elcaribe.do',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: UserRole.OWNER,
      tenantId: tenant.id,
      isActive: true,
    });
    adminUser = await userRepo.save(adminUser);
  }
  console.log(`Tenant owner ID: ${adminUser.id}`);

  // Extra demo users per role
  const demoUsers = [
    { email: 'dueno@elcaribe.do',    password: 'Dueno123!',    firstName: 'Carlos',  lastName: 'Martínez', role: UserRole.ADMIN },
    { email: 'contador@elcaribe.do', password: 'Contador123!', firstName: 'Ana',     lastName: 'Sánchez',  role: UserRole.ACCOUNTANT },
    { email: 'cajero@elcaribe.do',   password: 'Cajero123!',   firstName: 'Pedro',   lastName: 'Ramírez',  role: UserRole.CASHIER },
  ];
  for (const u of demoUsers) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 10);
      await userRepo.save(userRepo.create({ ...u, password: hashed, tenantId: tenant.id, isActive: true }));
    }
  }
  console.log('Demo users created');

  // ─────────────────────────────────────────────────────────────
  // 3. CUSTOMERS (10 realistic Dominican)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating customers...');
  const customersData = [
    {
      name: 'Supermercados La Unión SRL',
      type: CustomerType.BUSINESS,
      rnc: '130123456',
      email: 'compras@launion.do',
      phone: '809-555-0201',
      address: 'Av. Winston Churchill #88, Santo Domingo',
    },
    {
      name: 'Ferretería Los Hermanos',
      type: CustomerType.BUSINESS,
      rnc: '101987654',
      email: 'ventas@ferreterialoshermanos.do',
      phone: '809-555-0202',
      address: 'Calle El Conde #23, Santo Domingo',
    },
    {
      name: 'Farmacia San Marcos SRL',
      type: CustomerType.BUSINESS,
      rnc: '131456789',
      email: 'pedidos@farmaciasanmarcos.do',
      phone: '809-555-0203',
      address: 'Av. Independencia #112, Santo Domingo',
    },
    {
      name: 'Constructora Horizonte SA',
      type: CustomerType.BUSINESS,
      rnc: '101765432',
      email: 'adm@horizonteconstruct.do',
      phone: '809-555-0204',
      address: 'Plaza Santiago Local 4, Santiago',
    },
    {
      name: 'Restaurante El Bohío',
      type: CustomerType.BUSINESS,
      rnc: '130987654',
      email: 'info@elbohio.do',
      phone: '809-555-0205',
      address: 'Calle Las Damas #67, Zona Colonial, Santo Domingo',
    },
    {
      name: 'María García',
      type: CustomerType.INDIVIDUAL,
      cedula: '00112345678',
      email: 'maria.garcia@gmail.com',
      phone: '829-555-0301',
      address: 'Calle Rosa Duarte #34, Los Alcarrizos',
    },
    {
      name: 'Carlos Marte Rodríguez',
      type: CustomerType.INDIVIDUAL,
      cedula: '00212345678',
      email: 'carlos.marte@hotmail.com',
      phone: '849-555-0302',
      address: 'Av. San Martín #8, Apt 3B, Santo Domingo',
    },
    {
      name: 'Ana Lucía Féliz',
      type: CustomerType.INDIVIDUAL,
      cedula: '00312345678',
      email: 'ana.feliz@yahoo.com',
      phone: '829-555-0303',
      address: 'Urbanización Arroyo Hondo, Calle 4 #21',
    },
    {
      name: 'Instituto Educativo Nuevo Mundo SRL',
      type: CustomerType.BUSINESS,
      rnc: '101654321',
      email: 'admin@nuevomundo.edu.do',
      phone: '809-555-0206',
      address: 'Av. Luperón #455, Santiago',
    },
    {
      name: 'Pedro Antonio Jiménez',
      type: CustomerType.INDIVIDUAL,
      cedula: '00412345678',
      email: 'pedro.jimenez@gmail.com',
      phone: '849-555-0304',
      address: 'Calle Principal #12, Villa Mella',
    },
  ];

  const customers: Customer[] = [];
  for (const data of customersData) {
    const existing = await customerRepo.findOne({
      where: { tenantId: tenant.id, name: data.name },
    });
    if (!existing) {
      const customer = customerRepo.create({ ...data, tenantId: tenant.id, isActive: true });
      customers.push(await customerRepo.save(customer));
    } else {
      customers.push(existing);
    }
  }
  console.log(`Created/found ${customers.length} customers`);

  // ─────────────────────────────────────────────────────────────
  // 4. PRODUCTS (15 realistic, mix of goods and services, prices in DOP)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating products...');
  const productsData = [
    {
      name: 'Arroz Premium 50lb',
      description: 'Arroz blanco de grano largo, saco 50 libras',
      code: 'ARR-001',
      price: 1850.00,
      itbisRate: 0,
      isService: false,
    },
    {
      name: 'Aceite de Cocina 1 Galón',
      description: 'Aceite vegetal de girasol, 1 galón',
      code: 'ACE-001',
      price: 750.00,
      itbisRate: 0,
      isService: false,
    },
    {
      name: 'Azúcar Refinada 50lb',
      description: 'Azúcar blanca refinada, saco 50 libras',
      code: 'AZU-001',
      price: 1650.00,
      itbisRate: 0,
      isService: false,
    },
    {
      name: 'Café Molido 1lb',
      description: 'Café dominicano molido, bolsa 1 libra',
      code: 'CAF-001',
      price: 320.00,
      itbisRate: 0,
      isService: false,
    },
    {
      name: 'Pollo Entero (por libra)',
      description: 'Pollo fresco entero, precio por libra',
      code: 'POL-001',
      price: 110.00,
      itbisRate: 0,
      isService: false,
    },
    {
      name: 'Computadora HP Laptop 15"',
      description: 'HP Laptop 15-dy2xxx, Intel Core i5, 8GB RAM, 256GB SSD',
      code: 'TEC-001',
      price: 45000.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Impresora Epson EcoTank L3250',
      description: 'Impresora multifuncional con sistema de tinta continua',
      code: 'TEC-002',
      price: 18500.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Aire Acondicionado 12,000 BTU',
      description: 'Unidad split inverter 12,000 BTU, 220V',
      code: 'ELE-001',
      price: 28000.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Televisor Samsung 55" 4K',
      description: 'Smart TV QLED 55 pulgadas, resolución 4K UHD',
      code: 'ELE-002',
      price: 55000.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Pintura Interior Galón',
      description: 'Pintura látex para interiores, galón',
      code: 'CON-001',
      price: 850.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Servicio de Consultoría Empresarial',
      description: 'Consultoría en gestión y administración empresarial (por hora)',
      code: 'SRV-001',
      price: 8500.00,
      itbisRate: 18,
      isService: true,
    },
    {
      name: 'Servicio de Contabilidad Mensual',
      description: 'Servicio contable mensual para PYMES',
      code: 'SRV-002',
      price: 12000.00,
      itbisRate: 18,
      isService: true,
    },
    {
      name: 'Servicio de Instalación Eléctrica',
      description: 'Instalación y cableado eléctrico residencial',
      code: 'SRV-003',
      price: 15000.00,
      itbisRate: 18,
      isService: true,
    },
    {
      name: 'Detergente Industrial 5 Galones',
      description: 'Detergente líquido multiusos, contenedor 5 galones',
      code: 'LIM-001',
      price: 1200.00,
      itbisRate: 18,
      isService: false,
    },
    {
      name: 'Papel Bond 8.5x11 Resma',
      description: 'Papel bond blanco tamaño carta, 500 hojas',
      code: 'OFI-001',
      price: 380.00,
      itbisRate: 18,
      isService: false,
    },
  ];

  const products: Product[] = [];
  for (const data of productsData) {
    const existing = await productRepo.findOne({
      where: { tenantId: tenant.id, code: data.code },
    });
    if (!existing) {
      const product = productRepo.create({ ...data, tenantId: tenant.id, isActive: true });
      products.push(await productRepo.save(product));
    } else {
      products.push(existing);
    }
  }
  console.log(`Created/found ${products.length} products`);

  // ─────────────────────────────────────────────────────────────
  // 5. SUPPLIERS (5 realistic)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating suppliers...');
  const suppliersData = [
    {
      name: 'Distribuidora Nacional de Alimentos SA',
      rnc: '101223344',
      contactName: 'Roberto Castillo',
      email: 'ventas@dinasa.do',
      phone: '809-555-0401',
      address: 'Zona Industrial de Herrera, Calle A #12, Santo Domingo',
    },
    {
      name: 'Tecnología y Equipos del Caribe SRL',
      rnc: '130445566',
      contactName: 'Yolanda Peralta',
      email: 'info@teccaribe.do',
      phone: '809-555-0402',
      address: 'Av. Abraham Lincoln #305, Santo Domingo',
    },
    {
      name: 'Importadora Electrónica Global SRL',
      rnc: '101667788',
      contactName: 'Miguel Ángel Soto',
      email: 'compras@ieglobal.do',
      phone: '809-555-0403',
      address: 'Av. John F. Kennedy #78, Edificio Torre Empresarial',
    },
    {
      name: 'Ferretería Industrial La Capital SRL',
      rnc: '130889900',
      contactName: 'Carmen Altagracia Núñez',
      email: 'pedidos@ficapital.do',
      phone: '809-555-0404',
      address: 'Calle Duarte #234, Villa Consuelo, Santo Domingo',
    },
    {
      name: 'Grupo Agropecuario Los Pinos SA',
      rnc: '101112233',
      contactName: 'Francisco Javier Medina',
      email: 'ventas@lospinosagrope.do',
      phone: '809-555-0405',
      address: 'Autopista Duarte Km 18, Villa Altagracia',
    },
  ];

  const suppliers: Supplier[] = [];
  for (const data of suppliersData) {
    const existing = await supplierRepo.findOne({
      where: { tenantId: tenant.id, rnc: data.rnc },
    });
    if (!existing) {
      const supplier = supplierRepo.create({ ...data, tenantId: tenant.id, isActive: true });
      suppliers.push(await supplierRepo.save(supplier));
    } else {
      suppliers.push(existing);
    }
  }
  console.log(`Created/found ${suppliers.length} suppliers`);

  // ─────────────────────────────────────────────────────────────
  // 6. EMPLOYEES (5 realistic Dominican names, DOP salaries RD$25K-85K)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating employees...');
  const employeesData = [
    {
      firstName: 'Rosa',
      lastName: 'Familia Díaz',
      cedula: '00212345678',
      email: 'rosa.familia@elcaribe.do',
      phone: '829-555-0501',
      position: 'Gerente General',
      department: 'Gerencia',
      baseSalary: 85000.00,
      hireDate: new Date('2020-03-15'),
      status: EmployeeStatus.ACTIVE,
    },
    {
      firstName: 'José',
      lastName: 'Taveras Mateo',
      cedula: '00312345678',
      email: 'jose.taveras@elcaribe.do',
      phone: '849-555-0502',
      position: 'Contador',
      department: 'Contabilidad',
      baseSalary: 55000.00,
      hireDate: new Date('2021-06-01'),
      status: EmployeeStatus.ACTIVE,
    },
    {
      firstName: 'Luisa',
      lastName: 'Marte Guerrero',
      cedula: '00412345678',
      email: 'luisa.marte@elcaribe.do',
      phone: '829-555-0503',
      position: 'Vendedora',
      department: 'Ventas',
      baseSalary: 35000.00,
      hireDate: new Date('2022-01-10'),
      status: EmployeeStatus.ACTIVE,
    },
    {
      firstName: 'Rafael',
      lastName: 'Disla Roque',
      cedula: '00512345678',
      email: 'rafael.disla@elcaribe.do',
      phone: '849-555-0504',
      position: 'Almacenista',
      department: 'Almacén',
      baseSalary: 28000.00,
      hireDate: new Date('2022-08-22'),
      status: EmployeeStatus.ACTIVE,
    },
    {
      firstName: 'Carmen',
      lastName: 'Santana Polanco',
      cedula: '00612345678',
      email: 'carmen.santana@elcaribe.do',
      phone: '829-555-0505',
      position: 'Cajera',
      department: 'Caja',
      baseSalary: 25000.00,
      hireDate: new Date('2023-04-05'),
      status: EmployeeStatus.ACTIVE,
    },
  ];

  const employees: Employee[] = [];
  for (const data of employeesData) {
    const existing = await employeeRepo.findOne({
      where: { tenantId: tenant.id, cedula: data.cedula },
    });
    if (!existing) {
      const employee = employeeRepo.create({ ...data, tenantId: tenant.id });
      employees.push(await employeeRepo.save(employee));
    } else {
      employees.push(existing);
    }
  }
  console.log(`Created/found ${employees.length} employees`);

  // ─────────────────────────────────────────────────────────────
  // 7. e-CF SEQUENCES E31–E45 (Ley 32-23)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating e-CF sequences...');
  const ncfTypesToSeed: NcfType[] = [
    NcfType.E31, NcfType.E32, NcfType.E33, NcfType.E34,
    NcfType.E41, NcfType.E43, NcfType.E44, NcfType.E45,
  ];

  const ncfSequences: NcfSequence[] = [];
  for (const ncfType of ncfTypesToSeed) {
    const existing = await ncfSequenceRepo.findOne({
      where: { tenantId: tenant.id, ncfType },
    });
    if (!existing) {
      const seq = ncfSequenceRepo.create({
        tenantId: tenant.id,
        ncfType,
        startSequence: 1,
        endSequence: 500,
        currentSequence: 1,
        isActive: true,
      });
      ncfSequences.push(await ncfSequenceRepo.save(seq));
    } else {
      ncfSequences.push(existing);
    }
  }
  console.log(`Created/found ${ncfSequences.length} NCF sequences`);

  // ─────────────────────────────────────────────────────────────
  // 8. SALES (5 with ISSUED status, current month March 2026)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating sales...');

  interface SaleLineInput {
    product: Product;
    qty: number;
  }

  interface SaleInput {
    customer: Customer;
    ncfType: NcfType;
    ncfSeq: number;
    saleDate: string;
    lines: SaleLineInput[];
    notes?: string;
  }

  const salesInput: SaleInput[] = [
    {
      customer: customers[5], // María García
      ncfType: NcfType.E32,
      ncfSeq: 1,
      saleDate: '2026-03-05',
      lines: [
        { product: products[0], qty: 2 },
        { product: products[1], qty: 3 },
        { product: products[3], qty: 5 },
      ],
      notes: 'Venta al contado',
    },
    {
      customer: customers[0], // Supermercados La Unión SRL
      ncfType: NcfType.E31,
      ncfSeq: 1,
      saleDate: '2026-03-10',
      lines: [
        { product: products[0], qty: 20 },
        { product: products[1], qty: 15 },
        { product: products[2], qty: 10 },
      ],
      notes: 'Factura a crédito 30 días',
    },
    {
      customer: customers[1], // Ferretería Los Hermanos
      ncfType: NcfType.E31,
      ncfSeq: 2,
      saleDate: '2026-03-14',
      lines: [
        { product: products[9], qty: 10 },
        { product: products[13], qty: 5 },
      ],
      notes: 'Compra de insumos industriales',
    },
    {
      customer: customers[6], // Carlos Marte
      ncfType: NcfType.E32,
      ncfSeq: 2,
      saleDate: '2026-03-18',
      lines: [
        { product: products[5], qty: 1 },
        { product: products[14], qty: 3 },
      ],
      notes: 'Venta contado, incluye garantía',
    },
    {
      customer: customers[8], // Instituto Educativo Nuevo Mundo
      ncfType: NcfType.E31,
      ncfSeq: 3,
      saleDate: '2026-03-22',
      lines: [
        { product: products[10], qty: 4 },
        { product: products[11], qty: 1 },
        { product: products[6], qty: 2 },
      ],
      notes: 'Servicios y equipos para año escolar',
    },
  ];

  const savedSales: Sale[] = [];
  for (const input of salesInput) {
    const ncfNumber = formatNcf(input.ncfType, input.ncfSeq);
    const existingCheck = await saleRepo.findOne({
      where: { tenantId: tenant.id, ncfNumber },
    });
    if (existingCheck) {
      console.log(`  Sale ${ncfNumber} already exists, skipping`);
      savedSales.push(existingCheck);
      continue;
    }

    let saleSubtotal = 0;
    let saleItbisTotal = 0;

    const itemsData = input.lines.map((line) => {
      const itemSubtotal = round2(line.product.price * line.qty);
      const itemItbis = round2(itemSubtotal * (line.product.itbisRate / 100));
      const itemTotal = round2(itemSubtotal + itemItbis);
      saleSubtotal += itemSubtotal;
      saleItbisTotal += itemItbis;
      return {
        productId: line.product.id,
        productName: line.product.name,
        unitPrice: line.product.price,
        quantity: line.qty,
        itbisRate: line.product.itbisRate,
        itbisAmount: itemItbis,
        subtotal: itemSubtotal,
        total: itemTotal,
      };
    });

    saleSubtotal = round2(saleSubtotal);
    saleItbisTotal = round2(saleItbisTotal);
    const saleTotal = round2(saleSubtotal + saleItbisTotal);

    const customer = input.customer;
    const sale = saleRepo.create({
      tenantId: tenant.id,
      customerId: customer.id,
      customerName: customer.name,
      customerRncCedula: (customer as any).rnc ?? (customer as any).cedula ?? undefined,
      ncfType: input.ncfType,
      ncfNumber,
      status: SaleStatus.ISSUED,
      saleDate: new Date(input.saleDate),
      subtotal: saleSubtotal,
      itbisTotal: saleItbisTotal,
      total: saleTotal,
      notes: input.notes ?? undefined,
    });
    const savedSale = await saleRepo.save(sale);

    for (const itemData of itemsData) {
      const saleItem = saleItemRepo.create({ ...itemData, saleId: savedSale.id });
      await saleItemRepo.save(saleItem);
    }

    savedSales.push(savedSale);
    console.log(`  Sale ${savedSale.ncfNumber} → RD$${saleTotal.toLocaleString()}`);
  }

  // Update NCF sequences currentSequence
  const b01Seq = ncfSequences.find((s) => s.ncfType === NcfType.E32);
  const b02Seq = ncfSequences.find((s) => s.ncfType === NcfType.E31);
  if (b01Seq && b01Seq.currentSequence < 3) {
    await ncfSequenceRepo.update(b01Seq.id, { currentSequence: 3 });
  }
  if (b02Seq && b02Seq.currentSequence < 4) {
    await ncfSequenceRepo.update(b02Seq.id, { currentSequence: 4 });
  }

  // ─────────────────────────────────────────────────────────────
  // 9. PURCHASES (3 confirmed)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating purchases...');

  interface PurchaseLineInput {
    product: Product;
    qty: number;
    unitCost: number;
  }

  interface PurchaseInput {
    supplier: Supplier;
    ncfNumber: string;
    ncfType: string;
    purchaseDate: string;
    isCredit: boolean;
    dueDate?: string;
    notes?: string;
    lines: PurchaseLineInput[];
  }

  const purchasesInput: PurchaseInput[] = [
    {
      supplier: suppliers[0],
      ncfNumber: 'B0200000034',
      ncfType: 'B02',
      purchaseDate: '2026-03-03',
      isCredit: true,
      dueDate: '2026-04-02',
      notes: 'Compra mensual de alimentos básicos',
      lines: [
        { product: products[0], qty: 50, unitCost: 1700.00 },
        { product: products[1], qty: 40, unitCost: 680.00 },
        { product: products[2], qty: 30, unitCost: 1500.00 },
        { product: products[3], qty: 100, unitCost: 280.00 },
      ],
    },
    {
      supplier: suppliers[1],
      ncfNumber: 'B0200000078',
      ncfType: 'B02',
      purchaseDate: '2026-03-11',
      isCredit: false,
      notes: 'Reposición de inventario tecnología',
      lines: [
        { product: products[5], qty: 5, unitCost: 38000.00 },
        { product: products[6], qty: 8, unitCost: 15500.00 },
        { product: products[14], qty: 50, unitCost: 320.00 },
      ],
    },
    {
      supplier: suppliers[2],
      ncfNumber: 'B0200000112',
      ncfType: 'B02',
      purchaseDate: '2026-03-19',
      isCredit: true,
      dueDate: '2026-04-18',
      notes: 'Lote de equipos eléctricos para reposición',
      lines: [
        { product: products[7], qty: 6, unitCost: 22000.00 },
        { product: products[8], qty: 4, unitCost: 44000.00 },
      ],
    },
  ];

  const savedPurchases: Purchase[] = [];
  for (const input of purchasesInput) {
    const existingCheck = await purchaseRepo.findOne({
      where: {
        tenantId: tenant.id,
        ncfNumber: input.ncfNumber,
        supplierId: input.supplier.id,
      },
    });
    if (existingCheck) {
      console.log(`  Purchase ${input.ncfNumber} already exists, skipping`);
      savedPurchases.push(existingCheck);
      continue;
    }

    let purchSubtotal = 0;
    let purchItbisTotal = 0;

    const purchItemsData = input.lines.map((line) => {
      const itemSubtotal = round2(line.unitCost * line.qty);
      const itemItbis = round2(itemSubtotal * (line.product.itbisRate / 100));
      const itemTotal = round2(itemSubtotal + itemItbis);
      purchSubtotal += itemSubtotal;
      purchItbisTotal += itemItbis;
      return {
        productId: line.product.id,
        description: line.product.name,
        quantity: line.qty,
        unitCost: line.unitCost,
        itbisRate: line.product.itbisRate,
        subtotal: itemSubtotal,
        itbisAmount: itemItbis,
        total: itemTotal,
      };
    });

    purchSubtotal = round2(purchSubtotal);
    purchItbisTotal = round2(purchItbisTotal);
    const purchTotal = round2(purchSubtotal + purchItbisTotal);

    const purchase = purchaseRepo.create({
      tenantId: tenant.id,
      supplierId: input.supplier.id,
      supplierName: input.supplier.name,
      supplierRnc: input.supplier.rnc,
      ncfNumber: input.ncfNumber,
      ncfType: input.ncfType,
      purchaseDate: new Date(input.purchaseDate),
      status: PurchaseStatus.CONFIRMED,
      subtotal: purchSubtotal,
      itbisTotal: purchItbisTotal,
      total: purchTotal,
      isCredit: input.isCredit,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: input.notes ?? undefined,
    });
    const savedPurchase = await purchaseRepo.save(purchase);

    for (const itemData of purchItemsData) {
      const pItem = purchaseItemRepo.create({ ...itemData, purchaseId: savedPurchase.id });
      await purchaseItemRepo.save(pItem);
    }

    savedPurchases.push(savedPurchase);
    console.log(`  Purchase ${savedPurchase.ncfNumber} from ${input.supplier.name} → RD$${purchTotal.toLocaleString()}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 10. ACCOUNTS RECEIVABLE (2 from first 2 credit sales)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating accounts receivable...');
  // Sales index 1 (B02-0001) and 2 (B02-0002) are credit sales
  const creditSales = savedSales.filter(
    (s) => s.ncfType === NcfType.E31 && s.status === SaleStatus.ISSUED,
  ).slice(0, 2);

  for (const sale of creditSales) {
    const existing = await arRepo.findOne({ where: { tenantId: tenant.id, saleId: sale.id } });
    if (!existing) {
      const issueDate = sale.saleDate;
      const dueDateMs = new Date(issueDate).getTime() + 30 * 24 * 60 * 60 * 1000;
      const ar = arRepo.create({
        tenantId: tenant.id,
        customerId: sale.customerId,
        customerName: sale.customerName,
        saleId: sale.id,
        ncfNumber: sale.ncfNumber,
        issueDate,
        dueDate: new Date(dueDateMs),
        amount: sale.total,
        paidAmount: 0,
        balance: sale.total,
        status: ArStatus.PENDING,
        notes: `Cuenta por cobrar generada de venta ${sale.ncfNumber}`,
      });
      await arRepo.save(ar);
      console.log(`  AR created for sale ${sale.ncfNumber} → RD$${Number(sale.total).toLocaleString()}`);
    } else {
      console.log(`  AR for sale ${sale.ncfNumber} already exists, skipping`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 11. ACCOUNTS PAYABLE (2 from first 2 credit purchases)
  // ─────────────────────────────────────────────────────────────
  console.log('Creating accounts payable...');
  const creditPurchases = savedPurchases.filter((p) => p.isCredit).slice(0, 2);

  for (const purchase of creditPurchases) {
    const existing = await apRepo.findOne({ where: { tenantId: tenant.id, purchaseId: purchase.id } });
    if (!existing) {
      const dueDate = purchase.dueDate
        ? new Date(purchase.dueDate)
        : new Date(new Date(purchase.purchaseDate).getTime() + 30 * 24 * 60 * 60 * 1000);
      const ap = apRepo.create({
        tenantId: tenant.id,
        supplierId: purchase.supplierId ?? '',
        supplierName: purchase.supplierName,
        purchaseId: purchase.id,
        ncfNumber: purchase.ncfNumber,
        issueDate: purchase.purchaseDate,
        dueDate,
        amount: purchase.total,
        paidAmount: 0,
        balance: purchase.total,
        status: ApStatus.PENDING,
        notes: `Cuenta por pagar generada de compra ${purchase.ncfNumber}`,
      });
      await apRepo.save(ap);
      console.log(`  AP created for purchase ${purchase.ncfNumber} → RD$${Number(purchase.total).toLocaleString()}`);
    } else {
      console.log(`  AP for purchase ${purchase.ncfNumber} already exists, skipping`);
    }
  }

  await AppDataSource.destroy();
  console.log('\nSeed completed successfully!');
  console.log('═════════════════════════════════════════');
  console.log('SUPER ADMIN DE PLATAFORMA (FiscalRD)');
  console.log('─────────────────────────────────────────');
  console.log('Email:      saul@fiscalrd.do');
  console.log('Password:   FiscalRD2024!');
  console.log('Panel:      /admin');
  console.log('═════════════════════════════════════════');
  console.log('DEMO TENANT — El Caribe');
  console.log('─────────────────────────────────────────');
  console.log('RNC:        101234567');
  console.log('Owner:      admin@elcaribe.do / Admin123!');
  console.log('Dueno:      dueno@elcaribe.do / Dueno123!');
  console.log('Contador:   contador@elcaribe.do / Contador123!');
  console.log('Cajero:     cajero@elcaribe.do / Cajero123!');
  console.log('─────────────────────────────────────────');
}

async function main() {
  try {
    await runSeed();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();

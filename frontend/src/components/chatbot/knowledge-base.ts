// ─── Base de Conocimiento COMPLETA — FiscalRD Chatbot ───────────────────────

export type UserRole = 'owner' | 'admin' | 'cashier' | 'employee' | 'accountant' | 'super_admin' | string;

export interface KBEntry {
  id: string;
  keywords: string[];
  answer: string;
  roles?: UserRole[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — GENERAL / BIENVENIDA
// ═══════════════════════════════════════════════════════════════════════════════
const general: KBEntry[] = [
  {
    id: 'hello',
    keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'saludos', 'buenas noches'],
    answer: `¡Hola! 👋 Soy tu asistente de FiscalRD. Estoy aquí para guiarte paso a paso en todo lo que necesites.\n\nPuedes preguntarme sobre:\n• 🧾 Facturas y ventas\n• 🛒 Cómo usar el POS (punto de venta)\n• 📦 Inventario y productos\n• 📊 Reportes para la DGII\n• 💰 Contabilidad y gastos\n• 👷 Nómina y empleados\n• ❓ Cualquier duda sobre impuestos en RD\n\n¡Pregunta sin miedo! 😊`,
  },
  {
    id: 'help',
    keywords: ['ayuda', 'help', 'no se', 'no sé', 'como funciona', 'que hago', 'qué hago', 'no entiendo', 'explica', 'guia', 'guía', 'comenzar', 'empezar', 'inicio'],
    answer: `Con gusto te explico. FiscalRD te ayuda a manejar tu negocio cumpliendo con las leyes de República Dominicana.\n\n**Las 5 cosas más importantes que puedes hacer:**\n\n1️⃣ **Vender** → Emite facturas con número legal (NCF)\n2️⃣ **Comprar** → Registra lo que compras a proveedores\n3️⃣ **Inventario** → Controla cuánto tienes en existencia\n4️⃣ **Reportes DGII** → Declara al gobierno cada mes\n5️⃣ **Ver ganancias** → Sabe cuánto ganó tu negocio\n\n¿Sobre cuál quieres aprender primero?`,
  },
  {
    id: 'what-is-fiscalrd',
    keywords: ['que es fiscalrd', 'qué es fiscalrd', 'para que sirve', 'para qué sirve', 'sistema', 'que hace este sistema'],
    answer: `FiscalRD es un sistema de facturación y administración para negocios en República Dominicana. 🇩🇴\n\n**¿Por qué lo necesito?**\nPorque la ley dominicana exige que todo negocio con RNC:\n✅ Emita facturas con número NCF oficial\n✅ Reporte sus ventas y compras a la DGII cada mes\n✅ Pague el ITBIS (impuesto a las ventas)\n\n**¿Qué hace FiscalRD por ti?**\n✅ Genera los NCF automáticamente\n✅ Calcula el ITBIS en cada factura\n✅ Genera los reportes de la DGII con un clic\n✅ Lleva el inventario\n✅ Controla la caja diaria\n✅ Maneja la nómina de empleados\n✅ Muestra cuánto ganó el negocio\n\n**¿Qué es la DGII?**\nEs la Dirección General de Impuestos Internos. Es como el IRS en EEUU, pero de República Dominicana. Todos los negocios deben reportarles.`,
  },
  {
    id: 'primer-paso',
    keywords: ['primer paso', 'primero que hago', 'como empiezo', 'cómo empiezo', 'acabo de entrar', 'primera vez', 'nuevo en el sistema'],
    answer: `¡Bienvenido! Aquí van los primeros pasos para empezar con FiscalRD:\n\n**Paso 1 — Configura tu negocio**\n→ Ve a **Configuración** → Llena el nombre, RNC y dirección de tu negocio\n\n**Paso 2 — Agrega tus productos**\n→ Ve a **Productos** → Agrega los productos o servicios que vendes con sus precios\n\n**Paso 3 — Configura las secuencias NCF**\n→ Ve a **Secuencias NCF** → Verifica que tengas secuencias activas (E31, E32, etc.)\n\n**Paso 4 — Registra tus clientes principales**\n→ Ve a **Clientes** → Agrega los clientes que compran seguido\n\n**Paso 5 — ¡Empieza a vender!**\n→ Ve a **Ventas** → Nueva Venta, o usa el **POS** para ventas rápidas\n\n**Paso 6 — Abre la caja cada día**\n→ Ve a **Control de Caja** → Abrir Turno cada mañana`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — FACTURACIÓN / VENTAS
// ═══════════════════════════════════════════════════════════════════════════════
const sales: KBEntry[] = [
  {
    id: 'factura-como',
    keywords: ['como hago una factura', 'cómo hago una factura', 'nueva factura', 'crear factura', 'emitir factura', 'hacer factura', 'facturar', 'nueva venta'],
    answer: `Para hacer una factura:\n\n**1️⃣ Ve a Ventas → "Nueva Venta"**\n\n**2️⃣ Busca o selecciona el cliente**\n• Si tiene RNC → selecciónalo de la lista\n• Si no → deja "Consumidor Final"\n\n**3️⃣ Agrega los productos**\n• Escribe el nombre del producto y selecciónalo\n• O escanea el código de barras\n• Ajusta la cantidad si es necesario\n\n**4️⃣ Selecciona cómo paga**\n• Efectivo, Tarjeta, Transferencia o Crédito (fiado)\n\n**5️⃣ Elige el tipo de comprobante**\n• E31 → cliente empresa (con RNC)\n• E32 → cliente persona natural\n\n**6️⃣ Clic en "Emitir Factura"**\n\nEl NCF se asigna automáticamente. La factura queda registrada y se envía a la DGII. 🎉`,
  },
  {
    id: 'ncf-tipos',
    keywords: ['ncf', 'numero comprobante', 'número comprobante', 'comprobante fiscal', 'e31', 'e32', 'e33', 'e34', 'e41', 'e44', 'e45', 'tipos ncf', 'que ncf usar', 'qué ncf usar'],
    answer: `**Tipos de NCF (Números de Comprobante Fiscal):**\n\n• **E31** → Factura para negocios con RNC (empresa a empresa)\n• **E32** → Factura para personas físicas (consumidor final)\n• **E33** → Nota de débito (ajuste que aumenta el monto)\n• **E34** → Nota de crédito (devolución o descuento)\n• **E41** → Compras de bienes y servicios (para gastos menores)\n• **E43** → Gastos para el gobierno\n• **E44** → Regímenes especiales (exportaciones)\n• **E45** → Para compras al gobierno\n\n**¿Cuál uso más?**\nEn el 90% de los casos usarás E31 y E32.\n• E31 = cliente tiene RNC (negocio)\n• E32 = cliente no tiene RNC (persona)\n\n**¿Qué pasa si uso el tipo incorrecto?**\nLa DGII puede objetar la factura. El sistema te ayuda eligiendo el correcto según el cliente.`,
  },
  {
    id: 'itbis-que-es',
    keywords: ['itbis', 'impuesto', 'iva', '18%', '18 porciento', 'impuesto ventas', 'que es el itbis', 'qué es el itbis', 'como funciona itbis'],
    answer: `**¿Qué es el ITBIS?**\nEs el Impuesto a las Transferencias de Bienes Industrializados y Servicios — como el IVA en otros países. 💰\n\n**¿Cuánto es?**\n• Tasa general: **18%**\n• Productos exentos (0%): arroz, pollo fresco, leche, medicamentos, libros\n• Tasa reducida (16%): algunos servicios de telecomunicaciones\n\n**Ejemplo:**\nProducto: RD$1,000\nITBIS 18%: RD$180\nTotal al cliente: **RD$1,180**\n\n⚠️ Los RD$180 NO son tuyos — los cobras para pagárselos a la DGII.\n\n**¿Cuándo se paga?**\nAntes del día 20 de cada mes, en el formulario IT-1.\n\n**¿Cómo lo calcula el sistema?**\nAutomáticamente. Cuando agregas un producto marcado con 18% ITBIS, el sistema lo calcula solo en cada factura.\n\n**Truco importante:**\nEl ITBIS que TÚ pagas en tus compras se puede descontar del que cobras en ventas. Por eso debes registrar bien tus compras.`,
  },
  {
    id: 'ver-facturas',
    keywords: ['ver facturas', 'mis facturas', 'historial facturas', 'lista facturas', 'facturas emitidas', 'buscar factura', 'buscar venta'],
    answer: `**Para ver todas tus facturas:**\n\n→ Menú izquierdo → **Ventas**\n\nAhí verás la lista de todas las facturas. Puedes:\n• 🔍 **Buscar** por nombre del cliente o número NCF\n• 📅 **Filtrar** por fecha o estado\n• 👁️ **Ver detalle** haciendo clic en cualquier factura\n• 🖨️ **Imprimir** la factura en formato A4 o recibo 80mm\n• 📧 **Enviar por email** al cliente\n• 🔄 **Reintentar envío a DGII** si salió "NO_ENVIADO"\n\n**Estados de factura:**\n• 🟡 Borrador → creada, aún no emitida\n• 🟢 Emitida → tiene NCF, es válida legalmente\n• 🔴 Anulada → cancelada, el NCF queda registrado como anulado\n\n**¿Qué es "DGII: NO_ENVIADO"?**\nLa factura es válida, pero no se transmitió electrónicamente. Pasa cuando no hay API de Alanube configurada.`,
  },
  {
    id: 'cancelar-anular-factura',
    keywords: ['cancelar factura', 'anular factura', 'borrar factura', 'eliminar factura', 'como anulo', 'como cancelo'],
    answer: `**¿Cómo anulo una factura?**\n\nNo se puede borrar — la ley no lo permite. Se anula y queda registrado el NCF.\n\n**Pasos para anular:**\n1. Ve a Ventas → busca la factura\n2. Ábrela → clic en **"Anular"**\n3. Escribe el motivo (opcional)\n4. Confirma\n\nEl NCF queda registrado como anulado y aparece en el **Reporte 608** de la DGII automáticamente.\n\n**¿Y si quiero hacer una devolución parcial?**\n→ Usa la **Nota de Crédito (E34)**:\n1. Abre la factura original\n2. Clic en **"Devolución"**\n3. Selecciona qué productos devuelven y en qué cantidad\n4. El sistema genera un E34 automáticamente\n\n**¿Cuánto tiempo tengo para anular?**\nLa DGII exige reportar las anulaciones del mes en el Formulario 608 antes del día 20 del mes siguiente.`,
  },
  {
    id: 'fiado-credito-venta',
    keywords: ['fiado', 'credito', 'crédito', 'cuenta pendiente', 'vender fiado', 'cobrar despues', 'cobrar después', 'venta credito', 'venta crédito'],
    answer: `**Venta a crédito (fiado)** — cuando el cliente paga después\n\n**¿Cómo hacerlo?**\n1. Crea la factura normal en Ventas o POS\n2. En método de pago → selecciona **"Crédito"**\n3. El cliente debe estar registrado con su nombre\n4. Emite la factura\n\n**¿Dónde queda la deuda?**\n→ Menú → **Cuentas x Cobrar**\nAhí ves cuánto debe cada cliente y desde cuándo.\n\n**¿Cuándo el cliente paga?**\n1. Ve a Cuentas x Cobrar\n2. Busca al cliente\n3. Clic en **"Registrar Pago"**\n4. Escribe el monto pagado y el método\n5. Confirma → la deuda se reduce\n\n**Límite de crédito:**\nPuedes ponerle un tope a cada cliente. Si lo supera, el sistema bloquea la venta y avisa.\n\n**Consejo:** Revisa las Cuentas por Cobrar cada lunes. El dinero que te deben está "dormido" hasta que lo cobras.`,
  },
  {
    id: 'descuento-factura',
    keywords: ['descuento', 'aplicar descuento', 'como descuento', 'descuento factura', 'precio especial'],
    answer: `**¿Cómo aplicar un descuento en una factura?**\n\nAl crear la factura, en cada línea de producto puedes:\n• Cambiar el precio unitario manualmente\n• O agregar un porcentaje de descuento (si el campo está disponible)\n\n**Para descuentos especiales a clientes frecuentes:**\nPuedes simplemente bajar el precio del producto en el momento de la venta.\n\n**Nota importante:**\nEl ITBIS se calcula sobre el precio con descuento, no sobre el precio original. Eso es correcto según la ley.\n\n**Ejemplo:**\nProducto: RD$1,000 → descuento 10% → precio RD$900\nITBIS 18% sobre RD$900 = RD$162\nTotal: RD$1,062`,
  },
  {
    id: 'enviar-factura-email',
    keywords: ['enviar factura', 'enviar por email', 'mandar factura', 'email factura', 'factura por correo'],
    answer: `**¿Cómo enviar una factura por email al cliente?**\n\n**Forma 1 — Automática (al emitir):**\nSi el cliente tiene email registrado, al emitir la factura se le envía automáticamente.\n\n**Forma 2 — Manual:**\n1. Ve a Ventas\n2. Abre la factura\n3. Clic en el botón **"Enviar por Email"**\n4. Confirma el email del destinatario\n5. Clic en enviar\n\nEl cliente recibirá un email con el link para ver su factura en línea (sin necesidad de tener cuenta en FiscalRD).\n\n**¿Qué ve el cliente?**\nUna factura con todos los detalles, código QR para validar en la DGII, y opción de imprimir.\n\n**¿El sistema configura el email solo?**\nSí, el sistema usa el servicio de email automáticamente. No necesitas configurar nada.`,
  },
  {
    id: 'cotizacion',
    keywords: ['cotizacion', 'cotización', 'presupuesto', 'proforma', 'como hago cotizacion', 'crear cotizacion'],
    answer: `**¿Cómo hacer una cotización (presupuesto)?**\n\n→ Menú → **Cotizaciones** → "Nueva Cotización"\n\n**¿Para qué sirve?**\nPara enviarle al cliente el precio antes de que decida comprar. La cotización NO tiene NCF ni compromete impuestos.\n\n**Pasos:**\n1. Agrega los productos o servicios\n2. Escribe el nombre del cliente\n3. Opcional: fecha de vencimiento de la cotización\n4. Clic en "Guardar"\n5. Puedes imprimirla o enviarla por email\n\n**Cuando el cliente acepta:**\n1. Abre la cotización\n2. Clic en **"Convertir a Venta"**\n3. El sistema crea la factura automáticamente con todos los datos\n4. Solo tienes que emitirla\n\n**¿Las cotizaciones cuentan para la DGII?**\nNo. Solo las facturas emitidas (con NCF) cuentan para los reportes.`,
  },
  {
    id: 'imprimir-factura',
    keywords: ['imprimir factura', 'imprimir recibo', 'ticket', 'recibo termico', 'recibo térmico', '80mm', 'impresora', 'como imprimo'],
    answer: `**¿Cómo imprimir una factura?**\n\n**Factura normal (A4):**\n1. Ve a Ventas → abre la factura\n2. Clic en **"Imprimir"**\n3. Sale el formato completo en A4\n\n**Recibo térmico (80mm para impresoras POS):**\n1. Ve a Ventas → abre la factura\n2. Clic en **"Recibo Térmico 80mm"**\n3. Imprime en tu impresora de recibos\n\n**En el POS:**\nDespués de cobrar, el sistema pregunta automáticamente si quieres imprimir el recibo.\n\n**Mi impresora no funciona:**\n• Verifica que esté conectada y encendida\n• El sistema imprime usando el diálogo de impresión del navegador\n• Asegúrate de seleccionar la impresora correcta\n\n**Tip:** Para impresoras térmicas, usa el formato 80mm que tiene el tamaño exacto del papel de rollo.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — POS / PUNTO DE VENTA (ESPECIALMENTE PARA CAJERAS)
// ═══════════════════════════════════════════════════════════════════════════════
const pos: KBEntry[] = [
  {
    id: 'pos-que-es',
    keywords: ['pos', 'punto de venta', 'pantalla venta', 'vender rapido', 'vender rápido', 'como vendo', 'cómo vendo'],
    answer: `**El POS (Punto de Venta)** es la pantalla para vender rápido — como la caja de un supermercado. 🛒\n\n**¿Cómo entrar al POS?**\n→ En el menú superior, clic en **"POS"** o **"Vender"**\n\n**Pantalla del POS tiene 3 partes:**\n• **Izquierda** → Lista de productos para buscar y agregar\n• **Centro/Derecha** → El carrito (lo que va a comprar el cliente)\n• **Abajo** → Botón COBRAR\n\n**¿Cómo vendo?**\n1. Busca el producto (escribe el nombre o escanea el código)\n2. Clic en el producto → se agrega al carrito\n3. Ajusta la cantidad si necesitas\n4. Selecciona cómo paga (efectivo, tarjeta, transferencia, fiado)\n5. Clic en **COBRAR**\n6. Listo — sale el recibo\n\n**¿Diferencia entre POS y Ventas?**\n• POS → para ventas rápidas, muchas por día (colmados, farmacias)\n• Ventas → para facturas detalladas, clientes con RNC`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'abrir-caja',
    keywords: ['abrir caja', 'abrir turno', 'inicio turno', 'iniciar caja', 'comenzar turno', 'abrir sesion', 'fondo de caja', 'como abro'],
    answer: `**Abrir la caja — Lo primero del día** 🌅\n\n1. Ve al menú → **Control de Caja**\n2. Clic en **"Abrir Turno"**\n3. El sistema te pregunta: **¿Cuánto dinero tienes en la caja ahora?**\n   → Cuenta el efectivo físico y escribe el monto (ej: RD$2,000)\n   → Este es el "fondo de caja" o capital inicial\n4. Clic en Confirmar → ¡Ya puedes vender!\n\n**¿Por qué es importante contar el dinero al abrir?**\nPara que al cerrar el día, el sistema pueda comparar cuánto había al inicio vs cuánto hay ahora, y ver si cuadra con las ventas del día.\n\n**¿Qué pasa si no abro la caja?**\nPuedes seguir vendiendo pero no tendrás el reporte de cuadre al final del día. Es mala práctica.\n\n**¿Cuándo abro la caja?**\nCada mañana, antes de atender el primer cliente.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cerrar-caja',
    keywords: ['cerrar caja', 'cierre caja', 'cerrar turno', 'fin turno', 'cuadre caja', 'cuadrar caja', 'z report', 'informe cierre', 'como cierro'],
    answer: `**Cerrar la caja — Al final del día** 🌙\n\n1. Ve a **Control de Caja**\n2. Clic en **"Cerrar Turno"**\n3. Cuenta TODO el efectivo que tienes físicamente en la caja\n4. Escribe ese monto en el campo "Efectivo real"\n5. El sistema muestra:\n   • 💰 **Lo que debería haber** (fondo inicial + ventas en efectivo - gastos)\n   • 💵 **Lo que contaste** (lo que escribiste)\n   • ±📊 **Diferencia** (sobrante o faltante)\n6. Confirma el cierre\n\n**¿Qué muestra el reporte de cierre?**\n• Total ventas por método de pago (efectivo, tarjeta, transferencia)\n• Total de gastos registrados\n• Total de retiros\n• Diferencia de caja\n\n**¿Qué hago si hay diferencia?**\n• Sobrante → Revisas si diste mal el cambio alguna vez\n• Faltante → Puede ser un error o que alguien tomó sin registrar\n\n**¿Puedo cerrar sin contar?**\nSí, pero no sabrás si cuadra. No es recomendable.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cobrar-efectivo',
    keywords: ['cobrar efectivo', 'pago efectivo', 'pagar en efectivo', 'cash', 'como cobro efectivo', 'cambio', 'devolver cambio'],
    answer: `**Cobrar en efectivo en el POS:**\n\n1. Arma el carrito con los productos\n2. En método de pago → selecciona **"Efectivo"**\n3. Escribe cuánto te dio el cliente (ej: te dio RD$1,000, la compra es RD$850)\n4. El sistema calcula automáticamente el **cambio: RD$150**\n5. Clic en COBRAR\n6. Dale el cambio al cliente\n\n**¿El sistema me dice el cambio?**\nSí. Cuando escribes el monto recibido, aparece automáticamente cuánto debes devolver.\n\n**Tip:** Si el cliente te da el monto exacto, solo presiona COBRAR sin escribir nada.\n\n**¿Qué pasa si me equivoco?**\nPuedes cancelar la venta antes de cobrar y volver a empezar. Una vez confirmada, si hubo error, habla con el administrador para anularla.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cobrar-tarjeta',
    keywords: ['cobrar tarjeta', 'pago tarjeta', 'tarjeta credito', 'tarjeta débito', 'tarjeta debito', 'visa', 'mastercard', 'datafono', 'datafóno', 'pos bancario'],
    answer: `**Cobrar con tarjeta:**\n\n1. En el POS, arma el carrito\n2. En método de pago → selecciona **"Tarjeta"**\n3. En el datafono (POS bancario) cobra el monto\n4. Cuando el datafono aprueba, clic en **COBRAR** en FiscalRD\n\n**Importante:**\nFiscalRD NO procesa la tarjeta directamente — eso lo hace tu datafono bancario. FiscalRD solo registra que el pago fue con tarjeta.\n\n**¿Qué databanco usan?**\n• Banreservas, BHD, Popular, Scotiabank, etc. tienen su propio datafono\n• El cargo de comisión (1.5%-3%) lo maneja el banco, no FiscalRD\n\n**En el reporte de caja:**\nLas ventas con tarjeta aparecen separadas de las de efectivo. El dinero de tarjeta va directo a tu cuenta bancaria.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cobrar-transferencia',
    keywords: ['transferencia', 'cobrar transferencia', 'pago transferencia', 'transferencia bancaria', 'pago movil', 'pago móvil', 'azul', 'tpago'],
    answer: `**Cobrar por transferencia o pago móvil:**\n\n1. El cliente te hace la transferencia (por banca en línea, Azul, tPago, etc.)\n2. Verifica que recibiste el dinero (revisa tu app bancaria)\n3. En el POS → método de pago → **"Transferencia"**\n4. Clic en COBRAR\n\n**¿Tengo que esperar que llegue la transferencia?**\nSí. No registres el pago hasta no confirmar que llegó.\n\n**¿Cómo verifico que llegó?**\n• Revisa tu app del banco\n• O espera el SMS de confirmación\n• Las transferencias entre mismo banco son inmediatas\n• Entre bancos diferentes pueden tardar hasta 24 horas\n\n**En el reporte de caja:**\nLas transferencias aparecen separadas del efectivo. No cuentan para el efectivo físico de la caja.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'buscar-producto-pos',
    keywords: ['buscar producto', 'no encuentro producto', 'como busco', 'producto no aparece', 'buscar en pos'],
    answer: `**¿Cómo buscar un producto en el POS?**\n\n**Opción 1 — Escribir el nombre:**\n→ En el campo de búsqueda, escribe las primeras letras\n→ Aparecen los productos que coinciden\n→ Clic en el que quieres\n\n**Opción 2 — Código de barras:**\n→ Escanea el código con el escáner\n→ El producto aparece automáticamente en el carrito\n\n**¿El producto no aparece?**\nPuede ser que:\n• El producto no está registrado en el sistema\n• Está registrado como inactivo\n• El código de barras no coincide\n\n**Solución:**\n→ Ve a **Productos** → busca el producto → actívalo o agrégalo\n→ Si ya existe, verifica que tenga el código de barras correcto\n\n**¿Puedo vender algo que no está en el sistema?**\nPuedes escribir el nombre manual y el precio, pero es mejor tenerlo registrado para llevar el inventario correcto.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'eliminar-del-carrito',
    keywords: ['quitar producto carrito', 'eliminar carrito', 'borrar carrito', 'limpiar carrito', 'equivoque producto', 'equivoqué producto'],
    answer: `**¿Cómo quitar un producto del carrito?**\n\n• Busca el producto en el carrito (lado derecho del POS)\n• Clic en el ícono de **basura 🗑️** o el botón de eliminar al lado del producto\n• También puedes cambiar la cantidad a 0\n\n**¿Cómo limpiar todo el carrito y empezar de nuevo?**\n→ Busca el botón **"Limpiar"** o **"Cancelar"** en el POS\n→ Confirma que quieres borrar todo\n\n**¿Ya cobré y el producto estaba mal?**\nSi ya confirmaste la venta, no puedes editarla. Debes:\n1. Anular la factura (si es posible)\n2. O hacer una nota de crédito (devolución) por la diferencia`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'offline-modo',
    keywords: ['sin internet', 'se fue el internet', 'offline', 'no hay internet', 'se cayo el internet', 'sin conexion', 'sin conexión', 'luz se fue', 'que hago sin internet'],
    answer: `**¡Sin internet el POS sigue funcionando!** 📴\n\n**¿Qué pasa cuando se va el internet?**\n→ Aparece un banner amarillo arriba: ⚠️ "Sin internet — Modo offline activo"\n→ Puedes seguir cobrando normal\n→ Las ventas se guardan en tu dispositivo temporalmente\n\n**¿Cómo sé si estoy en modo offline?**\nEl banner amarillo te avisa. Mientras no salga ese banner, tienes internet.\n\n**¿Los precios y productos siguen disponibles?**\nSí. El sistema guardó todos los productos cuando había internet.\n\n**Cuando vuelve el internet:**\n→ Aparece un banner verde: "Internet restaurado — sincronizando..."\n→ Las ventas se envían automáticamente al servidor\n→ El inventario se actualiza solo\n\n**¿Qué NO puedo hacer offline?**\n• Ver si el cliente superó su límite de crédito\n• Ver el stock actualizado en tiempo real\n• Transmitir a la DGII (se hace cuando vuelve internet)\n\n**¿Se pueden perder las ventas offline?**\nNo, siempre que no borres el navegador ni el historial.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'escaner-codigo',
    keywords: ['scanner', 'escáner', 'escanear', 'codigo de barras', 'código de barras', 'pistola', 'lector barras', 'barcode', 'como uso escaner'],
    answer: `**¿Cómo usar el escáner de código de barras?**\n\n**Conectar el escáner:**\n1. Conecta el escáner al computador (USB)\n2. No necesita instalar nada especial — funciona como si fuera un teclado\n\n**Usar en el POS:**\n1. Abre el POS\n2. Haz clic en el campo de búsqueda de productos\n3. Apunta el escáner al código de barras del producto\n4. El escáner lo lee automáticamente → el producto aparece en el carrito\n\n**El producto no aparece al escanear:**\n• El código no está registrado en el sistema\n• Solución: ve a **Productos** → edita el producto → agrega el código de barras\n\n**¿Cómo sé qué código tiene mi producto?**\nEs el número debajo de las rayitas negras en el empaque del producto.\n\n**¿Funciona con escáner Bluetooth?**\nSí, si está bien pareado con el dispositivo.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'seleccionar-cliente-pos',
    keywords: ['seleccionar cliente pos', 'buscar cliente pos', 'cliente en el pos', 'como selecciono cliente', 'registrar cliente pos'],
    answer: `**¿Cómo seleccionar un cliente en el POS?**\n\n**Para clientes que pagan al momento:**\n→ No necesitas seleccionar cliente → aparecerá como "Consumidor Final"\n\n**Para clientes con fiado o con RNC:**\n1. En el POS busca el campo "Buscar cliente"\n2. Escribe el nombre o RNC del cliente\n3. Selecciónalo de la lista\n4. La venta queda asociada a ese cliente\n\n**¿Y si el cliente no está en el sistema?**\n1. Puedes registrarlo rápido desde el POS\n2. O ir a Clientes → agregar cliente → volver al POS\n\n**¿Por qué es importante seleccionar el cliente?**\n• Para venta fiada (crédito) → es obligatorio\n• Para factura con RNC → necesitas el RNC del cliente\n• Para llevar historial de compras del cliente`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'error-cobrar-pos',
    keywords: ['error al cobrar', 'no puedo cobrar', 'boton cobrar desactivado', 'botón cobrar gris', 'no funciona cobrar', 'no me deja cobrar'],
    answer: `**¿El botón COBRAR no funciona o está desactivado?**\n\nPosibles causas:\n\n**1. El carrito está vacío**\n→ Agrega al menos un producto\n\n**2. El cliente superó su límite de crédito**\n→ Solo pasa si elegiste pago "Crédito"\n→ El cliente tiene una deuda mayor a su límite\n→ Solución: que pague primero su deuda, o usa otro método de pago\n\n**3. No has abierto la caja**\n→ Ve a Control de Caja → Abrir Turno\n\n**4. Hay un error de conexión**\n→ Verifica que tienes internet (o el modo offline está activo)\n\n**5. El producto tiene precio en 0**\n→ Verifica el precio del producto en el catálogo\n\n**¿Sigue sin funcionar?**\nRecarga la página (F5) e intenta de nuevo. Si persiste, habla con el administrador.`,
    roles: ['cashier', 'owner', 'admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════
const inventory: KBEntry[] = [
  {
    id: 'inventario-que-es',
    keywords: ['inventario', 'stock', 'productos disponibles', 'cuantos tengo', 'cuántos tengo', 'existencias', 'control inventario'],
    answer: `**Inventario** — controla cuánto tienes de cada producto 📦\n\n→ Menú → **Inventario**\n\n**¿Qué ves?**\n• Stock actual de cada producto\n• Alertas de productos agotados o bajos\n• Historial de entradas y salidas\n\n**¿Cómo se actualiza el inventario?**\n✅ Cada venta → descuenta el stock automáticamente\n✅ Cada compra registrada → suma el stock automáticamente\n✅ Puedes ajustar manualmente si hay diferencias\n\n**Alertas de stock bajo:**\n→ En el Dashboard verás una alerta amarilla\n→ El sistema te manda email cuando baja del mínimo\n\n**¿Qué es el stock mínimo?**\nEs la cantidad mínima que decides tener. Si bajas de ahí, el sistema te avisa para que compres más.\n\n**Ejemplo:** Si tienes arroz y pones stock mínimo = 10 sacos, cuando queden 9 o menos el sistema te avisa.`,
  },
  {
    id: 'agregar-producto',
    keywords: ['agregar producto', 'nuevo producto', 'crear producto', 'añadir producto', 'registrar producto', 'como agrego producto'],
    answer: `**Agregar un producto nuevo:**\n\n→ Menú → **Productos** → "+ Nuevo Producto"\n\n**Campos a llenar:**\n• **Nombre** → ej: "Arroz Selecto 5 lbs"\n• **Precio de venta** → lo que le cobras al cliente\n• **Costo** → lo que te costó (para calcular tu ganancia)\n• **ITBIS** → ¿aplica el 18%? (arroz básico: No, bebidas: Sí)\n• **Stock inicial** → cuántos tienes ahora\n• **Stock mínimo** → cuándo quieres que te avisen\n• **Código de barras** → opcional, para el escáner\n• **Categoría** → para organizar (Bebidas, Lácteos, etc.)\n\n**Tipo de producto:**\n• **Físico** → tiene inventario (arroz, cerveza, jabón)\n• **Servicio** → no tiene inventario (corte de pelo, reparación)\n\n**¿Puedo importar productos masivamente?**\nActualmente se agregan uno por uno. Si tienes muchos, hazlo en sesiones pequeñas.`,
  },
  {
    id: 'ajuste-inventario',
    keywords: ['ajuste inventario', 'corregir stock', 'ajustar stock', 'stock incorrecto', 'inventario mal', 'diferencia inventario', 'fisico vs sistema'],
    answer: `**¿Cómo corregir el inventario cuando no cuadra con lo físico?**\n\n→ Menú → **Inventario** → busca el producto → **"Ajuste Manual"**\n\n**Pasos:**\n1. Busca el producto con stock incorrecto\n2. Clic en "Ajuste Manual" o el ícono de edición\n3. Escribe la cantidad REAL que tienes físicamente\n4. El sistema registra el ajuste con fecha y hora\n5. Confirma\n\n**¿Por qué puede haber diferencias?**\n• Productos vencidos o rotos que no se registraron\n• Robos o merma\n• Ventas que no se registraron correctamente\n• Error en el inventario inicial\n\n**¿El ajuste queda registrado?**\nSí. En el historial de movimientos puedes ver todos los ajustes con fecha y usuario.\n\n**¿Cada cuánto debo hacer inventario físico?**\nLo recomendado es una vez al mes para negocios pequeños.`,
  },
  {
    id: 'producto-negativo',
    keywords: ['stock negativo', 'inventario negativo', 'menos de cero', 'producto en negativo', 'como quedo negativo'],
    answer: `**¿Por qué el stock de un producto está en negativo?**\n\nPasa cuando se vendieron más unidades de las que el sistema tenía registradas.\n\n**Causas comunes:**\n• El inventario inicial no se configuró bien\n• Se hicieron ventas antes de registrar las compras\n• Alguien vendió manualmente sin registrar en el sistema\n\n**¿Cómo corregirlo?**\n1. Ve a **Inventario** → busca el producto\n2. Haz un **Ajuste Manual** con la cantidad real que tienes físicamente\n3. Si tienes 50 unidades físicas, escribe 50 — el sistema corrige\n\n**¿Afecta las facturas ya emitidas?**\nNo. Las facturas ya emitidas están bien. Solo se corrige el conteo de inventario.\n\n**Prevención:**\nSiempre registra las compras ANTES o al mismo tiempo que empiezas a vender esos productos.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — COMPRAS Y PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════════
const purchases: KBEntry[] = [
  {
    id: 'registrar-compra',
    keywords: ['registrar compra', 'nueva compra', 'compra proveedor', 'factura proveedor', 'como registro compra', 'compras', 'recibi mercancia', 'recibí mercancía'],
    answer: `**¿Cómo registrar una compra a un proveedor?**\n\n→ Menú → **Compras** → "Nueva Compra"\n\n**Datos necesarios:**\n• Nombre del proveedor\n• **RNC del proveedor** (9 dígitos — está en su factura)\n• Número de NCF de la factura que te dieron\n• Fecha de la compra\n• Productos comprados y sus precios\n• ¿Pagaste al contado o a crédito?\n\n**Después de llenar todo:**\n→ Clic en "Confirmar Compra"\n→ El stock se actualiza automáticamente\n→ Aparece en el Reporte 606 de la DGII\n\n**¿Por qué es importante el RNC del proveedor?**\nSin el RNC, el ITBIS que pagaste en esa compra NO puede descontarse del ITBIS que debes a la DGII. Siempre pídele la factura formal al proveedor.\n\n**¿Y si el proveedor no da factura?**\nAsegúrate de pedirla. Si no la dan, esa compra no te sirve como crédito de ITBIS.`,
  },
  {
    id: 'credito-proveedor',
    keywords: ['compra a credito', 'compra a crédito', 'debo al proveedor', 'cuentas por pagar', 'pagar proveedor', 'deuda proveedor'],
    answer: `**Compras a crédito — cuando le quedas a deber al proveedor**\n\nAl registrar la compra, si marcas "A crédito", la deuda queda en **Cuentas por Pagar**.\n\n→ Menú → **Cuentas x Pagar**\n\nAhí puedes ver:\n• Cuánto le debes a cada proveedor\n• Desde cuándo\n• Si está vencido el pago\n\n**¿Cómo registrar el pago?**\n1. Ve a Cuentas x Pagar\n2. Busca al proveedor\n3. Clic en "Registrar Pago"\n4. Escribe cuánto pagaste y cómo (efectivo, transferencia)\n5. La deuda se reduce automáticamente\n\n**¿Afecta la contabilidad?**\nSí. Cada pago crea automáticamente el asiento contable correspondiente.\n\n**Consejo:** Paga a tus proveedores a tiempo para mantener buenas relaciones y no perder crédito comercial.`,
  },
  {
    id: 'proveedor-rnc',
    keywords: ['proveedor', 'proveedores', 'suplidores', 'suplidor', 'agregar proveedor', 'rnc proveedor', 'donde esta rnc proveedor'],
    answer: `**¿Cómo encontrar el RNC de un proveedor?**\n\nEl RNC aparece en la factura que te da el proveedor. Busca un número de 9 dígitos que dice "RNC:" o "R.N.C."\n\n**Proveedores comunes en RD y sus RNC:**\n• Corripio: búscalo en su factura\n• Bravo: búscalo en su factura\n• La Cadena: búscalo en su factura\n• Ambar: búscalo en su factura\n\n**¿Dónde más busco el RNC?**\n→ Portal DGII: ve a dgii.gov.do → Consultas → Consulta de RNC\n→ Escribe el nombre de la empresa y te muestra el RNC\n\n**¿Qué hago si el proveedor no me da factura con RNC?**\nPuede ser que sea un vendedor informal. En ese caso, la compra no puede usarse como crédito de ITBIS. Siempre exige factura formal.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════
const customers: KBEntry[] = [
  {
    id: 'agregar-cliente',
    keywords: ['agregar cliente', 'nuevo cliente', 'registrar cliente', 'crear cliente', 'clientes', 'como agrego cliente'],
    answer: `**¿Cómo registrar un cliente?**\n\n→ Menú → **Clientes** → "+ Nuevo Cliente"\n\n**Datos del cliente:**\n• **Nombre completo** del cliente o empresa\n• **RNC o Cédula** → si necesita factura legal\n• **Teléfono** → para contacto y para enviarle recibos por WhatsApp\n• **Email** → para enviarle facturas automáticamente\n• **Límite de crédito** → si le vas a fiar, el máximo que puede deber\n• **Dirección** → opcional\n\n**¿Cuándo DEBO registrar un cliente?**\n• Si le vas a fiar (venta a crédito) → obligatorio\n• Si quiere factura con su RNC → obligatorio\n• Si quiere recibir sus facturas por email\n\n**¿Cuándo NO necesito registrarlo?**\n• Ventas pequeñas en efectivo sin factura especial\n• Clientes que pagan y no vuelven seguido\n→ En esos casos usa "Consumidor Final"`,
  },
  {
    id: 'limite-credito-cliente',
    keywords: ['limite credito', 'límite crédito', 'credito cliente', 'bloquear cliente', 'cliente excede limite', 'cuanto puede deber'],
    answer: `**¿Cómo funciona el límite de crédito?**\n\nEs el monto máximo que un cliente puede deber. Si lo supera, el sistema **bloquea la venta**.\n\n**¿Cómo configurarlo?**\n1. Ve a Clientes\n2. Abre el cliente\n3. En el campo "Límite de crédito" escribe el monto (ej: RD$5,000)\n4. Guarda\n\n**¿Qué pasa cuando llega al límite?**\n→ En el POS, el botón COBRAR se desactiva\n→ Aparece el mensaje: "Cliente ha excedido su límite de crédito"\n→ La cajera no puede completar la venta a crédito\n\n**¿Cómo venderle de todas formas?**\n• El cliente debe pagar parte de su deuda primero\n• O pagas en efectivo/tarjeta en vez de crédito\n• O el dueño sube temporalmente el límite\n\n**¿Dónde veo cuánto debe actualmente?**\n→ Menú → Cuentas x Cobrar → busca el cliente`,
  },
  {
    id: 'historial-cliente',
    keywords: ['historial cliente', 'compras cliente', 'ver compras cliente', 'que compro el cliente'],
    answer: `**¿Cómo ver el historial de compras de un cliente?**\n\n1. Ve a Clientes\n2. Busca y abre el cliente\n3. Verás el historial de todas sus compras\n\n**¿Qué puedes ver?**\n• Todas las facturas emitidas a ese cliente\n• Montos y fechas\n• Si tiene deuda pendiente\n• Estado de cada factura\n\n**¿Puedo imprimir el estado de cuenta de un cliente?**\nDesde Cuentas x Cobrar puedes ver el detalle de su deuda.\n\n**Uso práctico en colmado:**\nSi un cliente regular dice "yo pagué eso", puedes verificar en su historial si realmente se registró el pago.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 7 — DGII / REPORTES FISCALES
// ═══════════════════════════════════════════════════════════════════════════════
const dgii: KBEntry[] = [
  {
    id: 'reportes-dgii',
    keywords: ['reporte dgii', 'reportes dgii', 'declaracion', 'declaración', 'formulario dgii', 'como declaro', 'cómo declaro', 'obligaciones fiscales'],
    answer: `**Reportes DGII — Lo que debes entregar cada mes** 📋\n\n→ Menú → **Reportes DGII**\n\n**Los reportes principales:**\n\n• **606** → Registro de Compras (lo que compraste ese mes)\n• **607** → Registro de Ventas (lo que vendiste ese mes)\n• **608** → NCFs Anulados (facturas que cancelaste)\n• **623** → Retenciones (si le retuviste impuesto a alguien)\n• **IT-1** → Declaración mensual de ITBIS\n\n**¿Cómo se generan?**\n1. Selecciona el año y mes\n2. Clic en "Generar Reportes"\n3. El sistema lo calcula automáticamente con tus ventas y compras\n4. Descarga el archivo .txt\n5. Súbelo al portal de la DGII\n6. Marca "Enviado" en FiscalRD\n\n**¿Cuándo debo presentarlos?**\nAntes del **día 20 de cada mes** (por el mes anterior)`,
  },
  {
    id: 'it1-declaracion',
    keywords: ['it1', 'it-1', 'declaracion itbis', 'declaración itbis', 'formulario it1', 'pago itbis', 'como pago itbis', 'cuanto pago itbis'],
    answer: `**IT-1 — Declaración mensual de ITBIS** 📊\n\nEs el formulario más importante. Se presenta antes del día 20 de cada mes.\n\n**¿Qué dice el IT-1?**\n• ITBIS que cobraste en ventas (lo que debes)\n• ITBIS que pagaste en compras (lo que puedes descontar)\n• Diferencia = lo que le pagas a la DGII\n\n**Ejemplo:**\nVentas del mes: RD$100,000 → ITBIS cobrado: RD$18,000\nCompras del mes: RD$50,000 → ITBIS pagado: RD$9,000\nDiferencia: RD$18,000 - RD$9,000 = **RD$9,000 a pagar a la DGII**\n\n**¿Cómo lo genero?**\n→ Reportes DGII → pestaña IT-1 → selecciona mes → genera\n→ También puedes ver el IT-1 Anual (resumen de 12 meses)\n\n**¿Dónde se paga?**\n→ En el portal virtual.dgii.gov.do o en cualquier banco\n\n**¿Y si no debo nada?**\nDebes presentar el IT-1 de todas formas aunque sea en cero.`,
  },
  {
    id: 'reporte-606',
    keywords: ['reporte 606', '606', 'registro compras', 'compras dgii', 'formulario 606'],
    answer: `**Reporte 606 — Registro de Compras**\n\nEs la lista de todo lo que compraste a proveedores en el mes, con sus NCF.\n\n**¿Qué incluye?**\n• RNC del proveedor\n• Número de NCF de la factura del proveedor\n• Fecha y monto de cada compra\n• ITBIS de cada compra\n\n**¿Para qué sirve?**\n→ La DGII cruza tu 606 con el 607 de tu proveedor\n→ Si no cuadran, la DGII puede objetar tus créditos de ITBIS\n\n**¿Cómo se genera en FiscalRD?**\n→ Reportes DGII → pestaña 606 → selecciona mes → Generar\n→ Descarga el .txt y súbelo al portal DGII\n\n**¿Qué pasa si no lo presento?**\nLa DGII puede penalizarte y no reconocerte el crédito de ITBIS de tus compras. Pagarías más impuesto del que debes.`,
  },
  {
    id: 'reporte-607',
    keywords: ['reporte 607', '607', 'registro ventas', 'ventas dgii', 'formulario 607'],
    answer: `**Reporte 607 — Registro de Ventas**\n\nEs la lista de todas las facturas que emitiste en el mes.\n\n**¿Qué incluye?**\n• RNC del cliente (si aplica)\n• Número NCF de cada factura\n• Fecha y monto\n• ITBIS cobrado\n• Método de pago\n\n**¿Quiénes aparecen?**\n• Clientes con RNC → aparecen con su RNC\n• Consumidor Final → aparece como tal\n\n**¿Se genera solo?**\nSí. Cada factura que emites en FiscalRD se agrega automáticamente al 607.\n\n**¿Cómo descargarlo?**\n→ Reportes DGII → 607 → selecciona mes → "Descargar .txt DGII"\n\n**Dato importante:**\nEl formato .txt que descarga FiscalRD ya está en el formato exacto que pide la DGII. Solo tienes que subirlo.`,
  },
  {
    id: 'reporte-608',
    keywords: ['reporte 608', '608', 'ncf anulados', 'facturas anuladas dgii', 'formulario 608'],
    answer: `**Reporte 608 — NCFs Anulados**\n\nEs la lista de todas las facturas que anulaste en el mes.\n\n**¿Por qué la DGII necesita saber las anuladas?**\nPorque cada NCF que se emite queda registrado. Si lo anulas, debes reportarlo para que no quede como una factura activa sin pagar impuestos.\n\n**¿Se genera automáticamente?**\nSí. Cada vez que anulas una factura en FiscalRD, automáticamente se agrega al 608 del mes.\n\n**¿Cómo descargarlo?**\n→ Reportes DGII → 608 → selecciona mes → "Descargar .txt"\n\n**¿Y si no anulé ninguna factura ese mes?**\nEl 608 saldrá vacío. Puedes no presentarlo si no tienes anulaciones.`,
  },
  {
    id: 'portal-dgii-como',
    keywords: ['portal dgii', 'virtual dgii', 'como subo reporte', 'donde declaro', 'dgii online', 'oficina virtual dgii'],
    answer: `**¿Cómo subir reportes al portal de la DGII?**\n\n**Paso 1 — Genera el archivo en FiscalRD:**\n→ Reportes DGII → elige el formulario (606, 607, etc.) → Descargar .txt\n\n**Paso 2 — Entra al portal:**\n→ Abre tu navegador\n→ Ve a: **virtual.dgii.gov.do**\n\n**Paso 3 — Inicia sesión:**\n→ Usa tu usuario y clave de la DGII\n→ Si no tienes, ve a dgii.gov.do → "Registro de usuario"\n\n**Paso 4 — Busca el formulario:**\n→ 607 = Reporte de Ventas\n→ 606 = Reporte de Compras\n→ IT-1 = Declaración ITBIS\n\n**Paso 5 — Sube el archivo:**\n→ Selecciona "Cargar archivo"\n→ Busca el .txt que descargaste\n→ Confirma el envío\n\n**Paso 6 — Regresa a FiscalRD:**\n→ Reportes DGII → clic en "Marcar enviado"\n\n**¿Cuesta algo?**\nDeclarar es GRATIS. Solo pagas el impuesto que corresponde.`,
  },
  {
    id: 'cuando-declarar',
    keywords: ['cuando declarar', 'cuándo declarar', 'fecha declaracion', 'fecha límite', 'fecha limite', 'plazo dgii', 'dia 20', 'vencimiento dgii'],
    answer: `**Fechas límite de la DGII** 📅\n\n• **Día 20 de cada mes** → IT-1 (declaración ITBIS)\n• **Día 20 de cada mes** → Formularios 606, 607, 608\n• **Mes de abril** → ISR Anual (impuesto sobre la renta)\n• **Mensual** → TSS (seguridad social de empleados)\n\n**¿Qué pasa si declaro tarde?**\n→ Recargo por mora: 10% del impuesto + intereses del 1.73% mensual\n→ En casos graves: multa adicional\n→ Puede suspender tu RNC\n\n**Ejemplo práctico:**\nLas ventas de enero → las declaras antes del 20 de febrero\nLas ventas de febrero → antes del 20 de marzo\n(así sucesivamente)\n\n**¿Cómo no olvidarlo?**\nPon una alarma en tu teléfono el día 15 de cada mes para recordarte revisar los reportes antes del 20.`,
  },
  {
    id: 'retenciones',
    keywords: ['retencion', 'retención', 'retener impuesto', '30 porciento', '10 porciento', '623', 'quien retiene'],
    answer: `**¿Qué son las Retenciones?**\n\nEs cuando TÚ le descuentas el impuesto a tu proveedor antes de pagarle.\n\n**¿Quién debe hacer retenciones?**\nPrincipalmente:\n• Empresas grandes\n• El gobierno\n• Agentes de retención designados por la DGII\n\nLa mayoría de pequeños negocios NO hacen retenciones.\n\n**Tipos de retención:**\n• **ITBIS 30%** → retienes el 30% del ITBIS de la factura\n• **ISR 10%** → sobre servicios profesionales\n• **ISR 15%** → sobre alquileres\n\n**Ejemplo:**\nTe dan una factura de servicios por RD$10,000 + RD$1,800 ITBIS = RD$11,800\nSi eres agente de retención:\n• Retienes 30% del ITBIS: RD$540\n• Le pagas al proveedor: RD$11,260\n• Declaras RD$540 en el 623\n\n**¿Cómo registrar en FiscalRD?**\n→ Menú → **Retenciones** → Nueva Retención\n\n**Si no eres agente de retención:** No necesitas hacer esto.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 8 — NÓMINA Y EMPLEADOS
// ═══════════════════════════════════════════════════════════════════════════════
const payroll: KBEntry[] = [
  {
    id: 'nomina-que-es',
    keywords: ['nomina', 'nómina', 'pagar empleados', 'como pago empleados', 'calculo nomina', 'cálculo nómina'],
    answer: `**Nómina — Cómo pagar a tus empleados legalmente** 👷\n\n→ Menú → **Nómina**\n\n**¿Qué hace el sistema automáticamente?**\nCalcula todos los descuentos que manda la ley laboral dominicana:\n\n**Descuentos al empleado:**\n• SFS (Seguro de Salud): 3.04% del salario bruto\n• AFP (Pensión): 2.87% del salario bruto\n• ISR: Solo si el salario supera ~RD$34,685/mes\n\n**Aportes del empleador (TÚ pagas extra):**\n• SFS Patronal: 7.09%\n• AFP Patronal: 7.10%\n\n**Ejemplo con salario de RD$20,000:**\n• SFS empleado: RD$608\n• AFP empleado: RD$574\n• Salario neto: RD$18,818\n• SFS patronal (tú pagas aparte): RD$1,418\n• AFP patronal (tú pagas aparte): RD$1,420`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'crear-nomina',
    keywords: ['crear nomina', 'crear nómina', 'nueva nomina', 'nueva nómina', 'procesar nomina', 'calcular nomina', 'como proceso nomina'],
    answer: `**¿Cómo procesar una nómina?**\n\n1. → Menú → **Nómina** → "Nueva Nómina"\n2. Selecciona el **período** (quincenal o mensual)\n3. Selecciona los empleados que vas a pagar\n4. El sistema calcula automáticamente:\n   • Salario bruto\n   • SFS, AFP, ISR de cada empleado\n   • Salario neto a pagar\n5. Revisa que todo esté correcto\n6. Clic en **"Procesar Nómina"**\n7. Cuando hagas el pago físico → clic en **"Marcar Pagada"**\n\n**Al marcar pagada:**\n→ Se crea el asiento contable automáticamente\n→ Queda registrado en el historial de nóminas\n\n**¿Puedo procesar por departamentos?**\nPuedes seleccionar qué empleados incluir en cada nómina.\n\n**¿Cada cuánto proceso la nómina?**\nDepende de lo acordado con tus empleados: semanal, quincenal o mensual.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'tss-que-es',
    keywords: ['tss', 'seguridad social', 'sfs', 'afp', 'reporte tss', 'pagar tss', 'como pago tss', 'donde pago tss'],
    answer: `**TSS — Tesorería de la Seguridad Social** 🏥\n\nEs la institución donde pagas los aportes del seguro médico y pensión de tus empleados.\n\n**¿Cuándo se paga?**\nCada mes, antes del último día hábil del mes.\n\n**¿Cuánto se paga?**\nPor cada empleado:\n• SFS empleado: 3.04% del salario\n• SFS patronal (tú): 7.09% del salario\n• AFP empleado: 2.87% del salario\n• AFP patronal (tú): 7.10% del salario\n\n**¿Cómo pagar la TSS?**\n1. → Nómina → "Exportar TSS"\n2. Descarga el archivo con el reporte de empleados\n3. Ve al portal de la TSS (tss.gob.do)\n4. Sube el archivo o ingresa los datos\n5. Realiza el pago\n\n**¿Dónde pago físicamente?**\nBanreservas, BHD, Popular, Scotiabank y otros bancos aceptan el pago de TSS.\n\n**¿Qué pasa si no pago?**\nLos empleados pierden la cobertura médica y tú acumulas deuda con la TSS.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'agregar-empleado',
    keywords: ['agregar empleado', 'nuevo empleado', 'registrar empleado', 'crear empleado', 'como agrego empleado', 'empleados'],
    answer: `**¿Cómo registrar un empleado?**\n\n→ Menú → **Empleados** → "+ Nuevo Empleado"\n\n**Datos necesarios:**\n• Nombre completo\n• Cédula de identidad (11 dígitos)\n• Cargo / Posición\n• Fecha de inicio\n• Salario mensual bruto\n• Tipo de salario (fijo, por hora)\n• Número de cuenta bancaria (para depósito)\n• Email (para notificaciones)\n\n**Documentos que debes tener del empleado:**\n• Copia de la cédula\n• Contrato de trabajo (si aplica)\n\n**¿Para qué se usa en el sistema?**\n• Para calcular su nómina automáticamente\n• Para el reporte TSS\n• Para el registro de vacaciones y ausencias\n\n**Roles de usuario:**\nSi el empleado usará el sistema, también debes crearle un usuario desde Configuración → Usuarios.`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'regalía-pascual',
    keywords: ['regalia', 'regalía', 'regalia pascual', 'doble sueldo', 'christmas', 'navidad empleado'],
    answer: `**Regalía Pascual (Doble Sueldo)** 🎄\n\nEs el salario adicional que la ley laboral dominicana exige pagar en diciembre.\n\n**¿A cuánto equivale?**\n→ Equivale a 1/12 del salario anual por cada mes trabajado\n→ Si el empleado trabajó todo el año: recibe 1 salario completo extra\n→ Si trabajó 6 meses: recibe medio salario\n\n**¿Cuándo se paga?**\n→ Antes del 20 de diciembre\n\n**¿Tiene descuentos (SFS, AFP, ISR)?**\n→ La regalía pascual está **exenta** de SFS y AFP\n→ El ISR aplica si supera ciertos montos\n\n**¿Cómo calcularlo en FiscalRD?**\n→ Nómina → "Regalía Pascual" (o procesa la nómina de diciembre con el campo de regalía)\n\n**¿Qué pasa si no la pago?**\nEs una violación a la ley laboral. El empleado puede demandar y tiene derecho a recibir el doble de la regalía.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'vacaciones',
    keywords: ['vacaciones', 'dias libres', 'días libres', 'descanso empleado', 'calcular vacaciones'],
    answer: `**Vacaciones de empleados en RD** 🏖️\n\nSegún la ley laboral dominicana:\n• 1er año completo de trabajo: **14 días laborables**\n• Del 2do año en adelante: **18 días laborables**\n\n**¿Se pueden acumular?**\nSí, pero la ley dice que deben tomarse. El empleado puede solicitar pagarlas en vez de tomarlas.\n\n**¿Cómo se calcula el pago de vacaciones?**\n→ Salario mensual ÷ 23.83 días laborales × días de vacaciones\n\n**¿Afecta el SFS y AFP?**\nEl pago de vacaciones sí está sujeto a descuentos normales.\n\n**En FiscalRD:**\nPor el momento, el control de vacaciones se maneja en el módulo de Empleados. Puedes ver las fechas de ingreso para calcular cuándo corresponden las vacaciones.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'isr-empleado',
    keywords: ['isr empleado', 'impuesto renta empleado', 'descuento isr', 'cuando aplica isr', 'cuanto descuento isr'],
    answer: `**ISR (Impuesto Sobre la Renta) a los empleados**\n\nSolo aplica si el salario anual supera la escala exenta.\n\n**Escala 2025 (aproximada):**\n• Hasta RD$416,220/año (RD$34,685/mes) → **Exento (0%)**\n• RD$416,220 a RD$624,329/año → **15%** sobre el excedente\n• RD$624,329 a RD$867,123/año → **20%** sobre el excedente\n• Más de RD$867,123/año → **25%** sobre el excedente\n\n**Ejemplo:**\nEmpleado con salario de RD$50,000/mes:\n• Anual: RD$600,000\n• Exento: RD$416,220\n• Base gravable: RD$183,780\n• ISR 15%: RD$27,567 al año = RD$2,297/mes\n\n**¿El sistema lo calcula?**\nSí. FiscalRD calcula el ISR automáticamente en cada nómina según el salario del empleado.\n\n**¿Quién paga el ISR?**\nEl empleado — se descuenta de su salario. El empleador lo retiene y lo paga a la DGII.`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 9 — CONTABILIDAD
// ═══════════════════════════════════════════════════════════════════════════════
const accounting: KBEntry[] = [
  {
    id: 'contabilidad-que-es',
    keywords: ['contabilidad', 'estados financieros', 'balance general', 'ganancias perdidas', 'ingresos gastos', 'como va mi negocio'],
    answer: `**Contabilidad en FiscalRD** 📊\n\n→ Menú → **Contabilidad**\n\n**¿Qué puedes ver?**\n\n• **Balance General** → Foto del negocio hoy: qué tienes, qué debes, qué es tuyo\n• **Estado de Resultados** → ¿Ganaste o perdiste este mes?\n• **Libro Diario** → Cada transacción registrada\n• **Plan de Cuentas** → Todas las categorías contables\n\n**¿Se llena solo?**\nSí, automáticamente:\n✅ Cada venta → asiento contable\n✅ Cada compra → asiento contable\n✅ Cada pago recibido → asiento contable\n✅ Cada nómina pagada → asientos de salarios\n✅ Cada gasto → asiento de gasto\n\n**¿Tengo que saber contabilidad?**\nNo. El sistema hace los asientos solo. Tú solo revisa los resultados.\n\n**La pregunta más importante:**\n¿Cuánto gané este mes? → Estado de Resultados → selecciona el mes → te dice el resultado.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'estado-resultados',
    keywords: ['estado resultados', 'cuanto gane', 'cuánto gané', 'ganancia mes', 'perdidas ganancias', 'resultado negocio'],
    answer: `**Estado de Resultados — ¿Cuánto ganó el negocio?** 💹\n\n→ Contabilidad → "Estado de Resultados" → selecciona el año y mes\n\n**¿Qué muestra?**\n• **Ingresos** → Todo lo que vendiste\n• **Costo de Ventas** → Lo que te costó lo que vendiste\n• **Ganancia Bruta** = Ingresos - Costos\n• **Gastos Operativos** → Alquiler, luz, teléfono, salarios...\n• **Ganancia Neta** = Ganancia Bruta - Gastos\n\n**Ejemplo:**\nVentas: RD$200,000\n- Costo mercancía: RD$120,000\n= Ganancia bruta: RD$80,000\n- Gastos (luz, alquiler, salarios): RD$50,000\n= **Ganancia neta: RD$30,000**\n\n**¿Qué pasa si da negativo?**\nEl negocio perdió dinero ese mes. Hay que revisar si los precios son correctos o si los gastos son muy altos.\n\n**Para que sea exacto:**\nDebes registrar TODOS los gastos (alquiler, luz, etc.) en el módulo de Gastos.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'balance-general',
    keywords: ['balance general', 'activos pasivos', 'que tengo', 'que debo', 'patrimonio', 'balance'],
    answer: `**Balance General — La foto financiera del negocio** 📸\n\n→ Contabilidad → "Balance General"\n\n**Tiene 3 partes:**\n\n**ACTIVOS** (Lo que tienes):\n• Caja y banco → el efectivo disponible\n• Cuentas por cobrar → lo que te deben los clientes\n• Inventario → el valor de tus productos\n• Equipos y propiedades\n\n**PASIVOS** (Lo que debes):\n• Cuentas por pagar → lo que le debes a proveedores\n• Impuestos por pagar (ITBIS, ISR)\n• Salarios por pagar\n\n**PATRIMONIO** (Lo que es tuyo):\n→ Activos - Pasivos = Patrimonio\n\n**Regla de oro:**\nActivos = Pasivos + Patrimonio\nSi no cuadra, hay algo sin registrar.\n\n**¿Para qué sirve?**\n• Para solicitar préstamos en el banco\n• Para saber el valor real de tu negocio\n• Para presentar a socios o inversionistas`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'gastos-registrar',
    keywords: ['gastos', 'registrar gasto', 'gasto mensual', 'alquiler', 'electricidad', 'luz', 'agua', 'telefono', 'teléfono', 'internet', 'gastos operativos'],
    answer: `**¿Cómo registrar los gastos del negocio?**\n\n→ Menú → **Gastos** → "+ Nuevo Gasto"\n\n**Categorías disponibles:**\n• 🏠 Alquiler\n• 💡 Electricidad\n• 📱 Comunicaciones (teléfono, internet)\n• 🚗 Transporte\n• 🧹 Limpieza y mantenimiento\n• 👷 Servicios contratados\n• 📦 Suministros de oficina\n• Otros\n\n**Datos a llenar:**\n• Categoría del gasto\n• Descripción (ej: "Factura EDEESTE marzo")\n• Monto\n• Fecha\n• Si tiene ITBIS: márcalo (para el crédito fiscal)\n• NCF de la factura del proveedor (si tiene)\n\n**¿Por qué es importante registrar TODOS los gastos?**\n1. Para calcular la ganancia real\n2. Para el ISR anual — los gastos reducen el impuesto\n3. Para el IT-1 — el ITBIS de los gastos se puede descontar\n\n**Consejo:** Registra los gastos el mismo día que los pagas, así no se te olvida ninguno.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'plan-cuentas',
    keywords: ['plan de cuentas', 'cuentas contables', 'codigo contable', 'código contable', 'cuenta contabilidad'],
    answer: `**Plan de Cuentas — Las categorías de contabilidad** 📋\n\n→ Contabilidad → pestaña "Plan de Cuentas"\n\n**Estructura:**\n• **1.x** → Activos (lo que tienes)\n  - 1.1.01 Caja General\n  - 1.1.02 Banco\n  - 1.1.03 Cuentas por Cobrar\n  - 1.1.05 Inventario\n• **2.x** → Pasivos (lo que debes)\n  - 2.1.01 Cuentas por Pagar\n  - 2.1.02 ITBIS por Pagar\n  - 2.1.03 ISR por Pagar\n• **3.x** → Patrimonio\n• **4.x** → Ingresos (ventas)\n• **5.x** → Gastos\n\n**¿Puedo editarlo?**\nPuedes ver el saldo de cada cuenta y ajustar los saldos iniciales. Para agregar cuentas nuevas, habla con un contador.\n\n**¿Para qué sirve saber esto?**\nPara entender el Balance General y el Estado de Resultados.`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 10 — CAJA Y BANCOS
// ═══════════════════════════════════════════════════════════════════════════════
const cashBank: KBEntry[] = [
  {
    id: 'caja-bancos',
    keywords: ['caja y bancos', 'caja banco', 'reconciliacion', 'conciliación bancaria', 'estado cuenta banco', 'cuanto hay en caja'],
    answer: `**Caja y Bancos — Control del efectivo** 💵\n\n→ Menú → **Caja y Bancos**\n\n**¿Qué ves aquí?**\n• Balance total de efectivo en caja\n• Total en cuentas bancarias\n• Entradas y salidas del período\n• Transacciones conciliadas vs pendientes\n\n**¿Qué es conciliar?**\nEs comparar lo que dice el sistema con lo que dice el estado de cuenta del banco, para asegurarte que todo cuadra.\n\n**¿Cómo conciliar?**\n1. Descarga el estado de cuenta de tu banco\n2. Ve a Caja y Bancos → "Conciliación"\n3. Marca las transacciones que cuadran con el banco\n4. Las diferencias son las que debes investigar\n\n**¿Cada cuánto conciliar?**\nLo ideal es mensualmente. Así detectas errores a tiempo.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'retiro-caja',
    keywords: ['retiro caja', 'sacar dinero caja', 'retiro efectivo', 'tomar dinero', 'gasto caja chica', 'caja chica'],
    answer: `**¿Cómo registrar un retiro o gasto de la caja?**\n\nDurante el turno, si sacas dinero de la caja para un gasto:\n\n**En el POS → Control de Caja → "Registrar Gasto/Retiro"**\n\n• Escribe el monto\n• Describe para qué fue (ej: "Compra hielo", "Pago mandadero")\n• Confirma\n\nEso descuenta el monto del efectivo esperado en caja, así el cuadre final es correcto.\n\n**¿Qué pasa si no lo registro?**\nAl cerrar la caja, habrá un faltante del monto que sacaste pero no registraste. El sistema dirá que falta dinero.\n\n**Consejo importante:**\nTodo dinero que salga de la caja debe registrarse, sin excepción. Así el cuadre es exacto al final del día.`,
    roles: ['cashier', 'owner', 'admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 11 — CUENTAS POR COBRAR / PAGAR
// ═══════════════════════════════════════════════════════════════════════════════
const arAp: KBEntry[] = [
  {
    id: 'cuentas-cobrar',
    keywords: ['cuentas por cobrar', 'cuentas x cobrar', 'que me deben', 'deudas clientes', 'cobrar', 'cobranza', 'antigüedad cartera'],
    answer: `**Cuentas por Cobrar — lo que te deben tus clientes** 💰\n\n→ Menú → **Cuentas x Cobrar**\n\n**¿Qué ves?**\n• Lista de clientes con deuda\n• Cuánto debe cada uno\n• Desde hace cuánto tiempo\n• Estado: al día, vencido\n\n**Reporte de antigüedad:**\n• 0-30 días → normal\n• 31-60 días → seguimiento\n• 61-90 días → urgente\n• +90 días → crítico, riesgo de no cobrar\n\n**¿Cómo registrar un pago?**\n1. Busca el cliente\n2. Clic en "Registrar Pago"\n3. Monto pagado + método\n4. Confirma → se reduce la deuda\n\n**Consejos:**\n• Revisa esta pantalla cada semana\n• Llama a los clientes con +30 días de deuda\n• Considera suspender el crédito a quienes pasan de 60 días`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'cuentas-pagar',
    keywords: ['cuentas por pagar', 'cuentas x pagar', 'que debo', 'deudas proveedores', 'pagar proveedor', 'deuda proveedor'],
    answer: `**Cuentas por Pagar — lo que le debes a tus proveedores** 🏦\n\n→ Menú → **Cuentas x Pagar**\n\n**¿Qué ves?**\n• Lista de proveedores a quienes les debes\n• Cuánto y desde cuándo\n• Si la deuda está vencida\n\n**¿Cómo pagar?**\n1. Busca el proveedor\n2. Clic en "Registrar Pago"\n3. Monto + método de pago\n4. La deuda se reduce automáticamente\n5. Se crea el asiento contable\n\n**¿Por qué es importante controlar esto?**\n• Para no quedar mal con los proveedores\n• Para planificar el flujo de caja\n• Para saber cuándo necesitas dinero disponible\n\n**Reporte de antigüedad:**\nAl igual que las cuentas por cobrar, puedes ver cuánto tiempo llevas debiendo a cada proveedor.`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 12 — SECUENCIAS NCF
// ═══════════════════════════════════════════════════════════════════════════════
const ncfSeq: KBEntry[] = [
  {
    id: 'secuencias-ncf',
    keywords: ['secuencia ncf', 'secuencias', 'configurar ncf', 'se acabaron ncf', 'se agotaron ncf', 'pedir ncf', 'solicitar ncf', 'ncf disponibles'],
    answer: `**Secuencias NCF — Los números de factura disponibles** 🔢\n\n→ Menú → **Secuencias NCF**\n\n**¿Qué es una secuencia?**\nEs un rango de números que la DGII te autoriza a usar.\nEjemplo: del E3100000001 al E3100001000 = 1,000 facturas disponibles.\n\n**Barra de uso:**\n🟢 Verde (0-50%) → tienes de sobra\n🟡 Naranja (50-80%) → empieza a pensar en solicitar más\n🔴 Rojo (+80%) → solicita a la DGII urgente\n\n**¿Qué pasa si se agotan?**\n→ No puedes emitir más facturas de ese tipo\n→ El sistema bloquea la emisión\n→ Debes solicitar nuevas a la DGII y agregarlas\n\n**¿Cómo solicitar más en la DGII?**\n1. Ve a virtual.dgii.gov.do\n2. Inicia sesión con tu RNC\n3. Solicitud de NCF → selecciona el tipo\n4. La DGII las aprueba (1-2 días hábiles)\n5. Ve a FiscalRD → Secuencias NCF → "Nueva Secuencia"\n6. Agrega los números que te aprobaron`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 13 — ALANUBE / E-CF / FACTURACIÓN ELECTRÓNICA
// ═══════════════════════════════════════════════════════════════════════════════
const ecf: KBEntry[] = [
  {
    id: 'alanube-ecf',
    keywords: ['alanube', 'factura electronica', 'factura electrónica', 'e-cf', 'ecf', 'transmision dgii', 'transmisión dgii', 'envio dgii', 'envío dgii'],
    answer: `**Facturación Electrónica (e-CF)** 📡\n\n**¿Cómo funciona?**\n1. Emites una factura en FiscalRD → se le asigna un NCF\n2. El sistema envía los datos a **Alanube** (intermediario autorizado)\n3. Alanube genera el XML oficial y lo firma digitalmente\n4. Alanube lo envía a la DGII automáticamente\n5. La DGII responde: ACEPTADO ✅ o RECHAZADO ❌\n\n**¿Dónde configuro Alanube?**\nSuperadmin → Tenants → tu negocio → sección Alanube → pega el API key\n\n**¿Qué significa "NO_ENVIADO"?**\nLa factura es válida, pero no se transmitió. Pasa cuando no hay API key configurado.\n\n**¿Puedo seguir facturando sin Alanube?**\nSí, puedes facturar con NCF válido. Las facturas quedan como "NO_ENVIADO" y se retransmiten cuando configures Alanube.\n\n**¿Cómo reintentar el envío?**\n→ Ventas → abre la factura → botón "Reintentar envío a DGII"`,
  },
  {
    id: 'factura-publica',
    keywords: ['link factura', 'factura en linea', 'factura en línea', 'ver factura cliente', 'compartir factura', 'url factura'],
    answer: `**¿El cliente puede ver su factura en línea?** 🔗\n\nSí. Cada factura tiene una URL pública que el cliente puede abrir sin necesitar cuenta.\n\n**¿Cómo funciona?**\n1. El cliente recibe su factura por email\n2. El email tiene un link "Ver mi factura"\n3. Hace clic y ve la factura completa con:\n   • Todos los detalles de la compra\n   • Código QR para validar en la DGII\n   • Opción de imprimir\n\n**¿Cómo compartir manualmente?**\n→ Ve a la factura en Ventas\n→ Copia el link de la factura pública\n→ Compártelo por WhatsApp o como prefieras\n\n**El QR en la factura:**\nPermite que el cliente verifique que la factura es real y fue aceptada por la DGII. Solo necesita escanearlo con su teléfono.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 14 — COLMADOS (GUÍA ESPECIAL)
// ═══════════════════════════════════════════════════════════════════════════════
const colmado: KBEntry[] = [
  {
    id: 'colmado-guia',
    keywords: ['colmado', 'bodega', 'tienda barrio', 'negocio pequeño', 'como uso para colmado', 'manual colmado'],
    answer: `**Guía para Colmados** 🛒\n\nEn un colmado todo lo maneja 1-2 personas. Aquí va lo esencial:\n\n**Rutina diaria:**\n🌅 **Al abrir:** Control de Caja → Abrir Turno\n🛒 **Durante el día:** Vender con el POS (más rápido)\n🌙 **Al cerrar:** Control de Caja → Cerrar Turno\n\n**Cuando llega mercancía:**\n→ Compras → Nueva Compra → registra la factura del proveedor\n→ El inventario sube automáticamente\n\n**Cada mes (antes del día 20):**\n→ Reportes DGII → Genera 606, 607, IT-1\n→ Súbelos al portal virtual.dgii.gov.do\n\n**Tips para colmado:**\n• Usa el **escáner** — es más rápido que escribir\n• Pon **stock mínimo** a tus productos estrella\n• El **fiado** — contrólalo con límite de crédito\n• **Consumidor Final** para el 90% de las ventas\n\n¿Quieres que te explique algo específico?`,
  },
  {
    id: 'consumidor-final',
    keywords: ['consumidor final', 'sin rnc', 'cliente sin rnc', 'cliente sin cedula', 'sin cedula', 'factura sin datos cliente', 'venta rapida'],
    answer: `**"Consumidor Final"** — para clientes que no necesitan factura especial 👤\n\n**¿Qué es?**\nCuando el cliente compra para uso personal y no necesita que la factura salga a su nombre.\n\n**¿Cuándo uso Consumidor Final?**\n→ La mayoría de ventas en colmados, farmacias, etc.\n→ Cuando el cliente paga y se va, sin pedir factura legal\n\n**¿Qué tipo de NCF se usa?**\n→ E32 (Factura para persona física)\n\n**¿Necesito datos del cliente?**\nNo. Solo selecciona "Consumidor Final" y listo.\n\n**¿Cuándo SÍ necesito los datos?**\n• El cliente es un negocio y quiere factura con su RNC (usa E31)\n• Le vas a fiar → debes tener su nombre y límite registrado\n• Quiere que le envíes la factura por email`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 15 — CONFIGURACIÓN Y USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════
const configuration: KBEntry[] = [
  {
    id: 'configuracion-negocio',
    keywords: ['configuracion', 'configuración', 'cambiar nombre negocio', 'cambiar rnc', 'datos negocio', 'perfil negocio', 'mi negocio', 'settings'],
    answer: `**Configuración del Negocio** ⚙️\n\n→ Menú → **Configuración**\n\n**¿Qué puedes cambiar?**\n• Nombre del negocio\n• RNC\n• Tipo de negocio\n• Dirección\n• Teléfono\n• Email del negocio\n• Sitio web\n• Régimen fiscal (Ordinario, Simplificado, Micro)\n\n**¿Por qué es importante tenerlos correctos?**\nEstos datos aparecen en CADA factura que emites. Si el nombre o RNC están mal, tus facturas no son legales.\n\n**Cambiar contraseña:**\nEn la misma pantalla de Configuración hay una sección para cambiar tu contraseña con indicador de seguridad.\n\n**¿Quién puede cambiar la configuración?**\nSolo el dueño (owner) y el administrador (admin).`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'roles-usuarios',
    keywords: ['roles', 'usuario', 'permisos', 'cajera permisos', 'que puede hacer cajera', 'que puede ver', 'invitar usuario', 'crear usuario', 'acceso'],
    answer: `**Roles de usuario en FiscalRD** 👥\n\n• 👑 **Owner (Dueño)** → Acceso total: ve todo, cambia todo\n• 🔧 **Admin** → Igual que el dueño en operaciones, no puede cambiar el plan\n• 💼 **Accountant (Contador)** → Ve reportes DGII y contabilidad, no factura\n• 🛒 **Cashier (Cajera)** → Solo el POS y la caja, NO ve el dashboard ni ganancias\n• 👤 **Employee** → Solo ve su horario y tareas asignadas\n\n**¿Cómo crear un usuario?**\n1. Configuración → Usuarios\n2. Clic en "Invitar Usuario"\n3. Escribe el email\n4. Selecciona el rol\n5. El usuario recibe un email con sus credenciales\n\n**Consejo de seguridad:**\n→ La cajera solo debe tener rol "Cashier"\n→ Así no puede ver las ganancias ni cambiar precios\n→ Si alguien renuncia, desactiva su usuario inmediatamente`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'cambiar-contrasena',
    keywords: ['cambiar contraseña', 'cambiar clave', 'olvide contraseña', 'olvidé contraseña', 'reset contraseña', 'nueva contraseña'],
    answer: `**¿Cómo cambiar tu contraseña?**\n\n**Si recuerdas tu contraseña actual:**\n1. Ve a **Configuración** (menú inferior izquierdo)\n2. Sección "Cambiar Contraseña"\n3. Escribe la contraseña actual\n4. Escribe la nueva (mínimo 8 caracteres)\n5. Confírmala\n6. Clic en "Cambiar Contraseña"\n\n**Si olvidaste la contraseña:**\n1. Ve a la pantalla de inicio de sesión\n2. Clic en "¿Olvidaste tu contraseña?"\n3. Escribe tu email\n4. Recibirás un link por email\n5. Haz clic en el link y crea una nueva contraseña\n\n**Consejo de seguridad:**\n→ Usa una contraseña que nadie más sepa\n→ No uses tu fecha de nacimiento o nombre\n→ Mezcla letras, números y caracteres especiales`,
  },
  {
    id: 'plan-suscripcion',
    keywords: ['plan', 'suscripcion', 'suscripción', 'facturación mensual', 'cuanto cuesta', 'cuánto cuesta', 'precio sistema', 'pagar sistema', 'limite facturas'],
    answer: `**Planes de FiscalRD** 💳\n\nEl sistema tiene diferentes planes según el tamaño de tu negocio:\n\n• **Gratis** → Número limitado de facturas por mes\n• **Básico** → Más facturas, funciones adicionales\n• **Pro** → Sin límite de facturas, todas las funciones\n• **Empresarial** → Para negocios grandes, multi-sucursal\n\n**¿Cómo sé qué plan tengo?**\n→ En el Dashboard, en la esquina superior derecha ves tu plan actual\n→ También en el Dashboard hay una barra de uso de facturas\n\n**¿Cómo cambiar de plan?**\n→ El dueño debe contactar al administrador de la plataforma\n\n**¿Qué pasa si llego al límite de facturas?**\n→ El sistema bloquea la emisión de nuevas facturas\n→ Debes actualizar tu plan para continuar`,
    roles: ['owner'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 16 — IMPUESTOS / LEGAL RD
// ═══════════════════════════════════════════════════════════════════════════════
const legal: KBEntry[] = [
  {
    id: 'que-es-rnc',
    keywords: ['rnc', 'que es rnc', 'qué es rnc', 'numero registro', 'número registro', 'registro fiscal', 'como obtengo rnc'],
    answer: `**RNC (Registro Nacional del Contribuyente)** 🏢\n\nEs el número de 9 dígitos que identifica tu negocio ante la DGII. Como la cédula, pero del negocio.\n\n**¿Dónde lo encuentro?**\n• En tu patente mercantil\n• En cualquier factura que hayas emitido\n• En dgii.gov.do → "Consulta de RNC"\n\n**¿Cómo obtenerlo si no tengo?**\n1. Inscribe tu negocio en la Cámara de Comercio\n2. Ve a la DGII con los documentos del negocio\n3. Solicita el RNC\n4. La DGII lo emite (puede tomar varios días)\n\n**¿Y la Cédula?**\nSi trabajas como persona física (con tu nombre, no como empresa), usas tu cédula de 11 dígitos en vez del RNC.\n\n**¿Qué diferencia hay entre RNC y Cédula en facturas?**\n• RNC → para empresas (SRL, SA, etc.) → 9 dígitos\n• Cédula → para personas físicas → 11 dígitos`,
  },
  {
    id: 'isr-negocio',
    keywords: ['isr negocio', 'impuesto renta', 'impuesto sobre la renta', 'renta anual', 'declaracion anual', 'cuanto pago anual'],
    answer: `**ISR (Impuesto Sobre la Renta) — el impuesto anual del negocio** 📅\n\n**¿Qué es?**\nEl impuesto sobre las ganancias del negocio en el año.\n\n**¿Cuánto es?**\n• Empresas (SRL, SA): **27%** sobre la ganancia neta\n• Personas físicas con negocio: escala progresiva\n  - Hasta RD$416,220/año → 0%\n  - RD$416,221 a RD$624,329 → 15%\n  - RD$624,329 a RD$867,123 → 20%\n  - Más de RD$867,123 → 25%\n\n**¿Cuándo se paga?**\n→ Generalmente en abril (por el año anterior)\n→ Hay pagos anticipados trimestrales (pagos a cuenta)\n\n**¿Qué reduce el ISR?**\n→ Todos los gastos registrados del negocio\n→ Por eso es crucial registrar alquiler, salarios, compras, luz, teléfono, etc.\n\n**¿FiscalRD lo calcula?**\nEl sistema te ayuda con el Estado de Resultados para saber la ganancia. El ISR anual generalmente necesita un contador para la declaración formal.`,
  },
  {
    id: 'regimen-fiscal',
    keywords: ['regimen', 'régimen', 'régimen fiscal', 'ordinario', 'simplificado', 'micro empresa', 'que regimen soy'],
    answer: `**¿Cuál es mi régimen fiscal?** 📋\n\n**Ordinario:**\n→ Para negocios medianos y grandes\n→ Declara ITBIS mensual, ISR anual, 606, 607, 608\n→ La mayoría de negocios con RNC son ordinarios\n\n**Régimen Simplificado de Tributación (RST):**\n→ Para negocios pequeños con ventas entre RD$7.8M y RD$50M al año\n→ Paga un porcentaje fijo sobre las ventas\n→ Menos formularios que el ordinario\n\n**Micro Contribuyente:**\n→ Negocios muy pequeños con ventas menores de RD$7.8M al año\n→ El régimen más simple\n→ Pagan una cuota fija\n\n**¿Cómo sé cuál soy?**\n→ Pregunta a la DGII o a tu contador\n→ O entra a virtual.dgii.gov.do con tu RNC\n\n**En FiscalRD:**\n→ Configuración → Régimen Fiscal → selecciona el que corresponde`,
  },
  {
    id: 'multa-dgii',
    keywords: ['multa', 'multas dgii', 'no declare', 'no declaré', 'tarde declaracion', 'recargo', 'penalidad', 'me penalizaron'],
    answer: `**¿Qué multas puede poner la DGII?** ⚠️\n\n**Por no declarar a tiempo (mora):**\n• 10% del impuesto + 1.73% mensual de interés\n• Ejemplo: si debes RD$10,000 y declaras 2 meses tarde:\n  → Multa 10%: RD$1,000\n  → Intereses 2 meses: RD$346\n  → Total a pagar: RD$11,346\n\n**Por no presentar reportes (606, 607, etc.):**\n• Multa de RD$5,000 a RD$50,000 según el caso\n\n**Por facturas sin NCF:**\n• Multa severa + posible cierre del negocio\n\n**Por inconsistencias (lo que declaras no cuadra):**\n• La DGII puede auditarte y cobrar la diferencia + multa\n\n**¿Cómo evitar multas?**\n✅ Usa siempre NCF en tus facturas\n✅ Declara antes del día 20 de cada mes\n✅ Registra todas las compras con RNC del proveedor\n✅ Guarda todas las facturas físicas y digitales`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 17 — SUPERADMIN
// ═══════════════════════════════════════════════════════════════════════════════
const superadmin: KBEntry[] = [
  {
    id: 'superadmin-panel',
    keywords: ['superadmin', 'panel admin', 'administrar negocios', 'gestionar tenants', 'ver todos los negocios'],
    answer: `**Panel de Superadmin** 🛡️\n\n→ Menú → (debes estar logueado como super_admin)\n\n**¿Qué puedes hacer?**\n• Ver todos los negocios (tenants) registrados\n• Ver métricas: MRR, total facturas, usuarios activos\n• Configurar el API key de Alanube para cada negocio\n• Cambiar el plan de un negocio\n• Impersonar a un negocio para ver lo que él ve\n• Gestionar configuraciones globales de la plataforma\n\n**¿Cómo impersonar un negocio?**\n1. Ve a Admin → Tenants\n2. Busca el negocio\n3. Clic en "Impersonar"\n4. Verás el sistema exactamente como lo ve el dueño\n5. Para salir: barra amarilla en la parte superior → "Salir de impersonación"\n\n**¿Cómo configurar Alanube para un negocio?**\n1. Admin → Tenants → abre el negocio\n2. Sección "Alanube"\n3. Pega el API key\n4. Selecciona Sandbox (pruebas) o Producción\n5. Guarda`,
    roles: ['super_admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 18 — VENTAS AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const salesExtra: KBEntry[] = [
  {
    id: 'factura-borrador',
    keywords: ['borrador', 'draft', 'guardar factura sin emitir', 'factura pendiente', 'continuar factura', 'retomar factura'],
    answer: `**Borrador de factura** — guardar y continuar después\n\nUna factura en estado "Borrador" está guardada pero aún no tiene NCF ni es legalmente válida.\n\n**¿Cuándo usar un borrador?**\n• Cuando el cliente aún no decidió si compra\n• Para revisar los precios antes de emitir\n• Para que el dueño apruebe antes de facturar\n\n**¿Cómo retomar un borrador?**\n→ Ventas → filtra por estado "Borrador"\n→ Clic en la factura → sigue editando → clic en "Emitir"\n\n**¿El borrador reserva NCF?**\nNo. El NCF se asigna solo cuando haces clic en "Emitir Factura".\n\n**¿Se puede borrar un borrador?**\nSí, los borradores se pueden eliminar directamente porque no tienen NCF asignado.`,
  },
  {
    id: 'buscar-factura-ncf',
    keywords: ['buscar por ncf', 'buscar numero comprobante', 'encontrar factura numero', 'buscar factura especifica', 'filtrar facturas'],
    answer: `**¿Cómo buscar una factura específica?**\n\n→ Ventas → barra de búsqueda arriba\n\n**Puedes buscar por:**\n• **Nombre del cliente** → escribe el nombre\n• **Número NCF** → escribe el código completo (ej: E3100000045)\n• **Fecha** → usa el filtro de fechas\n• **Estado** → filtra por Emitida / Borrador / Anulada\n• **Monto** → busca por rango de precio\n\n**Truco rápido:**\nSi el cliente te dice el número de su factura, escríbelo en la búsqueda y aparece de inmediato.\n\n**¿No encuentras la factura?**\n• Verifica que el rango de fechas incluya la fecha de la factura\n• Prueba quitando todos los filtros y busca solo por NCF`,
  },
  {
    id: 'exportar-ventas',
    keywords: ['exportar ventas', 'descargar ventas', 'excel ventas', 'reporte ventas excel', 'csv ventas', 'exportar facturas'],
    answer: `**¿Cómo exportar las ventas a Excel?**\n\n→ Ventas → botón "Exportar" (arriba a la derecha)\n\n**¿Qué incluye el archivo?**\n• Fecha, NCF, cliente, productos, monto, ITBIS, método de pago, estado\n\n**¿Para qué sirve?**\n• Hacer análisis en Excel o Google Sheets\n• Pasárselo a tu contador\n• Comparar ventas por períodos\n\n**Filtrar antes de exportar:**\nPrimero filtra por fecha, cliente o estado, luego exporta — así el archivo solo tiene lo que necesitas.\n\n**Formatos disponibles:**\n• .CSV → abre en Excel, Google Sheets, cualquier hoja de cálculo`,
  },
  {
    id: 'filtrar-ventas-fecha',
    keywords: ['filtrar ventas', 'ventas del mes', 'ventas hoy', 'ventas semana', 'ventas por fecha', 'rango fechas ventas'],
    answer: `**¿Cómo filtrar ventas por fecha?**\n\n→ Ventas → filtros de fecha arriba\n\n**Opciones rápidas:**\n• **Hoy** → solo las ventas de hoy\n• **Esta semana** → lunes a hoy\n• **Este mes** → del 1ro al día de hoy\n• **Rango personalizado** → escoge fecha inicio y fin\n\n**¿Para qué es útil?**\n• Ver cuánto vendiste este mes para comparar con el anterior\n• Preparar el reporte 607 de la DGII\n• Ver si hay días con pocas ventas\n\n**Combinar filtros:**\nPuedes filtrar por fecha + método de pago + estado al mismo tiempo.`,
  },
  {
    id: 'nota-debito',
    keywords: ['nota debito', 'nota débito', 'e33', 'ajuste precio factura', 'aumentar factura', 'cobrar mas a cliente'],
    answer: `**Nota de Débito (E33)** — cuando necesitas cobrar más a un cliente\n\nEs el opuesto de la nota de crédito. Se usa cuando la factura original fue por menos de lo que debía.\n\n**¿Cuándo se usa?**\n• El precio de un producto subió después de emitir la factura\n• Se olvidó incluir un cargo en la factura original\n• Ajuste por diferencia de tipo de cambio\n\n**¿Cómo emitirla?**\n→ Ventas → abre la factura original → "Nota de Débito"\n→ Escribe el monto adicional y el concepto\n→ Emite → se genera una E33\n\n**¿Afecta el ITBIS?**\nSí. La nota de débito también lleva ITBIS sobre el monto adicional.\n\n**En el 607:**\nLa nota de débito aparece como una venta adicional en el reporte.`,
  },
  {
    id: 'ver-totales-ventas',
    keywords: ['cuanto vendi', 'cuánto vendí', 'total ventas', 'ventas totales', 'resumen ventas', 'cuanto vendiste hoy'],
    answer: `**¿Cuánto vendí hoy / este mes?**\n\n**Opción 1 — Dashboard:**\n→ Menú → **Dashboard**\n→ Ves el total de ventas del mes en la parte superior\n→ También el número de facturas y el ticket promedio\n\n**Opción 2 — Ventas:**\n→ Menú → Ventas → filtra por el período deseado\n→ En la parte inferior o superior verás el total\n\n**Opción 3 — Caja (solo efectivo del turno):**\n→ Control de Caja → Cerrar Turno\n→ Muestra el total por método de pago del día\n\n**¿Quiero ver por semana/mes/año?**\n→ Dashboard → el gráfico de ventas muestra la tendencia\n→ Puedes cambiar el período del gráfico`,
  },
  {
    id: 'devolucion-como',
    keywords: ['devolucion', 'devolución', 'nota credito', 'nota de crédito', 'cliente devuelve', 'como hago devolucion', 'producto devuelto', 'e34'],
    answer: `**¿Cómo procesar una devolución?**\n\nCuando un cliente devuelve un producto, se emite una **Nota de Crédito (E34)**.\n\n**Pasos:**\n1. → Ventas → busca la factura original\n2. Abre la factura → clic en **"Devolución / Nota de Crédito"**\n3. Selecciona qué productos devuelve y en qué cantidad\n4. El sistema calcula el monto a devolver con ITBIS\n5. Clic en **"Emitir Nota de Crédito"**\n\n**¿Qué pasa con el inventario?**\n→ Si el producto se regresa al inventario: el stock sube automáticamente\n\n**¿Cómo se le devuelve el dinero al cliente?**\n→ En efectivo, transferencia o como crédito para su próxima compra\n→ El sistema registra el método de la devolución\n\n**¿La devolución aparece en la DGII?**\nSí. El E34 aparece en el Reporte 607 del mes.`,
  },
  {
    id: 'factura-recurrente',
    keywords: ['factura recurrente', 'factura mensual', 'cobro mensual', 'servicio mensual', 'contrato mensual', 'cliente fijo mensual'],
    answer: `**¿Cómo facturar a clientes que pagan mensual?**\n\nPor ahora no hay facturas automáticas recurrentes. La forma más rápida:\n\n**Método recomendado:**\n1. Emite la primera factura al cliente\n2. Al mes siguiente: abre esa factura\n3. Clic en **"Duplicar"** o crea nueva con los mismos datos\n4. Cambia la fecha y emite\n\n**Para servicios mensuales:**\n→ Crea el servicio como un "Producto de tipo Servicio"\n→ Ponle el precio mensual\n→ Cada mes lo buscas en el POS y facturas\n\n**Truco:**\nRegistra estos clientes con su RNC para que salgan en el 607 correctamente cada mes.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 19 — POS AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const posExtra: KBEntry[] = [
  {
    id: 'pago-mixto',
    keywords: ['pago mixto', 'parte efectivo parte tarjeta', 'mitad efectivo', 'dos metodos pago', 'pago combinado', 'dividir pago'],
    answer: `**Pago mixto — parte en efectivo, parte en tarjeta**\n\nCuando el cliente paga con dos métodos a la vez:\n\n**¿Cómo hacerlo?**\n1. Arma el carrito en el POS\n2. En método de pago → selecciona **"Mixto"** (o el campo de múltiples métodos)\n3. Escribe cuánto paga en efectivo\n4. El sistema calcula automáticamente cuánto queda para tarjeta/transferencia\n5. Cobra el resto con el datafono o transferencia\n6. Confirma\n\n**Ejemplo:**\nCompra total: RD$1,500\n→ Cliente da RD$500 en efectivo\n→ Resta RD$1,000 → cliente paga con tarjeta\n\n**¿Cómo aparece en el reporte de caja?**\nCada método aparece separado: RD$500 efectivo + RD$1,000 tarjeta.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'nota-en-venta',
    keywords: ['nota en venta', 'agregar nota', 'observacion factura', 'comentario factura', 'nota al cliente', 'instruccion factura'],
    answer: `**¿Cómo agregar una nota o comentario a una factura?**\n\nAl crear la factura o en el POS:\n→ Busca el campo **"Notas"** o **"Observaciones"** al final del formulario\n→ Escribe lo que necesites\n→ Esa nota aparece impresa en la factura\n\n**Usos prácticos:**\n• "Entregar el martes por la tarde"\n• "Incluye instalación"\n• "Descuento por cliente frecuente"\n• Número de orden del cliente\n• Referencia de pedido\n\n**¿El cliente ve la nota?**\nSí, aparece en la factura impresa y en la versión online.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cambiar-cantidad-pos',
    keywords: ['cambiar cantidad', 'modificar cantidad', 'cuantos quiere', 'mas unidades', 'menos unidades', 'cantidad producto pos'],
    answer: `**¿Cómo cambiar la cantidad de un producto en el POS?**\n\n**Opción 1 — En el carrito:**\n→ Busca el producto en el carrito (lado derecho)\n→ Haz clic en el número de cantidad\n→ Escribe la cantidad nueva o usa los botones + y -\n\n**Opción 2 — Al agregar:**\n→ Cuando el producto aparece para agregar, pon la cantidad antes de confirmarlo\n\n**Truco rápido:**\nSi el cliente pide 3 del mismo producto, agrégalo una vez y cambia la cantidad a 3 en vez de agregar 3 veces.\n\n**¿Hay un máximo de cantidad?**\nEl sistema te avisa si intentas vender más de lo que hay en stock (si el control de stock está activo).`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'ver-resumen-hoy',
    keywords: ['ver ventas hoy', 'cuanto vendi hoy', 'resumen del dia', 'ventas de hoy', 'total del dia', 'reporte x', 'reporte x pos'],
    answer: `**¿Cómo ver cuánto has vendido hoy sin cerrar la caja?**\n\n→ **Control de Caja** → ver el turno activo\nAhí verás en tiempo real:\n• Total de ventas desde que abriste\n• Desglose por método de pago\n• Número de transacciones\n\n**También desde el Dashboard:**\n→ La tarjeta "Ventas de Hoy" se actualiza en tiempo real\n\n**¿Puedo imprimir un reporte X (sin cerrar)?**\nSí, en Control de Caja hay una opción para ver el resumen del turno actual sin cerrarlo. Útil para revisar a media jornada.\n\n**¿Quién puede ver esto?**\n• Cashier → solo ve las ventas de su turno\n• Owner/Admin → ve todo el día`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'descuento-en-pos',
    keywords: ['descuento pos', 'aplicar descuento pos', 'precio especial pos', 'bajar precio pos', 'promocion pos'],
    answer: `**¿Cómo aplicar un descuento en el POS?**\n\n**Opción 1 — Cambiar el precio directamente:**\n→ En el carrito, haz clic en el precio del producto\n→ Escribe el nuevo precio\n→ Solo funciona si tienes permiso (owner/admin)\n\n**Opción 2 — Porcentaje de descuento:**\n→ En el carrito, busca el campo "% Descuento"\n→ Escribe el porcentaje (ej: 10 para 10%)\n→ El sistema calcula el nuevo precio\n\n**¿La cajera puede dar descuentos?**\nDepende de la configuración. Si el dueño no quiere que la cajera modifique precios, solo el admin/owner puede hacerlo.\n\n**El ITBIS y el descuento:**\nEl ITBIS se calcula sobre el precio con descuento aplicado, no el precio original. Eso es correcto según la ley.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'verificar-stock-pos',
    keywords: ['hay stock', 'cuantos hay', 'stock disponible', 'verificar inventario pos', 'queda en existencia', 'agotado pos'],
    answer: `**¿Cómo saber si hay stock de un producto antes de venderlo?**\n\n**En el POS:**\nCuando buscas el producto, al lado del nombre verás el stock disponible.\n• 🟢 → hay suficiente\n• 🟡 → quedan pocos\n• 🔴 → stock muy bajo o agotado\n\n**¿Qué pasa si intento vender uno agotado?**\n→ El sistema te avisa: "Stock insuficiente"\n→ No puedes completar la venta (si el bloqueo está activado)\n→ O te deja vender pero el stock queda en negativo (si está en modo permisivo)\n\n**¿Cómo verificar desde Inventario?**\n→ Menú → Inventario → busca el producto → columna "Stock"`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cancelar-antes-cobrar',
    keywords: ['cancelar venta pos', 'no quiero cobrar', 'cliente se fue', 'vaciar carrito', 'empezar de nuevo', 'limpiar todo'],
    answer: `**¿Cómo cancelar una venta antes de cobrar?**\n\nMientras el cliente aún no ha pagado y no has presionado COBRAR:\n\n→ Clic en **"Limpiar Carrito"** o **"Cancelar"**\n→ El sistema borra todos los productos del carrito\n→ No queda ningún registro, no se usa NCF\n\n**¿Qué pasa si ya presioné COBRAR?**\nYa se emitió la factura con NCF. Para revertirlo:\n→ Ve a Ventas → abre la factura → "Anular"\n→ La anulación queda registrada en el Reporte 608\n\n**Diferencia importante:**\n• Vaciar carrito ANTES de cobrar → sin rastro, sin NCF\n• Anular DESPUÉS de cobrar → NCF registrado como anulado en DGII`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'pos-movil-tablet',
    keywords: ['pos en celular', 'pos en telefono', 'pos movil', 'pos tablet', 'pos ipad', 'usar pos en movil', 'pos en android'],
    answer: `**¿Puedo usar el POS en celular o tablet?**\n\nSí, FiscalRD funciona en cualquier dispositivo con navegador web.\n\n**Dispositivos compatibles:**\n• 📱 Celular Android → funciona bien\n• 📱 iPhone → funciona bien\n• 📱 Tablet → ideal para POS\n• 💻 Laptop → perfecto\n• 🖥️ Desktop → lo más completo\n\n**¿Cómo entrar desde celular?**\n→ Abre el navegador (Chrome, Safari)\n→ Ve a la URL de FiscalRD\n→ Inicia sesión → te lleva al POS automáticamente si eres cajera\n\n**¿Puedes guardar como app?**\nSí. En Chrome → menú de 3 puntos → "Agregar a pantalla de inicio"\nSe crea un ícono en el celular como si fuera una app.\n\n**¿La impresora funciona desde celular?**\nSí si la impresora está en la misma red WiFi.`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'cliente-fiado-pos',
    keywords: ['vender fiado pos', 'fiado en pos', 'credito en pos', 'cobrar despues en pos', 'pos credito'],
    answer: `**¿Cómo vender a crédito (fiado) desde el POS?**\n\n1. Arma el carrito\n2. **Selecciona el cliente** (el fiado requiere que el cliente esté registrado)\n3. En método de pago → selecciona **"Crédito"**\n4. Si el cliente tiene límite disponible → el botón COBRAR está activo\n5. Si superó el límite → botón bloqueado, el cliente debe pagar antes\n6. Clic en COBRAR → la deuda queda en Cuentas x Cobrar\n\n**¿Qué es el límite de crédito?**\nEl monto máximo que puede deber. Lo configura el dueño en el perfil del cliente.\n\n**¿Cómo ve el dueño quién debe?**\n→ Menú → Cuentas x Cobrar → lista de todos los fiados pendientes`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'pos-sin-impresora',
    keywords: ['sin impresora', 'no tengo impresora', 'como funciona sin impresora', 'pos digital', 'factura digital sin imprimir'],
    answer: `**¿Puedo usar el POS sin impresora?**\n\nSí, la impresora es opcional.\n\n**Sin impresora puedes:**\n✅ Cobrar y emitir facturas normalmente\n✅ Enviar la factura por email al cliente\n✅ Compartir el link de la factura por WhatsApp\n✅ El cliente ve su factura en el teléfono\n\n**¿Cómo enviar sin imprimir?**\n→ Después de cobrar → clic en "Enviar por Email"\n→ O comparte el link desde la factura\n\n**¿Y si el cliente quiere el recibo ahora mismo?**\nPuedes mostrarle la pantalla del computador/celular con la factura, o enviarla a su WhatsApp en el momento.`,
    roles: ['cashier', 'owner', 'admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 20 — INVENTARIO AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const inventoryExtra: KBEntry[] = [
  {
    id: 'categorias-productos',
    keywords: ['categorias', 'categorías', 'categoria producto', 'organizar productos', 'grupo producto', 'familia producto'],
    answer: `**Categorías de productos** 📂\n\n→ Productos → sección "Categorías"\n\n**¿Para qué sirven?**\n• Organizar el catálogo (Bebidas, Lácteos, Limpieza, etc.)\n• Filtrar en el POS por categoría\n• Ver reportes de ventas por categoría\n• Aplicar impuestos diferentes por categoría\n\n**¿Cómo crear una categoría?**\n1. Productos → "Categorías" → "+ Nueva"\n2. Escribe el nombre (ej: "Bebidas Frías")\n3. Guarda\n4. Cuando crees/edites un producto, selecciona esa categoría\n\n**¿Puedo filtrar en el POS?**\nSí. En el POS hay una barra de categorías. Clic en una → solo ves los productos de esa categoría. Muy útil para barras, restaurantes y farmacias.`,
  },
  {
    id: 'producto-inactivo',
    keywords: ['producto inactivo', 'desactivar producto', 'ocultar producto', 'producto no aparece pos', 'sacar producto', 'producto retirado'],
    answer: `**¿Cómo desactivar un producto que ya no vendo?**\n\n→ Productos → busca el producto → "Editar" → desactiva la opción **"Activo"** → Guardar\n\n**¿Qué pasa cuando lo desactivas?**\n• Desaparece del POS — ya no sale en búsquedas\n• No se puede vender\n• El historial de ventas anteriores se mantiene\n• Puedes reactivarlo cuando quieras\n\n**¿Cuándo desactivar vs eliminar?**\n• **Desactivar** → lo usabas y dejaste de venderlo, pero quieres el historial\n• **Eliminar** → solo si fue un error al crearlo y nunca se vendió\n\n⚠️ Si el producto tiene ventas registradas, NO lo elimines — solo desactívalo.`,
  },
  {
    id: 'reporte-stock-bajo',
    keywords: ['productos agotados', 'stock bajo reporte', 'que me falta', 'inventario critico', 'lista productos faltan', 'que comprar'],
    answer: `**¿Cómo ver qué productos necesito reponer?**\n\n→ Menú → **Inventario** → filtra por "Stock bajo" o "Agotado"\n\n**Verás:**\n• Productos con stock igual a 0 (agotados)\n• Productos que llegaron al mínimo configurado\n\n**También en el Dashboard:**\n→ Hay una sección de alertas que muestra los productos más críticos\n\n**¿Cómo configurar el mínimo de stock?**\n→ Edita el producto → campo "Stock mínimo" → escribe el número\n→ Cuando baje de ese número, aparece en la lista de stock bajo\n\n**Truco práctico:**\nRevisa esta lista antes de llamar al proveedor. Así haces un solo pedido con todo lo que te hace falta.`,
  },
  {
    id: 'historial-movimientos-inv',
    keywords: ['historial inventario', 'movimientos inventario', 'entradas salidas', 'quien movio inventario', 'auditoria inventario', 'log inventario'],
    answer: `**¿Cómo ver el historial de movimientos de un producto?**\n\n→ Inventario → busca el producto → clic en el producto → "Historial"\n\n**Ves cada movimiento con:**\n• Fecha y hora\n• Tipo: Venta / Compra / Ajuste Manual\n• Cantidad que entró o salió\n• Stock antes y después\n• Usuario que lo registró\n\n**¿Para qué sirve?**\n• Investigar por qué el inventario no cuadra\n• Ver quién hizo un ajuste manual\n• Confirmar que una compra se recibió correctamente\n\n**Ejemplo de uso:**\n"El sistema dice que tengo 5 cajas de cerveza pero físicamente tengo 8"\n→ Revisa el historial → puede que alguien hizo un ajuste incorrecto`,
  },
  {
    id: 'costo-margen',
    keywords: ['costo producto', 'margen ganancia', 'cuanto gano por producto', 'ganancia unitaria', 'precio costo', 'rentabilidad producto'],
    answer: `**Costo vs Precio — ¿Cuánto gano por producto?**\n\nCada producto tiene dos campos importantes:\n• **Costo** → Lo que te costó comprarlo al proveedor\n• **Precio de venta** → Lo que le cobras al cliente\n\n**¿Cómo calcular el margen?**\nMargen = (Precio - Costo) ÷ Precio × 100\n\n**Ejemplo:**\n• Costo: RD$50\n• Precio: RD$80\n• Ganancia bruta: RD$30\n• Margen: 37.5%\n\n**¿Dónde lo veo en el sistema?**\n→ Al editar el producto, verás el margen calculado\n→ En los reportes de ventas puedes ver la ganancia bruta por producto\n\n**¿El precio incluye o excluye ITBIS?**\nPor defecto, el precio que pones es el precio de venta al cliente (con ITBIS incluido si aplica).`,
  },
  {
    id: 'servicio-sin-inventario',
    keywords: ['producto servicio', 'servicio sin stock', 'tipo servicio', 'no tiene inventario', 'servicios profesionales', 'mano de obra'],
    answer: `**¿Cómo agregar un servicio que no tiene inventario?**\n\nLos servicios (cortes de cabello, reparaciones, consultas, mano de obra) no tienen stock — no se cuentan.\n\n**Al crear el producto/servicio:**\n→ En "Tipo" selecciona **"Servicio"**\n→ No pedirá stock inicial ni stock mínimo\n→ Se puede facturar cualquier cantidad\n\n**Ejemplos de servicios:**\n• Corte de cabello: RD$250\n• Reparación de celular: RD$800\n• Consultoría: RD$5,000 por hora\n• Instalación: RD$1,500\n\n**¿El servicio lleva ITBIS?**\nEn RD, los servicios SÍ llevan ITBIS 18% (con algunas excepciones). Verifica con tu contador si tu tipo de servicio está exento.\n\n**¿Aparece en el inventario?**\nNo. Los servicios solo aparecen en el catálogo de productos para facturar.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 21 — COMPRAS AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const purchasesExtra: KBEntry[] = [
  {
    id: 'devolucion-proveedor',
    keywords: ['devolver al proveedor', 'devolución proveedor', 'mercancia defectuosa proveedor', 'regreso mercancia', 'nota credito proveedor'],
    answer: `**¿Cómo registrar una devolución a un proveedor?**\n\nCuando regresas mercancía a un proveedor:\n\n**En el sistema:**\n→ Compras → busca la compra original → "Devolución"\n→ Selecciona los productos y cantidades que regresas\n→ El sistema genera la nota de ajuste\n→ El stock baja automáticamente\n\n**¿El proveedor me da una nota de crédito?**\nSí, el proveedor debe darte un E34 (nota de crédito). Guarda ese documento.\n\n**¿Afecta el Reporte 606?**\nSí. La devolución reduce el monto de compras del período.\n\n**¿El ITBIS se ajusta?**\nSí. Si pagaste ITBIS en esa compra, la devolución reduce el crédito de ITBIS que puedes reclamar.`,
  },
  {
    id: 'historial-compras',
    keywords: ['historial compras', 'ver compras', 'lista compras', 'compras registradas', 'que compre', 'mis compras'],
    answer: `**¿Cómo ver el historial de compras?**\n\n→ Menú → **Compras**\n\n**Puedes ver:**\n• Todas las compras por fecha\n• Filtrar por proveedor específico\n• Buscar por número de NCF del proveedor\n• Ver detalles de cada compra\n\n**Filtros útiles:**\n• Por proveedor → ver cuánto le compraste a cada uno\n• Por mes → para el reporte 606\n• Por estado → pagado vs pendiente\n\n**¿Para qué usar este historial?**\n• Verificar si una compra fue registrada\n• Comparar precios con el proveedor\n• Preparar el reporte 606 de la DGII`,
  },
  {
    id: 'reporte-compras-periodo',
    keywords: ['reporte compras', 'total compras mes', 'cuanto compre', 'gastos en compras', 'compras del mes'],
    answer: `**¿Cómo ver el total de compras del mes?**\n\n**Opción 1 — Compras:**\n→ Menú → Compras → filtra por mes\n→ En la parte inferior ves el total del período\n\n**Opción 2 — Reporte 606:**\n→ Reportes DGII → 606 → selecciona el mes\n→ El total de compras está ahí con el detalle de ITBIS\n\n**Opción 3 — Contabilidad:**\n→ Contabilidad → Estado de Resultados\n→ Muestra el Costo de Ventas (compras relacionadas con lo vendido)\n\n**¿Para comparar compras vs ventas:**\n→ Dashboard → gráfico de ingresos vs costos`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 22 — CLIENTES AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const customersExtra: KBEntry[] = [
  {
    id: 'buscar-cliente-rnc',
    keywords: ['buscar por rnc', 'cliente por rnc', 'cliente rnc no aparece', 'cliente con cedula', 'validar rnc cliente'],
    answer: `**¿Cómo buscar o agregar un cliente por RNC?**\n\n**En la lista de clientes:**\n→ Clientes → barra de búsqueda → escribe el RNC o nombre\n\n**¿El cliente tiene RNC pero no está registrado?**\n1. Clientes → "+ Nuevo Cliente"\n2. Escribe el RNC en el campo correspondiente\n3. Opcionalmente consulta el nombre en dgii.gov.do → "Consulta de RNC"\n4. Guarda\n\n**¿Por qué es importante el RNC del cliente?**\nSi el cliente es un negocio y pide factura B2B, necesitas su RNC para:\n• Usar el NCF correcto (E31 en vez de E32)\n• Que el cliente pueda usar el ITBIS de esa compra como crédito\n• Que cuadre en el Reporte 607 de la DGII\n\n**¿Qué pasa si pongo un RNC incorrecto?**\nLa DGII puede rechazar esa factura en el cruce de datos.`,
  },
  {
    id: 'exportar-clientes',
    keywords: ['exportar clientes', 'lista clientes excel', 'descargar clientes', 'base datos clientes', 'csv clientes'],
    answer: `**¿Cómo exportar la lista de clientes?**\n\n→ Clientes → botón "Exportar"\n\n**El archivo incluye:**\n• Nombre, RNC/Cédula, teléfono, email\n• Límite de crédito configurado\n• Saldo pendiente actual\n\n**¿Para qué sirve?**\n• Tener un backup de tu base de clientes\n• Hacer campañas de email/WhatsApp\n• Pasárselo al contador para auditoría\n• Analizar en Excel`,
  },
  {
    id: 'estado-cuenta-cliente',
    keywords: ['estado de cuenta cliente', 'cuanto debe cliente', 'deuda cliente detalle', 'facturas pendientes cliente', 'balance cliente'],
    answer: `**¿Cómo ver el estado de cuenta de un cliente?**\n\n**Opción 1 — Desde Clientes:**\n→ Clientes → busca el cliente → abre su perfil\n→ Verás el resumen de deuda y el historial de compras y pagos\n\n**Opción 2 — Desde Cuentas x Cobrar:**\n→ Cuentas x Cobrar → busca el cliente\n→ Verás el detalle de cada factura pendiente con su fecha\n\n**¿Puedo imprimir o enviar el estado de cuenta?**\nDesde Cuentas x Cobrar puedes ver el detalle completo. Si necesitas enviárselo al cliente, anota los datos y envíaselos por mensaje.\n\n**Información que ves:**\n• Total adeudado\n• Facturas individuales con fecha y monto\n• Pagos realizados\n• Días vencidos`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 23 — DGII AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const dgiiExtra: KBEntry[] = [
  {
    id: 'it1-anual',
    keywords: ['it1 anual', 'it-1 anual', 'resumen anual itbis', 'declaracion anual itbis', 'consolidado 12 meses'],
    answer: `**IT-1 Anual — Resumen de los 12 meses** 📅\n\n→ Reportes DGII → pestaña IT-1 → "Ver consolidado anual"\n\n**¿Qué muestra?**\nUn resumen del ITBIS de todos los meses del año:\n• ITBIS cobrado (ventas) mes a mes\n• ITBIS pagado (compras) mes a mes\n• Diferencia pagada a la DGII cada mes\n• Total del año\n\n**¿Para qué sirve?**\n• Para la declaración anual de ISR\n• Para que el contador vea el año completo\n• Para verificar que no faltó ningún mes\n• Para comparar años anteriores\n\n**¿Lo puedo descargar?**\nSí, puedes exportarlo para compartir con tu contador.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'como-pago-impuesto-online',
    keywords: ['pagar itbis online', 'pagar impuesto banco', 'donde pago dgii', 'pago electronico dgii', 'banreservas dgii', 'pago impuesto'],
    answer: `**¿Dónde y cómo pago el ITBIS a la DGII?**\n\n**Opción 1 — Banca en línea:**\nEntra a la app o web de tu banco → Pagos → DGII → Declara y paga en línea\n\n**Opción 2 — Portal DGII:**\n→ virtual.dgii.gov.do → inicia sesión → IT-1 → pago con tarjeta o transferencia\n\n**Opción 3 — Ventanilla bancaria:**\nVe a cualquier sucursal de: Banreservas, BHD León, Popular, Scotiabank, Caribe\nLleva: tu RNC y el número del formulario IT-1\n\n**¿Cuándo pagar?**\nAntes del día 20 del mes siguiente al que declaras.\n\n**¿Qué necesito para pagar?**\n• Tu RNC\n• El número de la declaración que generaste en el portal DGII\n• El monto exacto\n\n**¿Pago y declaro juntos o separado?**\nPrimero declaras (subes los reportes) → luego pagas el IT-1.`,
  },
  {
    id: 'exentos-itbis',
    keywords: ['productos exentos itbis', 'sin itbis', 'exento impuesto', 'que no paga itbis', 'tasa cero', 'itbis 0'],
    answer: `**Productos y servicios exentos de ITBIS** 🛒\n\n**Tasa 0% (exentos):**\n• Arroz, habichuelas, pasta, azúcar (artículos básicos)\n• Leche, yogur, queso (lácteos)\n• Pollo, res, cerdo (carnes frescas — no procesadas)\n• Medicamentos\n• Libros y materiales educativos\n• Servicios médicos\n• Servicios educativos\n• Alquiler de vivienda para uso habitacional\n\n**Tasa 18% (sí paga):**\n• Bebidas (refrescos, cervezas, jugos)\n• Alimentos procesados y enlatados\n• Ropa y calzado\n• Electrónicos\n• Servicios profesionales (generalmente)\n• Cosméticos\n\n**En FiscalRD:**\nAl agregar el producto, marca si aplica ITBIS o no. Si tienes dudas, pregunta a tu contador.`,
  },
  {
    id: 'auditoria-dgii',
    keywords: ['auditoria', 'auditoría', 'dgii me audito', 'visita dgii', 'fiscalizacion', 'fiscalización', 'inspeccion dgii'],
    answer: `**¿Qué hago si la DGII me audita?** 🔍\n\nNo te asustes. Muchas auditorías son de rutina.\n\n**¿Qué piden generalmente?**\n• Libros de ventas y compras (los reportes 606 y 607)\n• Facturas originales de compras\n• Estado de cuenta bancario\n• Nóminas y contratos de empleados\n• Declaraciones presentadas\n\n**¿FiscalRD te ayuda?**\nSí. Todo está registrado:\n→ Ventas → exporta el período auditado\n→ Compras → exporta el historial\n→ Reportes DGII → descarga los 606/607 del período\n\n**Consejo más importante:**\nTen todos los datos bien registrados en el sistema ANTES de que lleguen. Una auditoría no es un problema si todo cuadra.`,
  },
  {
    id: 'solicitar-ncf-dgii',
    keywords: ['solicitar ncf dgii', 'pedir ncf dgii', 'nueva secuencia dgii', 'autorizacion ncf', 'como pido ncf'],
    answer: `**¿Cómo solicitar más NCF a la DGII?**\n\n1. **Entra al portal:** virtual.dgii.gov.do\n2. Inicia sesión con tu RNC y contraseña\n3. Busca **"Solicitud de NCF"** o "Comprobantes"\n4. Selecciona el tipo (E31, E32, etc.)\n5. Indica la cantidad que quieres (ej: 1,000)\n6. Envía la solicitud\n7. La DGII la aprueba (generalmente en 1-2 días hábiles)\n8. Recibes por email el rango aprobado\n\n**¿Cuándo pedirlos?**\nCuando el indicador en FiscalRD llega al 80% de uso.\n\n**¿Cómo agregarlos en FiscalRD?**\n→ Secuencias NCF → "Nueva Secuencia"\n→ Selecciona el tipo, escribe el inicio y fin del rango\n→ Guarda → ya puedes usarlos`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 24 — NÓMINA AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const payrollExtra: KBEntry[] = [
  {
    id: 'prestaciones-laborales',
    keywords: ['prestaciones', 'prestaciones laborales', 'liquidacion', 'liquidación', 'empleado renuncia', 'empleado despedido', 'desahucio', 'preaviso'],
    answer: `**Prestaciones laborales — cuando un empleado sale** 📋\n\n**¿Qué son las prestaciones?**\nLo que la ley dominicana exige pagar cuando un empleado deja el trabajo.\n\n**Despido sin causa (desahucio):**\n• Preaviso: 28 días de salario (más de 1 año)\n• Cesantía: 23.33 días por cada año trabajado\n• Regalía pascual proporcional\n• Vacaciones proporcionales\n\n**Renuncia voluntaria:**\n• Vacaciones proporcionales\n• Regalía pascual proporcional\n• No hay cesantía (la ley no la exige en renuncia)\n\n**¿Cómo calcular en FiscalRD?**\n→ Nómina → "Liquidación de Empleado"\n→ El sistema calcula automáticamente según los años trabajados\n\n**¿Afecta el ISR?**\nLas prestaciones tienen un tratamiento especial de ISR. Consulta con tu contador.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'horas-extras',
    keywords: ['horas extras', 'horas extraordinarias', 'overtime', 'trabajo extra', 'recargo horas', 'cuanto pago horas extra'],
    answer: `**Horas Extras en República Dominicana** ⏰\n\n**Tarifas según la ley:**\n• Horas extra de día (8am-9pm): **35% adicional** sobre la hora normal\n• Horas extra de noche (9pm-12am): **50% adicional**\n• Horas extra en días feriados: **100% adicional** (doble)\n\n**Jornada normal:**\n• Diurna: 8 horas\n• Mixta: 7.5 horas\n• Nocturna: 7 horas\n\n**Cómo calcular:**\n• Salario mensual ÷ 23.83 días ÷ 8 horas = tarifa por hora\n• Hora extra diurna = tarifa × 1.35\n• Hora extra nocturna = tarifa × 1.50\n\n**En FiscalRD:**\n→ Nómina → al procesar, puedes agregar horas extras con el tipo correcto\n→ El sistema aplica el recargo automáticamente`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'boleta-pago',
    keywords: ['boleta pago', 'recibo nomina', 'comprobante salario', 'constancia pago', 'slip nomina', 'generar boleta'],
    answer: `**¿Cómo generar las boletas/recibos de pago para empleados?**\n\n→ Nómina → abre la nómina procesada → "Boletas de Pago"\n\n**¿Qué muestra la boleta?**\n• Nombre del empleado\n• Período de pago\n• Salario bruto\n• Deducciones: SFS, AFP, ISR\n• Salario neto a recibir\n• Firma del empleador\n\n**¿Cómo entregarlas?**\n• Imprimir y firmar físicamente\n• Enviar por email a cada empleado\n\n**¿Es obligatorio dar boleta?**\nSí según el Código Laboral dominicano. El empleado tiene derecho a un recibo cada vez que recibe su salario.\n\n**¿Se puede enviar por email?**\nSí. FiscalRD puede enviar la boleta al email registrado del empleado.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'historial-nomina',
    keywords: ['historial nomina', 'historial nómina', 'nominas anteriores', 'nominas pasadas', 'ver nomina mes pasado', 'buscar nomina'],
    answer: `**¿Cómo ver las nóminas anteriores?**\n\n→ Menú → **Nómina** → lista de nóminas procesadas\n\n**Puedes filtrar por:**\n• Período (mes/quincenal)\n• Estado: procesada, marcada como pagada\n\n**¿Qué información guarda?**\n• Quiénes se pagaron\n• Monto bruto y neto por empleado\n• Descuentos aplicados\n• Fecha de pago\n• Asiento contable generado\n\n**¿Para qué sirve el historial?**\n• Si un empleado dice "no me pagaron bien en marzo" → verificas\n• Para la auditoría de la TSS\n• Para el contador (ISR anual de empleados)\n• Para comparar costos de nómina mes a mes`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'bono-comision',
    keywords: ['bono', 'comision', 'comisión', 'incentivo', 'pago extra empleado', 'gratificacion', 'plus salario'],
    answer: `**¿Cómo pagar bonos o comisiones?**\n\nAl procesar la nómina puedes agregar conceptos adicionales:\n\n**En la nómina → por empleado:**\n→ Agrega un concepto "Bono" o "Comisión"\n→ Escribe el monto\n→ El sistema lo suma al salario del período\n\n**¿Los bonos tienen descuentos?**\n• SFS y AFP → Sí, aplican sobre bonos\n• ISR → Sí, si el total supera el umbral\n• Regalía pascual → Los bonos habituales SÍ se incluyen en el cálculo\n\n**Tipos de pago adicional:**\n• Bono por cumplimiento → suma al salario del mes\n• Comisión por ventas → suma al salario del mes\n• Viáticos (gastos de trabajo) → NO llevan descuentos si son reembolso real\n\n**Consejo:** Documenta los bonos por escrito para evitar confusiones.`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 25 — CONTABILIDAD AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
const accountingExtra: KBEntry[] = [
  {
    id: 'libro-diario',
    keywords: ['libro diario', 'diario contable', 'asientos', 'registros contables', 'ver asientos', 'journal'],
    answer: `**Libro Diario — El registro de todas las transacciones** 📖\n\n→ Contabilidad → pestaña "Libro Diario"\n\n**¿Qué es?**\nCada operación del negocio se registra como un "asiento": hay una cuenta que aumenta (débito) y otra que disminuye (crédito).\n\n**¿Se llena solo?**\nSí. FiscalRD crea asientos automáticamente cuando:\n✅ Emites una factura de venta\n✅ Registras una compra\n✅ Recibes un pago de cliente\n✅ Pagas a un proveedor\n✅ Procesas la nómina\n✅ Registras un gasto\n\n**¿Puedo crear asientos manuales?**\nSí. Para ajustes de contabilidad que el contador necesite hacer.\n\n**¿Para qué consultar el libro?**\n• Para rastrear el origen de un saldo\n• Para auditoría\n• Para el contador`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'asientos-contables',
    keywords: ['que son asientos', 'debito credito', 'débito crédito', 'como funciona contabilidad doble entrada', 'partida doble'],
    answer: `**¿Qué son los asientos contables?** 📚\n\nLa contabilidad de doble entrada funciona así: cada transacción afecta a DOS cuentas al mismo tiempo — una aumenta y la otra disminuye.\n\n**Ejemplo — Venta en efectivo:**\n→ **Caja** aumenta RD$1,000 (débito)\n→ **Ingresos por Ventas** aumenta RD$1,000 (crédito)\n\n**Ejemplo — Compra de mercancía:**\n→ **Inventario** aumenta RD$500 (débito)\n→ **Cuentas por Pagar** aumenta RD$500 (crédito)\n\n**¿Necesito entender esto para usar FiscalRD?**\nNo. El sistema crea todos los asientos automáticamente. Solo el contador necesita entenderlos a fondo.\n\n**Lo importante para el dueño:**\n→ Al final del mes, el Estado de Resultados te dice si ganaste o perdiste → eso es lo que importa.`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'flujo-caja-cf',
    keywords: ['flujo de caja', 'cash flow', 'liquidez', 'cuanto dinero tengo', 'dinero disponible', 'saldo disponible hoy'],
    answer: `**Flujo de Caja — ¿Cuánto dinero tienes disponible?** 💵\n\n**Diferencia entre ganancia y liquidez:**\n• Puedes tener ganancias en papel pero sin dinero en caja\n• Ejemplo: vendiste RD$100,000 a crédito → ganaste pero no tienes el efectivo\n\n**¿Cómo ver el flujo de caja?**\n→ Contabilidad → "Flujo de Caja" o "Caja y Bancos"\n\n**¿Qué muestra?**\n• Dinero que entró (cobros a clientes, otras entradas)\n• Dinero que salió (pagos a proveedores, nómina, gastos)\n• Saldo neto del período\n\n**Consejo para el dueño:**\n→ El flujo de caja es lo más importante para saber si el negocio puede pagar sus deudas\n→ Un negocio rentable pero sin liquidez puede quiebrar\n→ Cobra las cuentas por cobrar a tiempo`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'conciliacion-bancaria',
    keywords: ['conciliacion bancaria', 'conciliación bancaria', 'cuadre banco', 'estado cuenta banco vs sistema', 'diferencia banco sistema'],
    answer: `**Conciliación Bancaria — cuadrar el banco con el sistema** 🏦\n\n**¿Por qué puede haber diferencias?**\n• Cheques emitidos que el banco aún no procesó\n• Depósitos en tránsito\n• Comisiones bancarias no registradas\n• Errores de digitación\n\n**¿Cómo hacer la conciliación?**\n1. Descarga el estado de cuenta del banco\n2. → Contabilidad → Caja y Bancos → "Conciliación"\n3. Marca las transacciones que aparecen en ambos lados\n4. Las que no cuadran → investígalas\n5. Ajusta los que sean errores del sistema\n\n**¿Cada cuánto?**\nIdealmente cada mes. Mínimo cada trimestre.\n\n**¿Para qué sirve?**\n→ Detectar cobros duplicados\n→ Identificar gastos que olvidaste registrar\n→ Confirmar que los pagos llegaron al banco`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 26 — DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const dashboard: KBEntry[] = [
  {
    id: 'dashboard-que-es',
    keywords: ['dashboard', 'que es el dashboard', 'pantalla principal', 'inicio sistema', 'resumen negocio', 'home'],
    answer: `**Dashboard — El panel principal del negocio** 📊\n\n→ Menú → **Dashboard**\n\n**¿Qué muestra?**\n\n• 💰 **Ventas del mes** → total facturado este mes\n• 📦 **Compras del mes** → total comprado a proveedores\n• 💳 **Por cobrar** → deuda total de clientes\n• 🏦 **Por pagar** → lo que debes a proveedores\n• 📈 **Gráfico de ventas** → tendencia diaria/semanal\n• ⚠️ **Alertas de stock** → productos agotados o bajos\n• 🔢 **NCF disponibles** → cuántas facturas puedes emitir\n\n**¿Se actualiza en tiempo real?**\nSí. Cada vez que se emite una factura o se registra una compra, los números cambian.\n\n**¿Quién puede ver el Dashboard?**\nOwner, Admin y Accountant. La cajera NO ve el Dashboard (por diseño de seguridad).`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'dashboard-cero',
    keywords: ['dashboard en cero', 'dashboard no muestra datos', 'datos no aparecen dashboard', 'ventas cero dashboard', 'dashboard vacio'],
    answer: `**¿Por qué el Dashboard muestra RD$0.00 o está vacío?**\n\n**Causas más comunes:**\n\n**1. Filtro de fechas incorrecto**\n→ Verifica que el período seleccionado incluya tus ventas\n→ Cambia el filtro a "Este mes" o "Todo"\n\n**2. Las facturas están en Borrador, no Emitidas**\n→ Solo las facturas con estado "Emitida" cuentan en el Dashboard\n→ Ve a Ventas y verifica el estado de tus facturas\n\n**3. El negocio es nuevo y no tiene ventas aún**\n→ Normal. En cuanto emitas la primera factura aparecerán los datos\n\n**4. Problema de conexión/datos**\n→ Recarga la página (F5)\n→ Cierra sesión y vuelve a entrar\n\n**5. Filtro por sucursal/período**\n→ Verifica que no haya un filtro activo que excluya tus datos`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'kpis-dashboard',
    keywords: ['kpi', 'indicadores', 'que significan los numeros', 'interpretar dashboard', 'ticket promedio', 'margen bruto', 'como leer dashboard'],
    answer: `**¿Qué significa cada número del Dashboard?** 📈\n\n• **Ventas del mes:** Todo lo que facturaste (con ITBIS incluido)\n• **Ticket promedio:** Cuánto gasta un cliente en promedio por visita\n  → Ventas ÷ Número de facturas = Ticket promedio\n• **Número de facturas:** Cuántas transacciones hiciste\n• **Compras del mes:** Cuánto gastaste en mercancía\n• **Margen bruto:** (Ventas - Costo) ÷ Ventas × 100\n\n**¿Qué margen es bueno?**\n• Colmados/supermercados: 15-25%\n• Restaurantes: 60-70%\n• Servicios: 50-80%\n• Ropa/calzado: 40-60%\n\n**¿El ticket promedio subió o bajó?**\n→ Si bajó: los clientes están comprando menos por visita\n→ Si subió: los clientes compran más o los precios subieron`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 27 — REPORTES Y ANÁLISIS
// ═══════════════════════════════════════════════════════════════════════════════
const reports: KBEntry[] = [
  {
    id: 'reporte-ventas-diario',
    keywords: ['reporte diario', 'reporte del dia', 'ventas de hoy reporte', 'informe diario', 'cierre del dia reporte'],
    answer: `**Reporte diario de ventas**\n\n**Opción 1 — Control de Caja:**\n→ Al cerrar el turno, el sistema genera automáticamente:\n• Total ventas por método de pago\n• Número de facturas\n• Gastos del día\n• Diferencia de caja (sobrante/faltante)\n\n**Opción 2 — Ventas filtradas:**\n→ Ventas → filtra por "Hoy"\n→ Ves todas las facturas del día\n\n**Opción 3 — Dashboard:**\n→ Muestra las ventas del día de hoy en tiempo real\n\n**¿Puedo imprimir el reporte diario?**\nSí. Al cerrar la caja se puede imprimir el resumen del turno (también llamado "Reporte Z").`,
  },
  {
    id: 'reporte-por-cajero',
    keywords: ['ventas por cajero', 'ventas por empleado', 'quien vendio mas', 'rendimiento cajero', 'facturacion por usuario'],
    answer: `**¿Cómo ver las ventas por cajero o empleado?**\n\n→ Ventas → columna "Usuario" o filtro de usuario\n\n**¿Qué puedes ver?**\n• Quién emitió cada factura\n• Total por cajero en el período\n• Número de facturas por cajero\n\n**¿Para qué sirve?**\n• Ver quién está vendiendo más\n• Detectar si alguien no está registrando ventas\n• Comparar rendimiento entre cajeros\n• Calcular comisiones por ventas si aplica\n\n**También desde Control de Caja:**\n→ Cada turno está asociado al cajero que lo abrió\n→ El reporte de cierre muestra las ventas de ese cajero en ese turno`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'productos-mas-vendidos',
    keywords: ['productos mas vendidos', 'que vendo mas', 'top productos', 'bestsellers', 'mas populares', 'producto estrella'],
    answer: `**¿Cómo ver qué productos se venden más?**\n\n→ Dashboard → sección "Top Productos"\nor\n→ Reportes → "Ventas por Producto"\n\n**¿Qué muestra?**\n• Los 10 productos más vendidos del período\n• Cantidad vendida vs ingresos generados\n• Comparación con el período anterior\n\n**¿Para qué sirve?**\n• Saber qué nunca puede faltarte en inventario\n• Negociar mejor precio con el proveedor de esos productos\n• Identificar qué productos no se venden (para discontinuar)\n• Planificar promociones`,
    roles: ['owner', 'admin', 'accountant'],
  },
  {
    id: 'comparar-periodos',
    keywords: ['comparar mes', 'comparar periodos', 'mes vs mes', 'año vs año', 'crecimiento ventas', 'comparativa ventas'],
    answer: `**¿Cómo comparar ventas entre períodos?**\n\n**En el Dashboard:**\n→ Hay un gráfico de barras que muestra los últimos 6 meses\n→ Puedes ver si las ventas van subiendo o bajando\n\n**En Ventas:**\n1. Filtra el período 1 (ej: enero) → anota el total\n2. Filtra el período 2 (ej: febrero) → compara\n\n**En el Estado de Resultados:**\n→ Contabilidad → Estado de Resultados\n→ Selecciona el mes que quieres ver\n→ Compara con el mes anterior\n\n**Métricas importantes a comparar:**\n• ¿Las ventas crecieron?\n• ¿El margen mejoró o empeoró?\n• ¿Los gastos subieron más que las ventas?`,
    roles: ['owner', 'admin', 'accountant'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 28 — SOLUCIÓN DE PROBLEMAS
// ═══════════════════════════════════════════════════════════════════════════════
const troubleshooting: KBEntry[] = [
  {
    id: 'no-puedo-entrar',
    keywords: ['no puedo entrar', 'no me deja entrar', 'no puedo iniciar sesion', 'contraseña incorrecta', 'usuario no existe', 'acceso denegado'],
    answer: `**¿No puedes entrar al sistema?** 🔐\n\n**Paso 1 — Verifica el email:**\n→ Asegúrate de escribir el email exactamente como te lo dieron\n→ Mayúsculas y minúsculas importan\n\n**Paso 2 — Verifica la contraseña:**\n→ Fíjate que el CAPS LOCK no esté activado\n→ Prueba escribirla despacio\n\n**Paso 3 — Recupera la contraseña:**\n→ Clic en "¿Olvidaste tu contraseña?"\n→ Escribe tu email → recibirás un link\n→ Revisa la carpeta de SPAM también\n\n**Paso 4 — Tu cuenta fue desactivada:**\n→ Si eres empleado/cajero → habla con el dueño o admin\n→ Si eres dueño → contacta al soporte de FiscalRD\n\n**¿El sistema dice "cuenta bloqueada"?**\n→ Espera 15 minutos e intenta de nuevo\n→ O usa la opción de recuperación por email`,
  },
  {
    id: 'pagina-no-carga',
    keywords: ['no carga', 'pagina en blanco', 'pantalla blanca', 'se cuelga', 'se congela', 'error 500', 'error 404', 'página no carga'],
    answer: `**La página no carga o se queda en blanco** 🔄\n\n**Soluciones en orden:**\n\n1. **Recarga la página** → F5 o Ctrl+R (Cmd+R en Mac)\n\n2. **Verifica el internet** → Abre otra página web. ¿Carga?\n\n3. **Limpia caché del navegador:**\n   → Ctrl+Shift+Delete → "Caché e imágenes" → Borrar\n   → Recarga\n\n4. **Prueba otro navegador:**\n   → Chrome, Firefox, Edge\n   → Si en uno falla y en otro funciona → problema del navegador\n\n5. **Cierra sesión y vuelve a entrar:**\n   → Botón "Salir" → vuelve a iniciar sesión\n\n6. **¿El problema es solo en un módulo?**\n   → Guarda lo que estabas haciendo\n   → Ve a otro módulo y vuelve\n\n**Si nada funciona:** Contacta al administrador de FiscalRD.`,
  },
  {
    id: 'error-al-guardar',
    keywords: ['error al guardar', 'no guarda', 'no se guarda', 'error formulario', 'campos requeridos', 'validacion error'],
    answer: `**¿Por qué no puedo guardar?** ⚠️\n\n**Causa más común — Campo obligatorio vacío:**\n→ El sistema marca en rojo los campos requeridos\n→ Revisa que no haya ningún campo vacío o en rojo\n\n**Campos que más se olvidan:**\n• RNC del proveedor en una compra\n• Precio en cero en un producto\n• Fecha de la transacción\n• Tipo de NCF en una factura\n\n**¿Dice "RNC inválido"?**\n→ Verifica que el RNC tiene 9 dígitos (empresa) o 11 (persona)\n→ No incluir guiones ni espacios\n\n**¿Dice "email inválido"?**\n→ Verifica el formato: usuario@dominio.com\n\n**¿El botón Guardar no responde?**\n→ Puede ser un error de conexión\n→ Recarga la página (perderás los cambios) e intenta de nuevo`,
  },
  {
    id: 'sistema-lento',
    keywords: ['sistema lento', 'tarda mucho', 'muy lento', 'demora', 'tarda en cargar', 'cargando eternamente'],
    answer: `**¿El sistema está lento?** 🐌\n\n**Causas y soluciones:**\n\n**1. Internet lento:**\n→ Verifica la velocidad de tu internet\n→ El sistema necesita al menos 2-3 Mbps para funcionar bien\n\n**2. Muchas pestañas abiertas:**\n→ Cierra pestañas que no necesites\n\n**3. El dispositivo está lento:**\n→ Cierra otras aplicaciones (especialmente en celular)\n→ Reinicia el dispositivo\n\n**4. Muchos datos filtrando:**\n→ Si buscas facturas de todo el año, tarda más\n→ Filtra por mes para resultados más rápidos\n\n**5. Hora pico:**\n→ Si muchos usuarios entran al mismo tiempo puede tardar un poco más\n\n**¿El POS está lento cuando hay cola?**\n→ Ten la pestaña del POS siempre abierta, no la cierres entre ventas`,
  },
  {
    id: 'impresora-no-funciona',
    keywords: ['impresora no funciona', 'no imprime', 'impresora error', 'no sale recibo', 'problema impresora', 'impresora termica falla'],
    answer: `**¿La impresora no funciona?** 🖨️\n\n**Checklist:**\n\n✅ **¿Está encendida?** → Verifica el botón de poder y la luz indicadora\n\n✅ **¿Está conectada?** → USB bien conectado a la computadora\n\n✅ **¿Tiene papel?** → Las térmicas se quedan sin papel sin avisar mucho\n\n✅ **¿Es la impresora correcta?** → Al imprimir, en el diálogo selecciona la impresora correcta\n\n✅ **¿Instalaron el driver?** → Las térmicas necesitan un controlador instalado en Windows\n\n**Para impresoras térmicas 80mm:**\n→ Usa el botón "Recibo Térmico 80mm" en FiscalRD\n→ No uses "Imprimir Normal" para el rollo térmico\n→ En el diálogo de impresión → sin márgenes, tamaño de papel: 80mm\n\n**¿Imprime pero sale cortado?**\n→ Configura el tamaño de papel en las preferencias de la impresora`,
    roles: ['cashier', 'owner', 'admin'],
  },
  {
    id: 'perdi-datos',
    keywords: ['perdi datos', 'perdí datos', 'se borró', 'no encuentro factura', 'desaparecio registro', 'factura perdida'],
    answer: `**¿Se perdieron datos o no encuentras algo?** 🔍\n\n**Antes de preocuparte, verifica:**\n\n1. **Filtros activos:**\n   → ¿Hay un filtro de fechas que excluye lo que buscas?\n   → Quita todos los filtros y busca de nuevo\n\n2. **Estado incorrecto:**\n   → ¿Estás filtrando por "Emitidas" pero la factura es un borrador?\n   → Muestra todos los estados\n\n3. **Búsqueda específica:**\n   → Escribe el número exacto del NCF o el nombre del cliente\n\n4. **¿Fue anulada?**\n   → Filtra por estado "Anulada" — puede estar ahí\n\n**Los datos nunca se borran** — Las facturas emitidas son permanentes por requerimiento legal. Solo se pueden anular, nunca eliminar.\n\n**Si definitivamente no está:**\n→ Contacta al administrador — puede haber un problema de sincronización`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 29 — EMPLEADOS (HORARIO Y TAREAS)
// ═══════════════════════════════════════════════════════════════════════════════
const employeeSection: KBEntry[] = [
  {
    id: 'ver-mi-horario',
    keywords: ['ver horario', 'mi horario', 'turno', 'cuando trabajo', 'dias que trabajo', 'horario semana'],
    answer: `**¿Cómo ver tu horario de trabajo?** 📅\n\n→ Menú → **Mi Horario** (o "Horario")\n\nVerás:\n• Los días y horas que te asignaron esta semana\n• Próximas semanas también\n• Si tienes algún turno pendiente de confirmar\n\n**¿Qué hago si hay un error en mi horario?**\n→ Habla con tu jefe o administrador\n→ Ellos lo corrigen desde el módulo de Empleados\n\n**¿Puedo ver el horario de mis compañeros?**\nSolo el administrador y dueño pueden ver todos los horarios.`,
    roles: ['employee', 'cashier'],
  },
  {
    id: 'marcar-asistencia',
    keywords: ['marcar asistencia', 'checkin', 'check-in', 'entrada salida', 'marcar entrada', 'registrar llegada'],
    answer: `**¿Cómo registrar mi entrada/salida?** ⏰\n\n→ Menú → **Mi Horario** → botón "Marcar Entrada" al llegar\n→ Al salir → botón "Marcar Salida"\n\n**¿Por qué es importante marcar?**\n• El sistema registra tu asistencia\n• El dueño puede ver quién llegó tarde o salió temprano\n• Para el cálculo de horas trabajadas si es pago por hora\n\n**¿Qué pasa si olvidé marcar?**\n→ Habla con el administrador para que registre tu asistencia manualmente`,
    roles: ['employee', 'cashier'],
  },
  {
    id: 'ver-mi-salario',
    keywords: ['mi salario', 'cuanto me pagan', 'ver mi pago', 'mi sueldo', 'cuanto gano', 'mi nomina'],
    answer: `**¿Cómo ver tu información de salario?**\n\nComo empleado, puedes ver:\n→ **Mi Horario** → sección de tu perfil\n\n**¿Puedo ver mis boletas de pago?**\nSí, cuando el admin procesa la nómina y genera las boletas, puedes recibir la tuya por email o verla en el sistema.\n\n**¿Dónde veo mis descuentos (SFS, AFP)?**\nEn tu boleta de pago. Si no tienes acceso, pídela a tu administrador.\n\n**¿Tengo dudas sobre mi pago?**\n→ Habla directamente con el dueño o administrador\n→ FiscalRD registra todo, así que pueden verificar cualquier duda`,
    roles: ['employee', 'cashier'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 30 — NOTIFICACIONES Y ALERTAS
// ═══════════════════════════════════════════════════════════════════════════════
const notificationsSection: KBEntry[] = [
  {
    id: 'notificaciones-sistema',
    keywords: ['notificaciones', 'alertas', 'avisos', 'campana', 'que son notificaciones', 'notificacion email'],
    answer: `**Notificaciones en FiscalRD** 🔔\n\n**¿Qué notificaciones recibes?**\n• ⚠️ Stock bajo o agotado\n• 💰 Pago de cliente recibido\n• 📅 Recordatorio de declaración DGII (antes del día 20)\n• 🔢 NCF casi agotados (80% de uso)\n• 👤 Nuevo usuario creado en tu cuenta\n• 📧 Confirmación de envío de factura por email\n\n**¿Dónde aparecen?**\n• En la campanita 🔔 del menú principal\n• Por email (si están configuradas)\n\n**¿Cómo configurar qué alertas recibir?**\n→ Configuración → Notificaciones → activa/desactiva las que quieras`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'alerta-stock-minimo',
    keywords: ['alerta stock', 'notificacion inventario', 'me avisan cuando baja stock', 'alerta producto agotado', 'configurar alerta inventario'],
    answer: `**¿Cómo configurar alertas de stock bajo?**\n\n**Paso 1 — Configura el stock mínimo por producto:**\n→ Productos → edita el producto → campo "Stock mínimo"\n→ Escribe la cantidad (ej: 5 unidades)\n\n**Paso 2 — El sistema te avisa automáticamente cuando:**\n• El stock baja del mínimo → aparece alerta en el Dashboard\n• El producto llega a 0 → alerta urgente\n\n**¿Dónde veo las alertas?**\n• Dashboard → sección de alertas de inventario\n• Notificaciones → campana en el menú\n\n**¿Me llega email?**\nSí si tienes las notificaciones de email activadas en Configuración.\n\n**Truco:** Pon el mínimo en la cantidad que tardas en recibir un pedido del proveedor. Así siempre tienes tiempo de pedir antes de agotarte.`,
    roles: ['owner', 'admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 31 — SEGURIDAD Y ACCESO
// ═══════════════════════════════════════════════════════════════════════════════
const securitySection: KBEntry[] = [
  {
    id: 'desactivar-usuario',
    keywords: ['desactivar usuario', 'bloquear usuario', 'empleado se fue', 'eliminar acceso', 'quitar acceso', 'suspender usuario'],
    answer: `**¿Cómo quitar acceso a un empleado que se fue?**\n\n→ Configuración → Usuarios → busca al usuario → **"Desactivar"**\n\n**¿Qué pasa cuando se desactiva?**\n• No puede entrar más al sistema\n• Sus datos y registros se mantienen (historial intacto)\n• Puede reactivarse en cualquier momento\n\n**¿Cuándo hacerlo?**\n→ Inmediatamente cuando el empleado renuncia o es despedido\n→ No esperes — mientras tenga acceso puede ver información sensible\n\n**¿Se puede ver quién se conectó cuándo?**\nSí. El sistema registra los accesos. El admin puede ver el historial de actividad.`,
    roles: ['owner', 'admin'],
  },
  {
    id: 'seguridad-consejos',
    keywords: ['seguridad sistema', 'consejo seguridad', 'proteger cuenta', 'alguien entro mi cuenta', 'acceso no autorizado'],
    answer: `**Consejos de seguridad para FiscalRD** 🔒\n\n**Para el dueño:**\n✅ Nunca compartas tu contraseña con nadie\n✅ Crea usuarios separados para cada empleado\n✅ La cajera solo debe tener rol "Cashier"\n✅ Desactiva usuarios inmediatamente cuando alguien renuncia\n✅ Cambia las contraseñas cada 3-6 meses\n\n**Para las contraseñas:**\n✅ Mínimo 8 caracteres\n✅ Mezcla letras, números y símbolos\n✅ No uses fechas de nacimiento ni nombres\n\n**Si sospechas que alguien entró sin permiso:**\n1. Cambia tu contraseña inmediatamente\n2. Revisa el historial de actividad\n3. Verifica si hay facturas o cambios que no reconoces\n4. Contacta al soporte de FiscalRD`,
    roles: ['owner', 'admin'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// JUNTA TODO
// ═══════════════════════════════════════════════════════════════════════════════
export const KNOWLEDGE_BASE: KBEntry[] = [
  ...general,
  ...sales,
  ...salesExtra,
  ...pos,
  ...posExtra,
  ...inventory,
  ...inventoryExtra,
  ...purchases,
  ...purchasesExtra,
  ...customers,
  ...customersExtra,
  ...dgii,
  ...dgiiExtra,
  ...payroll,
  ...payrollExtra,
  ...accounting,
  ...accountingExtra,
  ...cashBank,
  ...arAp,
  ...ncfSeq,
  ...ecf,
  ...colmado,
  ...configuration,
  ...legal,
  ...superadmin,
  ...dashboard,
  ...reports,
  ...troubleshooting,
  ...employeeSection,
  ...notificationsSection,
  ...securitySection,
];

// ═══════════════════════════════════════════════════════════════════════════════
// SALUDOS POR ROL
// ═══════════════════════════════════════════════════════════════════════════════
export const ROLE_GREETINGS: Record<string, string> = {
  owner: `¡Hola, dueño! 👋 Soy tu asistente de FiscalRD.\n\nEstoy aquí para ayudarte con cualquier duda — desde cómo hacer una factura hasta cómo declarar a la DGII. Pregunta lo que quieras, te explico como si fuera la primera vez. 😊\n\n¿En qué te ayudo hoy?`,
  admin: `¡Hola, administrador! 👋 Soy tu asistente de FiscalRD.\n\nPuedo ayudarte con ventas, compras, reportes DGII, inventario, nómina y más. ¿Qué necesitas?`,
  cashier: `¡Hola! 👋 Soy tu asistente para el Punto de Venta.\n\nTe puedo ayudar con:\n• 🛒 Cómo vender en el POS\n• 💵 Cómo cobrar (efectivo, tarjeta, transferencia)\n• 📴 Qué hacer si se va el internet\n• 🏦 Cómo abrir y cerrar la caja\n• ❓ Cualquier duda del día a día\n\n¡Pregunta sin miedo!`,
  accountant: `¡Hola, contador! 👋 Soy el asistente de FiscalRD.\n\nPuedo ayudarte con reportes DGII (606, 607, 608, IT-1), contabilidad, nómina, cuentas por cobrar/pagar y estados financieros. ¿Qué necesitas?`,
  employee: `¡Hola! 👋 Soy el asistente de FiscalRD. ¿En qué te puedo ayudar?`,
  super_admin: `¡Hola, superadmin! 👋 Puedo ayudarte con la gestión de la plataforma, configuración de Alanube, planes y tenants. ¿Qué necesitas?`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREGUNTAS RÁPIDAS POR ROL
// ═══════════════════════════════════════════════════════════════════════════════
export const QUICK_QUESTIONS: Record<string, string[]> = {
  owner: [
    '¿Cómo hago una factura?',
    '¿Cuánto gané este mes?',
    '¿Cómo declaro a la DGII?',
    '¿Qué es el ITBIS?',
    '¿Cómo pago la nómina?',
    '¿Cuándo vence la declaración?',
    '¿Cómo agrego un empleado?',
    '¿Qué son las prestaciones?',
  ],
  admin: [
    '¿Cómo hago una factura?',
    '¿Cómo registro una compra?',
    '¿Cómo genero el reporte 607?',
    '¿Cómo agrego un empleado?',
    '¿Cómo ajusto el inventario?',
    '¿Cómo proceso una devolución?',
    '¿Cómo veo las ventas por cajero?',
  ],
  cashier: [
    '¿Cómo abro la caja?',
    '¿Cómo cobro en efectivo?',
    '¿Qué hago si se va el internet?',
    '¿Cómo cierro la caja?',
    '¿Cómo uso el escáner?',
    '¿El botón cobrar no funciona?',
    '¿Cómo hago un pago mixto?',
    '¿Cómo vendo a crédito?',
  ],
  accountant: [
    '¿Qué es el IT-1?',
    '¿Cuándo debo declarar?',
    '¿Cómo genero el reporte 606?',
    '¿Cómo funciona la contabilidad?',
    '¿Cómo registro un gasto?',
    '¿Qué es la conciliación bancaria?',
    '¿Cómo exportar el IT-1 anual?',
  ],
  employee: [
    '¿Cómo ver mi horario?',
    '¿Cómo marco mi asistencia?',
    '¿Cómo veo mis boletas de pago?',
  ],
  super_admin: [
    '¿Cómo configuro Alanube?',
    '¿Cómo impersono un negocio?',
    '¿Cómo cambio el plan de un tenant?',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESPUESTAS POR DEFECTO
// ═══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_RESPONSES = [
  `No tengo una respuesta exacta para eso. 🤔 Pero puedo ayudarte con:\n\n• **Facturas** — cómo crear, emitir, anular\n• **POS** — cómo usar el punto de venta\n• **DGII** — reportes y cuándo presentarlos\n• **Inventario** — control de productos\n• **Nómina** — pago de empleados\n• **Contabilidad** — ganancias y gastos\n\n¿Sobre cuál quieres saber?`,
  `Hmm, no encontré información exacta sobre eso. 🤔\n\nIntenta preguntarme así:\n• "¿Cómo hago una factura?"\n• "¿Qué es el ITBIS?"\n• "¿Cómo registro una compra?"\n• "¿Cuándo debo declarar a la DGII?"\n• "¿Cómo pago la nómina?"`,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════════════════
export function findAnswer(query: string, userRole?: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:]/g, '');

  const q = normalize(query);

  const available = KNOWLEDGE_BASE.filter(e =>
    !e.roles || !userRole || e.roles.includes(userRole as UserRole)
  );

  const scored = available.map(entry => {
    let score = 0;
    for (const kw of entry.keywords) {
      const kwNorm = normalize(kw);
      if (q === kwNorm) { score += kwNorm.split(' ').length * 10; continue; }
      if (q.includes(kwNorm)) { score += kwNorm.split(' ').length * 3; continue; }
      const words = kwNorm.split(' ');
      for (const w of words) {
        if (w.length > 3 && q.includes(w)) score += 1;
      }
    }
    return { entry, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0) return best.entry.answer;

  return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
}

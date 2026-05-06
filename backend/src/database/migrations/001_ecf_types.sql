-- ============================================================
-- MIGRACIÓN: B-Series NCF → e-CF (Ley 32-23)
-- Ejecutar UNA vez en la base de datos de Supabase
-- ============================================================

-- 1. Cambiar ncf_sequences.ncfType de enum a varchar
ALTER TABLE ncf_sequences
  ALTER COLUMN "ncfType" TYPE varchar(10)
  USING "ncfType"::varchar;

-- 2. Cambiar sales.ncfType de enum a varchar
ALTER TABLE sales
  ALTER COLUMN "ncfType" TYPE varchar(10)
  USING "ncfType"::varchar;

-- 3. Actualizar valores existentes en ncf_sequences (B → E)
UPDATE ncf_sequences SET "ncfType" = 'E32' WHERE "ncfType" = 'B01';  -- Consumidor Final
UPDATE ncf_sequences SET "ncfType" = 'E31' WHERE "ncfType" = 'B02';  -- Crédito Fiscal
UPDATE ncf_sequences SET "ncfType" = 'E45' WHERE "ncfType" = 'B14';  -- Gubernamental
UPDATE ncf_sequences SET "ncfType" = 'E44' WHERE "ncfType" = 'B15';  -- Régimen Especial
UPDATE ncf_sequences SET "ncfType" = 'E41' WHERE "ncfType" = 'B16';  -- Compras
UPDATE ncf_sequences SET "ncfType" = 'E31' WHERE "ncfType" = 'B17';  -- Comp. Electrónico

-- 4. Actualizar valores existentes en sales (B → E)
UPDATE sales SET "ncfType" = 'E32' WHERE "ncfType" = 'B01';
UPDATE sales SET "ncfType" = 'E31' WHERE "ncfType" = 'B02';
UPDATE sales SET "ncfType" = 'E45' WHERE "ncfType" = 'B14';
UPDATE sales SET "ncfType" = 'E44' WHERE "ncfType" = 'B15';
UPDATE sales SET "ncfType" = 'E41' WHERE "ncfType" = 'B16';

-- 5. Eliminar los enum types viejos de PostgreSQL (opcional, limpieza)
DROP TYPE IF EXISTS ncf_sequences_ncftype_enum;
DROP TYPE IF EXISTS sales_ncftype_enum;

-- 6. Agregar columnas nuevas a tenants si no existen
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS "businessType" varchar(30) DEFAULT 'otro',
  ADD COLUMN IF NOT EXISTS "plan" varchar(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "planExpiresAt" timestamp,
  ADD COLUMN IF NOT EXISTS "alanubeApiKey" varchar(255),
  ADD COLUMN IF NOT EXISTS "alanubeSandbox" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "dgiiCertificateId" varchar(255),
  ADD COLUMN IF NOT EXISTS "ecfSequence" integer DEFAULT 0;

-- 7. Crear tabla platform_settings si no existe
CREATE TABLE IF NOT EXISTS platform_settings (
  key varchar(100) PRIMARY KEY,
  value text,
  description varchar(255),
  "updatedAt" timestamp DEFAULT now()
);

-- 8. Insertar settings iniciales
INSERT INTO platform_settings (key, value, description)
VALUES
  ('platform_name',       'FiscalRD',              'Nombre de la plataforma'),
  ('platform_url',        'https://fiscalrd.do',   'URL principal'),
  ('support_email',       'soporte@fiscalrd.do',   'Email de soporte'),
  ('open_registration',   'true',                  'Registro público habilitado'),
  ('require_approval',    'false',                 'Aprobación manual de negocios'),
  ('alanube_sandbox',     'true',                  'Modo sandbox Alanube'),
  ('alanube_api_key_global', '',                   'API Key global de Alanube')
ON CONFLICT (key) DO NOTHING;

-- ✅ Migración completada

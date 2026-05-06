/** Retorna la fecha actual en la zona horaria de República Dominicana (America/Santo_Domingo, UTC-4).
 *  Formato: YYYY-MM-DD — compatible con columnas date de PostgreSQL.
 */
export function todayDR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date());
}

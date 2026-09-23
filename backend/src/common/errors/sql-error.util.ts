import * as sql from 'mssql';

/** SQL Server error numbers for a UNIQUE constraint/index violation. */
const UNIQUE_VIOLATION_ERROR_NUMBERS = new Set([2627, 2601]);

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof sql.RequestError && UNIQUE_VIOLATION_ERROR_NUMBERS.has(err.number ?? 0);
}

/** SQL Server error number for a FOREIGN KEY (REFERENCE) constraint violation. */
const FOREIGN_KEY_VIOLATION_ERROR_NUMBER = 547;

export function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof sql.RequestError && err.number === FOREIGN_KEY_VIOLATION_ERROR_NUMBER;
}

/** Quotes a cell only when it would otherwise break the row (RFC 4180). */
export function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Prefixes an apostrophe onto free text a spreadsheet would evaluate as a
 * formula rather than display. Quoting does not stop evaluation, so text a
 * participant chose (a registered name, an experiment label) has to be
 * neutralized before it reaches the cell. A leading `-` followed by a digit is
 * left alone so negative numbers survive.
 */
export function neutralizeFormula(value: string): string {
  return /^[=+@\t\r]/.test(value) || /^-(?!\d)/.test(value) ? `'${value}` : value
}

/** Triggers a browser download of `csv` under `filename`. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

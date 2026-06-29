/**
 * Convert an array of objects to CSV format.
 * Handles values containing commas, quotes, or newlines.
 */
export function toCsv<T extends Record<string, any>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return ''

  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[])
  const escape = (val: any): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const header = cols.map((c) => escape(c)).join(',')
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n')
  return header + '\n' + body
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Format an ISO date for use in filenames (YYYY-MM-DD-HHMM).
 */
export function fileTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

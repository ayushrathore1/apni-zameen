/**
 * Export utilities for generating PDFs and CSVs.
 */

/**
 * Export data as CSV file.
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Build header row
  const headers = columns.map(col => col.label || col.key)
  
  // Build data rows
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key]
      // Handle nested values
      if (col.accessor) {
        return col.accessor(item)
      }
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    }).join(',')
  )

  // Combine header and rows
  const csvContent = [headers.join(','), ...rows].join('\n')

  // Download file
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Export data as JSON file.
 */
export function exportToJSON(data, filename) {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

/**
 * Generate printable HTML report for PDF.
 */
export function generatePrintableReport(data, reportConfig) {
  const {
    title = 'Report',
    subtitle = '',
    generatedAt = new Date().toISOString(),
    columns = [],
    summary = {},
  } = reportConfig

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 40px;
          color: #1a1a1a;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .subtitle { color: #666; margin-bottom: 24px; }
        .meta { font-size: 12px; color: #888; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f5f5f5; font-weight: 600; }
        .summary { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .summary-item { display: inline-block; margin-right: 32px; }
        .summary-value { font-size: 24px; font-weight: 700; color: #1e40af; }
        .summary-label { font-size: 12px; color: #666; }
        .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .badge-critical { background: #fee2e2; color: #991b1b; }
        .badge-major { background: #fef3c7; color: #92400e; }
        .badge-minor { background: #fef3c7; color: #92400e; }
        @media print {
          body { margin: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
      <p class="meta">Generated: ${new Date(generatedAt).toLocaleString()}</p>
      
      ${Object.keys(summary).length > 0 ? `
        <div class="summary">
          ${Object.entries(summary).map(([label, value]) => `
            <div class="summary-item">
              <div class="summary-value">${value}</div>
              <div class="summary-label">${label}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label || col.key}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${columns.map(col => `<td>${formatCellValue(item[col.key], col)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
}

/**
 * Open print dialog with generated report.
 */
export function printReport(data, reportConfig) {
  const html = generatePrintableReport(data, reportConfig)
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}

// Helper: Download file
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Helper: Format cell value for HTML
function formatCellValue(value, column) {
  if (value === null || value === undefined) return '-'
  
  if (column.type === 'badge') {
    return `<span class="badge badge-${value}">${value}</span>`
  }
  
  if (column.type === 'date') {
    return new Date(value).toLocaleDateString()
  }
  
  return String(value)
}

/**
 * Dedicated 80mm thermal receipt printer utility.
 * Injects portrait 80mm auto-height page rules and isolated iframe,
 * guaranteeing a SINGLE-PAGE clean thermal receipt with zero background UI.
 */
export function printElement(elementId, title = "Choco D'or Thermal Bill") {
  const elem = document.getElementById(elementId)
  if (!elem) {
    window.print()
    return
  }

  // Remove any previous print iframe
  const existingIframe = document.getElementById('chocodor_print_frame')
  if (existingIframe) {
    existingIframe.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'chocodor_print_frame'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: 80mm auto portrait;
            margin: 0mm !important;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm 3mm !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace, sans-serif;
            font-size: 11px;
            line-height: 1.3;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
          }
          th, td {
            padding: 3px 0 !important;
          }
          img {
            max-width: 100%;
            display: block;
            margin: 0 auto;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure no page breaks inside receipt */
          #printable-invoice {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
          }
        </style>
      </head>
      <body>
        ${elem.innerHTML}
      </body>
    </html>
  `)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  }, 300)
}

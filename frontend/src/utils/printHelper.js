/**
 * Dedicated thermal & standard receipt printer utility.
 * Injects portrait page rules and isolated iframe,
 * guaranteeing a SINGLE-PAGE clean thermal receipt with zero background UI.
 */
export function printElement(elementId, title = "Choco D'or Thermal Bill", layout = 'thermal') {
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

  const isThermal = layout === 'thermal'

  const iframe = document.createElement('iframe')
  iframe.id = 'chocodor_print_frame'
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = isThermal ? '80mm' : '210mm'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  iframe.style.zIndex = '-1'
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
            size: ${isThermal ? 'portrait' : 'A4 portrait'};
            margin: ${isThermal ? '0mm' : '8mm'};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
          }
          html, body {
            width: 100% !important;
            max-width: ${isThermal ? '70mm' : '190mm'} !important;
            margin: 0 auto !important;
            padding: ${isThermal ? '1mm 1mm 3mm 1mm' : '8mm'} !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            font-family: ${isThermal ? "'Courier New', Courier, 'Lucida Console', monospace" : "Arial, Helvetica, sans-serif"} !important;
            font-size: ${isThermal ? '10.5px' : '12px'} !important;
            line-height: ${isThermal ? '1.2' : '1.35'} !important;
            font-weight: ${isThermal ? '700' : 'normal'} !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
          }
          th, td {
            padding: 1px 0 !important;
          }
          img {
            max-width: 100%;
            display: block;
            margin: 0 auto;
            filter: contrast(140%) grayscale(100%);
          }
          .no-print {
            display: none !important;
          }
          /* Prevent receipt from dividing across multiple pages */
          #printable-invoice {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            page-break-after: auto !important;
            width: 100% !important;
            max-width: ${isThermal ? '68mm' : '100%'} !important;
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

  const executePrint = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('Print execution error:', e)
    }
  }

  // Wait for images to load before calling print so dimensions are stable
  const images = doc.images
  if (images && images.length > 0) {
    let pending = images.length
    const onImgFinish = () => {
      pending--
      if (pending <= 0) {
        setTimeout(executePrint, 150)
      }
    }
    for (let i = 0; i < images.length; i++) {
      if (images[i].complete) {
        onImgFinish()
      } else {
        images[i].onload = onImgFinish
        images[i].onerror = onImgFinish
      }
    }
    // Safety fallback in case an image hangs
    setTimeout(() => {
      if (pending > 0) executePrint()
    }, 800)
  } else {
    setTimeout(executePrint, 200)
  }
}

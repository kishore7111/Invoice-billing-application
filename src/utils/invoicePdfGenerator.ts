import type { InvoiceWorkflowRecord } from '../types'
import { CLIENT_DIRECTORY, ORGANIZATION } from '../data'

export const generateInvoiceHtml = (invoice: InvoiceWorkflowRecord): string => {
  const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
  
  // Calculate totals
  const subtotal = invoice.amount
  const discountTotal = 0
  const taxableAmount = subtotal - discountTotal
  const taxRate = 0.18 // 18% tax rate
  const taxAmount = taxableAmount * taxRate
  const total = taxableAmount + taxAmount
  
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: invoice.currency,
    minimumFractionDigits: 2,
  })

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        /* Import the same styles as InvoiceBuilder */
        .invoice-document {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a202c;
          background: white;
        }
        
        .invoice-doc-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .invoice-doc-brand h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #1a202c;
        }
        
        .invoice-doc-brand p {
          margin: 0 0 2px 0;
          font-size: 14px;
          color: #4a5568;
          line-height: 1.4;
        }
        
        .invoice-doc-title h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 24px 0;
          color: #1a202c;
        }
        
        .invoice-doc-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin: 0;
        }
        
        .invoice-doc-meta div {
          display: flex;
          flex-direction: column;
        }
        
        .invoice-doc-meta dt {
          font-size: 12px;
          font-weight: 600;
          color: #718096;
          margin: 0 0 2px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .invoice-doc-meta dd {
          font-size: 14px;
          font-weight: 500;
          color: #1a202c;
          margin: 0;
        }
        
        .invoice-doc-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }
        
        .invoice-doc-party h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #1a202c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .party-name {
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 12px 0;
        }
        
        .invoice-doc-party p {
          font-size: 14px;
          color: #4a5568;
          margin: 0 0 4px 0;
          line-height: 1.4;
        }
        
        .invoice-doc-note {
          font-style: italic;
          color: #718096;
          margin-top: 12px;
        }
        
        .invoice-doc-items {
          margin-bottom: 48px;
        }
        
        .invoice-table-doc {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        
        .invoice-table-doc th {
          background: #f7fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .invoice-table-doc td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #1a202c;
          vertical-align: top;
        }
        
        .invoice-table-doc .num {
          text-align: right;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        
        .item-title {
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 4px;
        }
        
        .item-desc {
          color: #4a5568;
          font-size: 13px;
          margin-bottom: 4px;
        }
        
        .item-notes {
          color: #718096;
          font-size: 12px;
          font-style: italic;
        }
        
        .invoice-doc-summary {
          margin-bottom: 48px;
        }
        
        .invoice-totals-doc {
          width: 100%;
          max-width: 400px;
          margin-left: auto;
          border-collapse: collapse;
        }
        
        .invoice-totals-doc td {
          padding: 12px 16px;
          font-size: 14px;
          border: none;
        }
        
        .invoice-totals-doc .num {
          text-align: right;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-weight: 500;
        }
        
        .invoice-totals-doc tr.grand td {
          font-weight: 700;
          font-size: 16px;
          color: #1a202c;
          border-top: 2px solid #e2e8f0;
          padding-top: 16px;
        }
        
        .invoice-doc-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          padding-top: 32px;
          border-top: 1px solid #e2e8f0;
        }
        
        .invoice-doc-payment h3,
        .invoice-doc-terms h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #1a202c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .invoice-doc-payment p {
          font-size: 14px;
          color: #4a5568;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }
        
        .banking {
          margin-top: 16px;
        }
        
        .banking p {
          font-size: 13px;
          color: #4a5568;
          margin: 0 0 4px 0;
        }
        
        .invoice-doc-terms p {
          font-size: 14px;
          color: #4a5568;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        
        .footer-note {
          font-size: 14px;
          color: #718096;
          font-style: italic;
        }
        
        @media print {
          .invoice-document {
            margin: 0;
            padding: 20px;
            max-width: none;
          }
          
          .invoice-doc-header {
            page-break-inside: avoid;
          }
          
          .invoice-table-doc {
            page-break-inside: avoid;
          }
          
          .invoice-totals-doc {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-document">
        <header class="invoice-doc-header">
          <div class="invoice-doc-brand">
            <h2>${ORGANIZATION.displayName}</h2>
            <p>${ORGANIZATION.legalName}</p>
            <p>${ORGANIZATION.address.line1}${ORGANIZATION.address.line2 ? `, ${ORGANIZATION.address.line2}` : ''}</p>
            <p>${ORGANIZATION.address.city}, ${ORGANIZATION.address.state} ${ORGANIZATION.address.postalCode}, ${ORGANIZATION.address.country}</p>
            <p>${ORGANIZATION.taxRegistration}</p>
            <p>${ORGANIZATION.contact.email} • ${ORGANIZATION.contact.phone}</p>
            <p>${ORGANIZATION.contact.website}</p>
          </div>

          <div class="invoice-doc-title">
            <h1>Invoice</h1>
            <dl class="invoice-doc-meta">
              <div>
                <dt>Invoice #</dt>
                <dd>${invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt>Issue date</dt>
                <dd>${new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>${invoice.currency}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section class="invoice-doc-parties">
          <div class="invoice-doc-party">
            <h3>Bill to</h3>
            <p class="party-name">${client?.companyName || 'Client'}</p>
            ${client?.contactName ? `<p>Attn: ${client.contactName}</p>` : ''}
            ${client?.addressLine1 ? `<p>${client.addressLine1}</p>` : ''}
            ${client?.addressLine2 ? `<p>${client.addressLine2}</p>` : ''}
            ${client?.city && client?.state && client?.postalCode ? `<p>${client.city}, ${client.state} ${client.postalCode}</p>` : ''}
            ${client?.country ? `<p>${client.country}</p>` : ''}
            ${client?.gstin ? `<p>Tax ID: ${client.gstin}</p>` : ''}
            ${client?.email ? `<p>${client.email}</p>` : ''}
            ${client?.phone ? `<p>${client.phone}</p>` : ''}
          </div>
          <div class="invoice-doc-party">
            <h3>Engagement</h3>
            <p class="party-name">${invoice.engagement}</p>
            ${invoice.notes ? `<p class="invoice-doc-note">${invoice.notes}</p>` : ''}
          </div>
        </section>

        <section class="invoice-doc-items">
          <table class="invoice-table-doc">
            <thead>
              <tr>
                <th style="width: 52%">Item / Description</th>
                <th style="width: 10%" class="num">Qty</th>
                <th style="width: 14%" class="num">Rate</th>
                <th style="width: 10%" class="num">Disc.</th>
                <th style="width: 14%" class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.lineItems || []).map(item => {
                const lineBase = item.quantity * item.unitPrice
                const lineDiscount = 0
                const lineTotal = lineBase - lineDiscount
                return `
                  <tr>
                    <td>
                      <div class="item-title">${item.description}</div>
                      <div class="item-desc">${item.description || '—'}</div>
                    </td>
                    <td class="num">${item.quantity}</td>
                    <td class="num">${currencyFormatter.format(item.unitPrice)}</td>
                    <td class="num">—</td>
                    <td class="num">${currencyFormatter.format(lineTotal)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </section>

        <section class="invoice-doc-summary">
          <table class="invoice-totals-doc">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td class="num">${currencyFormatter.format(subtotal)}</td>
              </tr>
              <tr>
                <td>Discounts</td>
                <td class="num">${currencyFormatter.format(discountTotal)}</td>
              </tr>
              <tr>
                <td>Taxable amount</td>
                <td class="num">${currencyFormatter.format(taxableAmount)}</td>
              </tr>
              <tr>
                <td>Tax @ ${(taxRate * 100).toFixed(2)}%</td>
                <td class="num">${currencyFormatter.format(taxAmount)}</td>
              </tr>
              <tr class="grand">
                <td>Total due</td>
                <td class="num">${currencyFormatter.format(total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer class="invoice-doc-footer">
          <div class="invoice-doc-payment">
            <h3>Payment details</h3>
            <p>Accepted methods: Bank transfer</p>
            <div class="banking">
              <p>
                Beneficiary: <strong>${ORGANIZATION.bank.beneficiary}</strong>
              </p>
              <p>
                Bank: ${ORGANIZATION.bank.bankName} • A/C No: ${ORGANIZATION.bank.accountNumber}
              </p>
              <p>
                IFSC: ${ORGANIZATION.bank.ifsc} • SWIFT: ${ORGANIZATION.bank.swift}
              </p>
            </div>
          </div>
          <div class="invoice-doc-terms">
            <h3>Terms</h3>
            <p>Payment due within 30 days of invoice date. Late payments subject to 1.5% monthly interest.</p>
            <p class="footer-note">Thank you for partnering with ${ORGANIZATION.displayName}.</p>
          </div>
        </footer>
      </div>
    </body>
    </html>
  `.trim()
}

export const generatePdfFromHtml = (html: string): void => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    
    // Wait for the content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }
}

export const downloadPdfFromHtml = (html: string, filename: string): void => {
  // Create a blob from the HTML content
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  
  // Create a temporary anchor element to trigger the download
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.html`
  a.style.display = 'none'
  
  // Append to body, click and remove
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // Clean up
  URL.revokeObjectURL(url)
}

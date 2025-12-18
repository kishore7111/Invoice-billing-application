import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import '../App.css'
import { CLIENT_DIRECTORY, ORGANIZATION, SERVICE_CATALOG } from '../data'
import type {
  ClientDetails,
  ClientProfile,
  Currency,
  InvoiceFormState,
  LineItem,
  Service,
} from '../types'

const currencyLocaleMap: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
}

const emptyClientDetails: ClientDetails = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  gstin: '',
}

const toClientDetails = (profile: ClientProfile): ClientDetails => ({
  companyName: profile.companyName,
  contactName: profile.contactName,
  email: profile.email,
  phone: profile.phone,
  addressLine1: profile.addressLine1,
  addressLine2: profile.addressLine2 ?? '',
  city: profile.city,
  state: profile.state,
  postalCode: profile.postalCode,
  country: profile.country,
  gstin: profile.gstin ?? '',
})

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0]

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const generateId = () => Math.random().toString(36).slice(2, 10)

const createLineItem = (service?: Service): LineItem => ({
  id: generateId(),
  serviceId: service?.id ?? '',
  description: service?.description ?? '',
  quantity: 1,
  unitPrice: service?.unitRate ?? 0,
  discount: { type: 'Percentage', value: 0 },
  notes: '',
})

const createInitialState = (): InvoiceFormState => {
  const today = new Date()
  const defaultClient = CLIENT_DIRECTORY[0]
  return {
    clientSelectionId: defaultClient?.id ?? '',
    client: defaultClient ? toClientDetails(defaultClient) : { ...emptyClientDetails },
    currency: 'INR',
    taxConfig: { type: 'GST', rate: 18, isInclusive: false },
    discount: { type: 'Percentage', value: 0 },
    lineItems: [createLineItem(SERVICE_CATALOG[0])],
    meta: {
      invoiceNumber: `ADS-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${generateId()}`,
      issueDate: formatDateForInput(today),
      dueDate: formatDateForInput(addDays(today, 15)),
      projectName: 'Retainer Services',
      purchaseOrder: '',
      reference: '',
    },
    recurring: { isEnabled: false, interval: 'monthly' },
    terms:
      'Payment due within 15 days from the invoice date. Please remit via bank transfer to the account listed. Late payments accrue a 2% monthly finance charge.',
    additionalNote: '',
  }
}

const serviceLookup = SERVICE_CATALOG.reduce<Record<string, Service>>((acc, service) => {
  acc[service.id] = service
  return acc
}, {})

export const InvoiceBuilder = () => {
  const [formState, setFormState] = useState<InvoiceFormState>(() => createInitialState())
  const layoutMode = 'split'
  const previewRef = useRef<HTMLDivElement>(null)

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocaleMap[formState.currency], {
        style: 'currency',
        currency: formState.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [formState.currency],
  )

  const totals = useMemo(() => {
    let subtotal = 0
    let lineDiscounts = 0

    formState.lineItems.forEach(item => {
      const lineBase = item.quantity * item.unitPrice
      const disc = item.discount.type === 'Percentage'
        ? (lineBase * item.discount.value) / 100
        : item.discount.value
      subtotal += lineBase
      lineDiscounts += disc
    })

    const taxableAmount = Math.max(subtotal - lineDiscounts, 0)
    const taxAmount = formState.taxConfig.isInclusive
      ? (taxableAmount * formState.taxConfig.rate) / (100 + formState.taxConfig.rate)
      : (taxableAmount * formState.taxConfig.rate) / 100

    const total = formState.taxConfig.isInclusive ? taxableAmount : taxableAmount + taxAmount

    return {
      subtotal,
      lineDiscounts,
      taxableAmount,
      taxAmount,
      total,
    }
  }, [formState.lineItems, formState.taxConfig])

  const handleClientSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = event.target.value
    const selectedProfile = CLIENT_DIRECTORY.find((client) => client.id === selectedId)
    setFormState((prev) => ({
      ...prev,
      clientSelectionId: selectedId,
      client: selectedProfile ? toClientDetails(selectedProfile) : { ...prev.client },
    }))
  }

  const handleFieldChange = (section: keyof InvoiceFormState, field: string, value: any) => {
    setFormState(prev => {
      const sectionValue = prev[section]
      if (typeof sectionValue === 'object' && !Array.isArray(sectionValue) && sectionValue !== null) {
        return {
          ...prev,
          [section]: { ...sectionValue, [field]: value }
        }
      }
      return {
        ...prev,
        [section]: value
      }
    })
  }

  const handleLineItemChange = (id: string, field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item
        if (field === 'discountValue') return { ...item, discount: { ...item.discount, value: Number(value) } }
        if (field === 'discountType') return { ...item, discount: { ...item.discount, type: value } }
        return { ...item, [field]: value }
      })
    }))
  }

  const handleServiceSelect = (id: string, serviceId: string) => {
    const service = serviceLookup[serviceId]
    if (!service) return
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? {
          ...item,
          serviceId,
          description: service.description,
          unitPrice: service.unitRate
        } : item
      )
    }))
  }

  return (
    <div className="invoice-builder-layout" style={{ display: 'grid', gridTemplateColumns: layoutMode === 'split' ? '1.5fr 1fr' : '1fr', gap: '2rem' }}>
      <section className="form-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="module-card">
          <header className="module-heading"><h2>Client & Meta</h2></header>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.4rem' }}>Client Profile</label>
              <select value={formState.clientSelectionId} onChange={handleClientSelectChange} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                <option value="">Custom</option>
                {CLIENT_DIRECTORY.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div className="field">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.4rem' }}>Currency</label>
              <select value={formState.currency} onChange={e => handleFieldChange('currency', '', e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="field">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.4rem' }}>Invoice #</label>
              <input value={formState.meta.invoiceNumber} onChange={e => handleFieldChange('meta', 'invoiceNumber', e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
            </div>
            <div className="field">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.4rem' }}>Due Date</label>
              <input type="date" value={formState.meta.dueDate} onChange={e => handleFieldChange('meta', 'dueDate', e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
            </div>
          </div>
        </div>

        <div className="module-card">
          <header className="module-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Line Items</h2>
            <button className="outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setFormState(prev => ({ ...prev, lineItems: [...prev.lineItems, createLineItem()] }))}>+ Add Item</button>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {formState.lineItems.map(item => (
              <div key={item.id} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-base)', background: 'var(--slate-50)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.5fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <select value={item.serviceId} onChange={e => handleServiceSelect(item.id, e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                    <option value="">Select Service</option>
                    {SERVICE_CATALOG.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" value={item.unitPrice} onChange={e => handleLineItemChange(item.id, 'unitPrice', Number(e.target.value))} placeholder="Price" style={{ padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
                  <input type="number" value={item.quantity} onChange={e => handleLineItemChange(item.id, 'quantity', Number(e.target.value))} placeholder="Qty" style={{ padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
                </div>
                <textarea value={item.description} onChange={e => handleLineItemChange(item.id, 'description', e.target.value)} placeholder="Description" style={{ width: '100%', minHeight: '60px', padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)', marginBottom: '0.75rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Discount:</span>
                    <input type="number" value={item.discount.value} onChange={e => handleLineItemChange(item.id, 'discountValue', e.target.value)} style={{ width: '60px', padding: '0.4rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
                    <select value={item.discount.type} onChange={e => handleLineItemChange(item.id, 'discountType', e.target.value)} style={{ padding: '0.4rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                      <option value="Percentage">%</option>
                      <option value="Fixed">Fix</option>
                    </select>
                  </div>
                  <button onClick={() => setFormState(prev => ({ ...prev, lineItems: prev.lineItems.filter(i => i.id !== item.id) }))} style={{ color: 'var(--rose-600)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="module-card">
          <header className="module-heading"><h2>Billing Options</h2></header>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontWeight: 600, fontSize: '0.875rem' }}>
                <input type="checkbox" checked={formState.recurring.isEnabled} onChange={e => handleFieldChange('recurring', 'isEnabled', e.target.checked)} />
                Enable Recurring
              </label>
              {formState.recurring.isEnabled && (
                <select value={formState.recurring.interval} onChange={e => handleFieldChange('recurring', 'interval', e.target.value)} style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tax Config</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" value={formState.taxConfig.rate} onChange={e => handleFieldChange('taxConfig', 'rate', Number(e.target.value))} style={{ width: '60px', padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }} />
                <select value={formState.taxConfig.type} onChange={e => handleFieldChange('taxConfig', 'type', e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-light)' }}>
                  <option value="GST">GST</option>
                  <option value="VAT">VAT</option>
                  <option value="None">None</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                <input type="checkbox" checked={formState.taxConfig.isInclusive} onChange={e => handleFieldChange('taxConfig', 'isInclusive', e.target.checked)} />
                Tax Inclusive
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="preview-panel" ref={previewRef} style={{ position: 'sticky', top: '2rem' }}>
        <div className="module-card" style={{ padding: '3rem', minHeight: '900px', display: 'flex', flexDirection: 'column', color: 'var(--slate-800)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid var(--slate-900)', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, margin: 0 }}>Invoice</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Reference: {formState.meta.invoiceNumber}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{ORGANIZATION.legalName}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{ORGANIZATION.address.city}, {ORGANIZATION.address.country}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '3.5rem' }}>
            <div>
              <h4 style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-400)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Bill Recipient</h4>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{formState.client.companyName || '—'}</p>
              <p style={{ margin: '0.25rem 0' }}>{formState.client.addressLine1}</p>
              <p style={{ margin: 0 }}>{formState.client.city}, {formState.client.country}</p>
              {formState.client.gstin && <p style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem', background: 'var(--slate-100)', display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>VAT/GST: {formState.client.gstin}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-400)' }}>DATED:</span>
                <span style={{ marginLeft: '1rem', fontWeight: 600 }}>{formState.meta.issueDate}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-400)' }}>DUE:</span>
                <span style={{ marginLeft: '1rem', fontWeight: 700, color: 'var(--rose-600)' }}>{formState.meta.dueDate}</span>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-900)', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                <th style={{ padding: '1rem 0' }}>Description</th>
                <th style={{ padding: '1rem 0', textAlign: 'right', width: '60px' }}>Qty</th>
                <th style={{ padding: '1rem 0', textAlign: 'right', width: '120px' }}>Rate</th>
                <th style={{ padding: '1rem 0', textAlign: 'right', width: '120px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {formState.lineItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                  <td style={{ padding: '1.25rem 0' }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{serviceLookup[item.serviceId]?.name || 'Custom Service'}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.description}</p>
                  </td>
                  <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>{currencyFormatter.format(item.unitPrice)}</td>
                  <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: 600 }}>{currencyFormatter.format(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginLeft: 'auto', width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600 }}>Subtotal</span>
              <span>{currencyFormatter.format(totals.subtotal)}</span>
            </div>
            {totals.lineDiscounts > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--rose-600)', fontWeight: 600 }}>
                <span>Discounts Applied</span>
                <span>-{currencyFormatter.format(totals.lineDiscounts)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600 }}>{formState.taxConfig.type} ({formState.taxConfig.rate}%)</span>
              <span>{currencyFormatter.format(totals.taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '4px double var(--slate-900)', fontSize: '1.5rem', fontWeight: 900 }}>
              <span>Total</span>
              <span>{currencyFormatter.format(totals.total)}</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '4rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <p style={{ fontWeight: 800, color: 'var(--slate-900)', textTransform: 'uppercase', marginBottom: '0.5rem', fontSize: '0.7rem' }}>Terms & Execution</p>
            <p>{formState.terms}</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '3rem' }}>
              <div>
                <div style={{ width: '150px', borderBottom: '1px solid var(--slate-300)', marginBottom: '0.4rem' }}></div>
                <span>Authorized Approver</span>
              </div>
              <div>
                <div style={{ width: '150px', borderBottom: '1px solid var(--slate-300)', marginBottom: '0.4rem' }}></div>
                <span>Customer Acceptance</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

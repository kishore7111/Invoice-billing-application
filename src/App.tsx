import { useMemo, useState, useEffect } from 'react'
import './App.css'
import {
  ACTIVITY_LOG,
  CLIENT_DIRECTORY,
  INVOICE_WORKFLOW_LEDGER,
  ORGANIZATION,
  PAYMENT_GATEWAY,
  PAYMENT_TRANSACTIONS,
} from './data'
import type {
  ActivityLog,
  InvoiceRecord,
  InvoiceWorkflowRecord,
  InvoiceStatus,
  NotificationMessage,
  PaymentGatewayChannel,
} from './types'
import { InvoiceBuilder } from './components/InvoiceBuilder'

type AppView =
  | 'login'
  | 'overview'
  | 'invoices'
  | 'builder'
  | 'clients'
  | 'team'
  | 'settings'
  | 'payments'
  | 'notifications'

const statusTone: Record<InvoiceStatus, string> = {
  Draft: 'draft',
  Pending: 'pending',
  'Awaiting Approval': 'pending',
  Approved: 'paid',
  Sent: 'pending',
  Paid: 'paid',
  Overdue: 'overdue',
  Void: 'draft',
}

const summarize = (records: InvoiceRecord[]) => {
  const totals = records.reduce(
    (acc, inv) => {
      acc.overall += inv.amount
      acc[inv.status] = (acc[inv.status] || 0) + inv.amount
      if (inv.status === 'Pending' || inv.status === 'Overdue') {
        acc.outstanding += inv.amount
      }
      return acc
    },
    {
      overall: 0,
      outstanding: 0,
      Draft: 0,
      Pending: 0,
      'Awaiting Approval': 0,
      Approved: 0,
      Sent: 0,
      Paid: 0,
      Overdue: 0,
      Void: 0,
    } satisfies Record<InvoiceStatus | 'overall' | 'outstanding', number>,
  )
  const count = records.length
  return { totals, count }
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  
  // Check if mobile view on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth <= 1024)
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])
  
  // Close mobile menu when view changes
  useEffect(() => {
    if (isMobileView) {
      setIsMobileMenuOpen(false)
    }
  }, [activeView, isMobileView])
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar')
      const menuButton = document.querySelector('.mobile-menu-btn')
      
      if (isMobileView && isMobileMenuOpen && 
          !sidebar?.contains(event.target as Node) && 
          !menuButton?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen, isMobileView])
  
  const toggleMobileMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    }
  }

  const overviewStats = useMemo(() => summarize(workflowLedger), [workflowLedger])
  const recentInvoices = useMemo(
    () =>
      [...workflowLedger]
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 5),
    [workflowLedger],
  )

  const filteredInvoices = useMemo(() => {
    if (activeView === 'invoices') {
      return workflowLedger
    }
    if (activeView === 'overview') {
      return recentInvoices
    }
    return INVOICE_LEDGER
  }, [activeView, recentInvoices])

  const paymentInsights = useMemo(() => {
    const succeededTxns = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Succeeded')
    const totalVolume = succeededTxns.reduce((sum, txn) => sum + txn.amount, 0)
    const successCount = succeededTxns.length
    const failureCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Failed').length
    const pendingCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Pending').length
    const successRate = PAYMENT_TRANSACTIONS.length
      ? (successCount / PAYMENT_TRANSACTIONS.length) * 100
      : 0
    const recentTransactions = [...PAYMENT_TRANSACTIONS]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 5)
    return { totalVolume, successRate, failureCount, pendingCount, recentTransactions }
  }, [])

  const renderStatusChip = (status: InvoiceStatus) => (
    <span className={`status-chip ${statusTone[status]}`}>{status}</span>
  )

  const renderActivity = (activity: ActivityLog) => (
    <div key={activity.id} className="activity-row">
      <div>
        <p className="activity-label">{activity.summary}</p>
        <span className="activity-meta">
          {new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(activity.timestamp))}
          {' • '}
          {activity.actor}
        </span>
      </div>
      <span className={`activity-type ${activity.activityType}`}>{activity.activityType}</span>
    </div>
  )

  const renderContent = () => {
    switch (activeView) {
      case 'notifications':
        return (
          <section className="module-card">
            <header className="module-heading">
              <div>
                <h2>Notifications</h2>
                <p>Approval requests and status updates.</p>
              </div>
            </header>
            <div className="notification-list">
              {notifications
                .filter((note) => note.recipientRole === role)
                .map((note) => (
                  <article key={note.id} className={`notification-card ${note.status}`}>
                    <header>
                      <span>{new Date(note.timestamp).toLocaleString('en-IN')}</span>
                      {note.actionRequired ? <span className="chip warning">Action needed</span> : null}
                    </header>
                    <p>{note.message}</p>
                    {note.relatedInvoiceId ? <small>Invoice: {note.relatedInvoiceId.toUpperCase()}</small> : null}
                    {note.status === 'unread' ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((n) => (n.id === note.id ? { ...n, status: 'read' } : n)),
                          )
                        }
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </article>
                ))}
            </div>
          </section>
        )
      case 'builder':
        return <InvoiceBuilder />
      case 'invoices':
        return (
          <section className="module-card span-2">
            <header className="module-heading">
              <div>
                <h2>All invoices</h2>
                <p>Monitor billing progress across engagements and status buckets.</p>
              </div>
              <button type="button" className="primary" onClick={() => setActiveView('builder')}>
                Create invoice
              </button>
            </header>
            <div className="invoice-table">
              <div className="table-head">
                <span>Invoice</span>
                <span>Client</span>
                <span>Engagement</span>
                <span>Issued</span>
                <span>Due</span>
                <span>Status</span>
                <span>Approval</span>
                <span>Actions</span>
                <span>Amount</span>
              </div>
              {filteredInvoices.map((invoice) => {
                const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
                const canApprove = role === 'ceo' && invoice.createdBy === 'employee'
                return (
                  <div key={invoice.id} className="table-row invoice">
                    <span>
                      <strong>{invoice.invoiceNumber}</strong>
                      <small>{invoice.currency}</small>
                    </span>
                    <span>{client?.companyName ?? '—'}</span>
                    <span>{invoice.engagement}</span>
                    <span>{invoice.issueDate}</span>
                    <span>{invoice.dueDate}</span>
                    <span>{renderStatusChip(invoice.status)}</span>
                    <span className={`approval-chip ${invoice.approvalStatus.toLowerCase()}`}>
                      {invoice.approvalStatus.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="actions-cell">
                      {canApprove ? (
                        <div className="action-stack">
                          <button type="button" className="ghost" onClick={() => handleApprovalUpdate(invoice.id, 'Approved')}>
                            Approve
                          </button>
                          <button type="button" className="ghost" onClick={() => handleApprovalUpdate(invoice.id, 'NeedsEdits')}>
                            Request edits
                          </button>
                          <button type="button" className="ghost danger" onClick={() => handleApprovalUpdate(invoice.id, 'Rejected')}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </span>
                    <span>
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: invoice.currency,
                        maximumFractionDigits: 0,
                      }).format(invoice.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      case 'payments':
        return (
          <div className="overview-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Payment gateway control centre</h2>
                  <p>Monitor provider health, channel uptime, and reconciliation windows.</p>
                </div>
                <div className="gateway-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="outline">
                    Test webhook
                  </button>
                  <button type="button" className="primary">
                    Refresh sync
                  </button>
                </div>
              </header>
              <div className="gateway-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                <div>
                  <span className={`status-chip ${PAYMENT_GATEWAY.status.toLowerCase()}`}>
                    {PAYMENT_GATEWAY.status}
                  </span>
                  <h3 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>{PAYMENT_GATEWAY.providerName}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Settlement window: {PAYMENT_GATEWAY.settlementWindow}</p>
                </div>
                <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.50rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fee structure</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem' }}>{PAYMENT_GATEWAY.feePercentage.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last sync</span>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                      {new Intl.DateTimeFormat('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(PAYMENT_GATEWAY.lastSync))}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reconciliation</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem' }}>{PAYMENT_GATEWAY.reconciliationStatus}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Merchant ID</span>
                    <strong style={{ display: 'block', fontSize: '1.125rem' }}>{PAYMENT_GATEWAY.credentials.merchantId}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Operating Channels</h2>
                </div>
              </header>
              <div className="channel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {PAYMENT_GATEWAY.channels.map((channel: PaymentGatewayChannel) => (
                  <article key={channel.id} className="stat-card">
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: 600 }}>{channel.label}</h4>
                      <span className={`status-chip ${channel.status.toLowerCase()}`}>{channel.status}</span>
                    </header>
                    <div className="channel-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Success rate</span>
                        <strong style={{ display: 'block' }}>{channel.successRate.toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SLA</span>
                        <strong style={{ display: 'block' }}>{channel.slaMinutes}m</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      case 'clients':
        return (
          <div className="overview-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Client portfolio</h2>
                  <p>Profiles of key retainers with contact and contract visibility.</p>
                </div>
                <button type="button" className="primary" onClick={() => setActiveView('builder')}>
                  Draft invoice
                </button>
              </header>
              <div className="client-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {CLIENT_DIRECTORY.map((client) => (
                  <article key={client.id} className="stat-card">
                    <header>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{client.companyName}</h3>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{client.contactName}</span>
                    </header>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{client.email}</p>
                    <p style={{ fontSize: '0.875rem' }}>{client.phone}</p>
                    {client.gstin ? <span className="status-chip draft" style={{ marginTop: '0.75rem' }}>GSTIN: {client.gstin}</span> : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      default:
        return (
          <div className="overview-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Invoice health overview</h2>
                  <p>A snapshot of receivables, fulfilment status, and collection risk.</p>
                </div>
                <button type="button" className="outline" onClick={() => setActiveView('invoices')}>
                  View all invoices
                </button>
              </header>
              <div className="stat-grid">
                <div className="stat-card primary">
                  <span className="label">Receivables</span>
                  <strong>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                      overviewStats.totals.outstanding,
                    )}
                  </strong>
                </div>
                <div className="stat-card">
                  <span className="label">Awaiting Approval</span>
                  <strong>{overviewStats.totals['Awaiting Approval'].toLocaleString('en-IN')}</strong>
                </div>
                <div className="stat-card">
                  <span className="label">Collected</span>
                  <strong>{overviewStats.totals.Paid.toLocaleString('en-IN')}</strong>
                </div>
                <div className="stat-card warning">
                  <span className="label">Overdue</span>
                  <strong>{overviewStats.totals.Overdue.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </section>

            <section className="module-card" style={{ gridColumn: 'span 8' }}>
              <header className="module-heading">
                <h2>Recent activity</h2>
              </header>
              <div className="invoice-table">
                {recentInvoices.map((invoice) => {
                  const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
                  return (
                    <div key={invoice.id} className="table-row invoice" style={{ gridTemplateColumns: '1fr 1.5fr 1fr 1fr' }}>
                      <span><strong>{invoice.invoiceNumber}</strong></span>
                      <span>{client?.companyName}</span>
                      <span>{renderStatusChip(invoice.status)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600 }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency, maximumFractionDigits: 0 }).format(invoice.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="module-card" style={{ gridColumn: 'span 4' }}>
              <header className="module-heading">
                <h2>Updates</h2>
              </header>
              <div className="activity-feed">{ACTIVITY_LOG.map((activity) => renderActivity(activity))}</div>
            </section>
          </div>
        )
    }
  }

  if (!role) {
    return renderLogin()
  }

  return (
    <div className="app-shell">
      {isMobileView && (
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      )}
      
      {isMobileView && isMobileMenuOpen && (
        <div 
          className="sidebar-overlay active" 
          onClick={toggleMobileMenu}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && toggleMobileMenu()}
          aria-label="Close menu"
        />
      )}
      
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'active' : ''}`}
        aria-hidden={!isMobileMenuOpen && isMobileView}
      >
        <div className="brand">
          <span className="glyph">A</span>
          <div>
            <p>Aurora Digital</p>
            <strong>Billing Desk</strong>
          </div>
        </div>
        <nav className="nav-group">
          <p className="nav-label">Management</p>
          <button
            type="button"
            className={activeView === 'overview' ? 'active' : ''}
            onClick={() => setActiveView('overview')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'invoices' ? 'active' : ''}
            onClick={() => setActiveView('invoices')}
          >
            Invoices
          </button>
          <button
            type="button"
            className={activeView === 'builder' ? 'active' : ''}
            onClick={() => setActiveView('builder')}
          >
            Create New
          </button>
        </nav>
        <nav className="nav-group">
          <p className="nav-label">Settings</p>
          <button
            type="button"
            className={activeView === 'clients' ? 'active' : ''}
            onClick={() => setActiveView('clients')}
          >
            Clients
          </button>
          <button
            type="button"
            className={activeView === 'payments' ? 'active' : ''}
            onClick={() => setActiveView('payments')}
          >
            Payments
          </button>
          <button
            type="button"
            className={activeView === 'notifications' ? 'active' : ''}
            onClick={() => setActiveView('notifications')}
          >
            Notifications {unreadCount ? <span className="badge">{unreadCount}</span> : null}
          </button>
        </nav>
        <footer className="nav-group" style={{ marginTop: 'auto' }}>
          <div style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            <p>{ORGANIZATION.contact.email}</p>
          </div>
        </footer>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <span className="muted">Welcome back, Finance</span>
            <h1>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h1>
          </div>
          <button type="button" className="primary" onClick={() => setActiveView('builder')}>
            + Generate Invoice
          </button>
        </header>
        <div className="content-area">{renderContent()}</div>
      </div>
    </div>
  )
}

export default App

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
  | 'dashboard'
  | 'invoices'
  | 'builder'
  | 'clients'
  | 'team'
  | 'settings'
  | 'payments'
  | 'notifications'
  | 'proposal-detail'

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

  // Dashboard data calculations
  const dashboardRecentInvoices = useMemo(
    () =>
      [...workflowLedger]
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 6),
    [workflowLedger],
  )

  const dashboardPendingInvoices = useMemo(() => 
    workflowLedger.filter(inv => inv.approvalStatus === 'AwaitingApproval'), 
    [workflowLedger]
  )

  const dashboardApprovedInvoices = useMemo(() => 
    workflowLedger.filter(inv => inv.approvalStatus === 'Approved'), 
    [workflowLedger]
  )

  const dashboardTotalRevenue = useMemo(() => 
    dashboardApprovedInvoices.reduce((sum, inv) => sum + inv.amount, 0), 
    [dashboardApprovedInvoices]
  )

  const renderStatusChip = (status: InvoiceStatus) => (
    <span className={`status-chip ${statusTone[status]}`}>{status}</span>
  )

  const renderDashboard = () => {

    return (
      <div className="visual-dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Visual Dashboard</h1>
            <p>Real-time insights and analytics for your billing operations</p>
          </div>
          <div className="dashboard-stats">
            <div className="stat-circle">
              <div className="circle-progress" style={{ 
                background: `conic-gradient(#10b981 0deg ${(dashboardApprovedInvoices.length / workflowLedger.length) * 360}deg, #e5e7eb 0deg)` 
              }}>
                <div className="circle-inner">
                  <strong>{dashboardApprovedInvoices.length}</strong>
                  <span>Approved</span>
                </div>
              </div>
            </div>
            <div className="stat-circle">
              <div className="circle-progress" style={{ 
                background: `conic-gradient(#f59e0b 0deg ${(dashboardPendingInvoices.length / workflowLedger.length) * 360}deg, #e5e7eb 0deg)` 
              }}>
                <div className="circle-inner">
                  <strong>{dashboardPendingInvoices.length}</strong>
                  <span>Pending</span>
                </div>
              </div>
            </div>
            <div className="revenue-card">
              <div className="revenue-icon">💰</div>
              <div className="revenue-details">
                <strong>
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(dashboardTotalRevenue)}
                </strong>
                <span>Total Revenue</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card chart-card">
            <header>
              <h2>Invoice Status Overview</h2>
              <p>Distribution of invoice statuses</p>
            </header>
            <div className="chart-container">
              <div className="bar-chart">
                {['AwaitingApproval', 'Approved', 'Rejected', 'NeedsEdits'].map((status) => {
                  const count = workflowLedger.filter(inv => inv.approvalStatus === status).length
                  const percentage = (count / workflowLedger.length) * 100
                  return (
                    <div key={status} className="bar-item">
                      <div className="bar-label">{status.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="bar-wrapper">
                        <div className="bar-fill" style={{ 
                          width: `${percentage}%`,
                          background: status === 'Approved' ? '#10b981' : 
                                     status === 'AwaitingApproval' ? '#f59e0b' :
                                     status === 'Rejected' ? '#ef4444' : '#8b5cf6'
                        }}></div>
                      </div>
                      <span className="bar-value">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="dashboard-card recent-activity">
            <header>
              <h2>Recent Activity</h2>
              <p>Latest invoice updates and actions</p>
            </header>
            <div className="activity-timeline">
              {dashboardRecentInvoices.slice(0, 4).map((invoice) => (
                <div key={invoice.id} className="timeline-item">
                  <div className={`timeline-dot ${invoice.approvalStatus.toLowerCase()}`}></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{invoice.invoiceNumber}</strong>
                      <span className="timeline-time">
                        {new Intl.DateTimeFormat('en-IN', { 
                          dateStyle: 'short', 
                          timeStyle: 'short' 
                        }).format(new Date(invoice.lastUpdated))}
                      </span>
                    </div>
                    <p className="timeline-client">{invoice.engagement}</p>
                    <div className="timeline-amount">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: invoice.currency,
                        maximumFractionDigits: 0,
                      }).format(invoice.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card metrics-card">
            <header>
              <h2>Key Metrics</h2>
              <p>Performance indicators</p>
            </header>
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-icon">📈</div>
                <div className="metric-details">
                  <strong>{workflowLedger.length}</strong>
                  <span>Total Invoices</span>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">⚡</div>
                <div className="metric-details">
                  <strong>{Math.round((dashboardApprovedInvoices.length / workflowLedger.length) * 100)}%</strong>
                  <span>Approval Rate</span>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">⏱️</div>
                <div className="metric-details">
                  <strong>
                    {workflowLedger.length > 0 
                      ? Math.round(workflowLedger.reduce((sum, inv) => {
                          const days = Math.ceil((new Date().getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24))
                          return sum + days
                        }, 0) / workflowLedger.length)
                      : 0
                    } days
                  </strong>
                  <span>Avg Processing Time</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }
    const renderNotifications = () => {
    const roleNotifications = notifications.filter((note) => note.recipientRole === role)
    const unreadNotifications = roleNotifications.filter((note) => note.status === 'unread')
    
    return (
      <section className="module-card">
        <header className="module-heading">
          <div>
            <h2>Notifications</h2>
            <p>{unreadNotifications.length} unread messages</p>
          </div>
          {unreadNotifications.length > 0 && (
            <button 
              type="button" 
              className="outline" 
              onClick={() => {
                setNotifications(prev => 
                  prev.map(n => 
                    n.recipientRole === role && n.status === 'unread' 
                      ? { ...n, status: 'read' } 
                      : n
                  )
                )
              }}
            >
              Mark all as read
            </button>
          )}
        </header>
        <div className="notification-list enhanced">
          {roleNotifications.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No notifications</p>
              <span className="empty-text">You're all caught up!</span>
            </div>
          ) : (
            roleNotifications.map((note) => (
              <article key={note.id} className={`notification-card enhanced ${note.status}`}>
                <header>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {new Intl.DateTimeFormat('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(note.timestamp))}
                    </span>
                    {note.actionRequired && <span className="chip urgent">Action Required</span>}
                    {note.status === 'unread' && <span className="chip new">New</span>}
                  </div>
                  {note.status === 'unread' && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() =>
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === note.id ? { ...n, status: 'read' } : n)),
                        )
                      }
                    >
                      Mark as read
                    </button>
                  )}
                </header>
                <div className="notification-content">
                  <p>{note.message}</p>
                  {note.relatedInvoiceId && (
                    <div className="notification-actions">
                      <button 
                        type="button" 
                        className="outline small"
                        onClick={() => {
                          setActiveView('invoices')
                          setNotifications(prev => 
                            prev.map(n => n.id === note.id ? { ...n, status: 'read' } : n)
                          )
                        }}
                      >
                        View Invoice
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    )
  }

  const renderContent = () => {
    switch (activeView) {
      case 'login':
        return (
          <div className="login-container">
            <div className="login-card">
              <header className="login-header">
                <h1>Invoice Billing System</h1>
                <p>Select your role to continue</p>
              </header>
              <div className="login-options">
                <button type="button" className="primary" onClick={() => handleLogin('ceo')}>
                  Login as CEO
                </button>
                <button type="button" className="outline" onClick={() => handleLogin('employee')}>
                  Login as Employee
                </button>
              </div>
            </div>
          </div>
        )
      case 'dashboard':
        return renderDashboard()
      case 'proposal-detail':
        return (
          <section className="module-card">
            <header className="module-heading">
              <div>
                <h2>Service Proposal</h2>
                <p>Detailed scope and deliverables for this program.</p>
              </div>
              <button type="button" className="outline" onClick={() => setActiveView('overview')}>
                Back to overview
              </button>
            </header>
            {selectedProposal && (
              <article className="proposal-detail">
                <header>
                  <h3>{selectedProposal.headline}</h3>
                  <span className="proposal-persona">{selectedProposal.persona}</span>
                </header>
                <p className="proposal-summary">{selectedProposal.summary}</p>
                <div className="proposal-deliverables">
                  <h4>Key Deliverables</h4>
                  <ul>
                    {selectedProposal.deliverables.map((deliverable) => (
                      <li key={deliverable}>{deliverable}</li>
                    ))}
                  </ul>
                </div>
                <footer className="proposal-footer">
                  <span className="proposal-timeline">{selectedProposal.projectedTimeline}</span>
                  <button type="button" className="primary" onClick={handleCreateInvoice}>
                    Create invoice from this proposal
                  </button>
                </footer>
              </article>
            )}
          </section>
        )
      case 'notifications':
        return renderNotifications()
      case 'builder':
        return <InvoiceBuilder editingInvoice={editingInvoice} onSave={handleInvoiceSave} />
      case 'invoices':
        return (
          <section className="module-card span-2">
            <header className="module-heading">
              <div>
                <h2>All invoices</h2>
                <p>Monitor billing progress across engagements and status buckets.</p>
              </div>
              <button type="button" className="primary" onClick={handleCreateInvoice}>
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                          <span className="muted" style={{ minWidth: '24px' }}>—</span>
                        )}
                        
                        <div className="action-buttons">
                          <button
                            className="action-button view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(invoice);
                            }}
                            title="View Invoice"
                            aria-label="View invoice details"
                          >
                            <ViewIcon />
                          </button>

                          <button
                            className="action-button download"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadInvoice(invoice);
                            }}
                            title="Download Invoice"
                            aria-label="Download invoice"
                          >
                            <DownloadIcon />
                          </button>

                          {invoice.approvalStatus === 'Approved' && (
                            <button
                              className="action-button forward"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForwardToClient(invoice);
                              }}
                              title="Forward to Client"
                              aria-label="Forward invoice to client"
                            >
                              <ForwardIcon />
                            </button>
                          )}
                        </div>
                      </div>
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
              <div className="activity-feed">
                {ACTIVITY_LOG.map((activity) => (
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
                ))}
              </div>
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
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            <span className="nav-icon">📈</span>
            Visual Dashboard
          </button>
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
            <span className="nav-icon">🔔</span>
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

import { useMemo, useState } from 'react'
import { ViewIcon } from './components/common/icons/ViewIcon'
import { DownloadIcon } from './components/common/icons/DownloadIcon'
import { ForwardIcon } from './components/common/icons/ForwardIcon'
import './components/common/styles/actionButtons.css'
import './App.css'
import {
  ACTIVITY_LOG,
  CLIENT_DIRECTORY,
  INVOICE_WORKFLOW_LEDGER,
  ORGANIZATION,
  PAYMENT_GATEWAY,
  PAYMENT_TRANSACTIONS,
  SERVICE_CATALOG,
  SERVICE_SHOWCASES,
  TEAM_MEMBERS,
  SEED_NOTIFICATIONS,
} from './data'
import type {
  InvoiceRecord,
  InvoiceWorkflowRecord,
  InvoiceStatus,
  NotificationMessage,
  PaymentGatewayChannel,
  PaymentTransaction,
  UserRole,
  ApprovalStatus,
  ServiceShowcase,
  InvoiceFormState,
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
  Paid: 'paid',
  Overdue: 'overdue',
}

const summarize = (records: InvoiceRecord[]) => {
  const totals = records.reduce(
    (acc, inv) => {
      acc.overall += inv.amount
      acc[inv.status] += inv.amount
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
      Paid: 0,
      Overdue: 0,
    } satisfies Record<InvoiceStatus | 'overall' | 'outstanding', number>,
  )
  const count = records.length
  return { totals, count }
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('login')
  const [role, setRole] = useState<UserRole | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [workflowLedger, setWorkflowLedger] = useState<InvoiceWorkflowRecord[]>(INVOICE_WORKFLOW_LEDGER)
  const [notifications, setNotifications] = useState<NotificationMessage[]>(SEED_NOTIFICATIONS)
  const [selectedProposal, setSelectedProposal] = useState<ServiceShowcase | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWorkflowRecord | null>(null)
  const loginNames = useMemo(
    () => ({
      ceo: 'Ananya Iyer',
      employee: 'Priya Shah',
    }),
    [],
  )

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
    if (activeView === 'builder') {
      return []
    }
    return workflowLedger
  }, [activeView, recentInvoices, workflowLedger])

  const pushNotification = (
    recipientRole: UserRole,
    message: string,
    relatedInvoiceId?: string,
    actionRequired = false,
  ) => {
    const entry: NotificationMessage = {
      id: `note-${Date.now()}`,
      recipientRole,
      message,
      timestamp: new Date().toISOString(),
      relatedInvoiceId,
      status: 'unread',
      actionRequired,
    }
    setNotifications((prev) => [entry, ...prev])
  }

  const handleApprovalUpdate = (invoiceId: string, nextStatus: ApprovalStatus) => {
    const match = workflowLedger.find((inv) => inv.id === invoiceId)
    setWorkflowLedger((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, approvalStatus: nextStatus } : inv)),
    )
    if (match) {
      const actionCopy =
        nextStatus === 'Approved'
          ? 'approved and ready to share with client.'
          : nextStatus === 'Rejected'
            ? 'rejected. Please review and resubmit.'
            : 'needs edits before approval.'
      pushNotification(
        'employee',
        `Invoice ${match.invoiceNumber} ${actionCopy}`,
        invoiceId,
        nextStatus !== 'Approved',
      )
      if (nextStatus === 'Approved') {
        pushNotification(
          'ceo',
          `Invoice ${match.invoiceNumber} approved. Client view link ready.`,
          invoiceId,
          false,
        )
      }
      if (nextStatus === 'NeedsEdits') {
        setEditingInvoice(match)
        setActiveView('builder')
      }
    }
  }

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setActiveView('builder')
  }

  const handleInvoiceSave = (invoiceData: InvoiceFormState) => {
    const newInvoice: InvoiceWorkflowRecord = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceData.meta.invoiceNumber,
      clientId: invoiceData.clientSelectionId,
      engagement: invoiceData.meta.projectName,
      currency: invoiceData.currency,
      amount: invoiceData.lineItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0),
      status: invoiceData.status || 'Pending',
      issueDate: invoiceData.meta.issueDate,
      dueDate: invoiceData.meta.dueDate,
      lastUpdated: new Date().toISOString(),
      createdBy: role || 'employee',
      approvalStatus: 'AwaitingApproval',
      lineItems: invoiceData.lineItems,
      notes: invoiceData.notes,
    }
    
    setWorkflowLedger(prev => [...prev, newInvoice])
    
    pushNotification(
      'ceo',
      `New invoice ${newInvoice.invoiceNumber} created by ${role === 'ceo' ? 'CEO' : 'employee'} and requires approval.`,
      newInvoice.id,
      true
    )
    
    setActiveView('invoices')
  }

  const handleViewProposal = (proposal: ServiceShowcase) => {
    setSelectedProposal(proposal)
    setActiveView('proposal-detail')
  }

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setDisplayName(loginNames[selectedRole])
    setActiveView('overview')
  }

  const handleLogout = () => {
    setRole(null)
    setDisplayName('')
    setActiveView('login')
  }

  const handleViewInvoice = (invoice: InvoiceWorkflowRecord) => {
    // Create a simple invoice preview in a new window
    const invoiceContent = `
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .invoice-details { margin: 20px 0; }
            .line-items { margin: 20px 0; }
            .line-item { display: flex; justify-content: space-between; margin: 10px 0; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice</h1>
            <p>${invoice.invoiceNumber}</p>
          </div>
          <div class="invoice-details">
            <p><strong>Client:</strong> ${CLIENT_DIRECTORY.find(c => c.id === invoice.clientId)?.companyName || 'N/A'}</p>
            <p><strong>Engagement:</strong> ${invoice.engagement}</p>
            <p><strong>Issue Date:</strong> ${invoice.issueDate}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
            <p><strong>Approval:</strong> ${invoice.approvalStatus}</p>
          </div>
          <div class="line-items">
            <h3>Line Items</h3>
            ${invoice.lineItems?.map(item => `
              <div class="line-item">
                <span>${item.description} (${item.quantity} x ${invoice.currency} ${item.unitPrice})</span>
                <span>${invoice.currency} ${item.quantity * item.unitPrice}</span>
              </div>
            `).join('') || '<p>No line items available</p>'}
          </div>
          <div class="total">
            <p><strong>Total Amount:</strong> ${invoice.currency} ${invoice.amount}</p>
          </div>
          ${invoice.notes ? `<div class="notes"><p><strong>Notes:</strong> ${invoice.notes}</p></div>` : ''}
        </body>
      </html>
    `
    
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(invoiceContent)
      newWindow.document.close()
    }
  }

  const handleDownloadInvoice = (invoice: InvoiceWorkflowRecord) => {
    // Create a text version for download
    const invoiceText = `
INVOICE: ${invoice.invoiceNumber}
=====================================

Client: ${CLIENT_DIRECTORY.find(c => c.id === invoice.clientId)?.companyName || 'N/A'}
Engagement: ${invoice.engagement}
Issue Date: ${invoice.issueDate}
Due Date: ${invoice.dueDate}
Status: ${invoice.status}
Approval Status: ${invoice.approvalStatus}

LINE ITEMS:
${invoice.lineItems?.map(item => 
  `${item.description} - Quantity: ${item.quantity}, Unit Price: ${invoice.currency} ${item.unitPrice}, Total: ${invoice.currency} ${item.quantity * item.unitPrice}`
).join('\n') || 'No line items available'}

TOTAL AMOUNT: ${invoice.currency} ${invoice.amount}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}
    `.trim()

    const blob = new Blob([invoiceText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoice.invoiceNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleForwardToClient = (invoice: InvoiceWorkflowRecord) => {
    const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
    if (!client) return

    // Create email content for forwarding
    const emailContent = `
Dear ${client.contactName},

Please find attached the invoice ${invoice.invoiceNumber} for ${invoice.engagement}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate}
- Amount: ${invoice.currency} ${invoice.amount}
- Status: ${invoice.status}

You can download the invoice using the link below:
${window.location.origin}/invoice/${invoice.id}

Please let us know if you have any questions.

Best regards,
${displayName}
${role === 'ceo' ? 'CEO' : 'Employee'}
${ORGANIZATION.displayName}
    `.trim()

    // Create a mailto link
    const subject = `Invoice ${invoice.invoiceNumber} - ${ORGANIZATION.displayName}`
    const mailtoLink = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`
    
    window.open(mailtoLink, '_blank')
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.recipientRole === role && n.status === 'unread').length,
    [notifications, role],
  )

  const renderLogin = () => (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: '2rem', justifyContent: 'center' }}>
          <span className="glyph" style={{ width: '48px', height: '48px', fontSize: '1.6rem' }}>A</span>
          <div style={{ textAlign: 'left' }}>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Aurora Digital Solutions</p>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink-800)' }}>Billing Desk</strong>
          </div>
        </div>
        <h1>Sign In</h1>
        <p>Select your role to continue to the billing portal</p>
        <div className="login-options">
          <button type="button" className="primary" onClick={() => handleLogin('ceo')}>
            Continue as CEO / Admin
            <span className="muted" style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              {loginNames.ceo}
            </span>
          </button>
          <button type="button" className="outline" onClick={() => handleLogin('employee')}>
            Continue as Employee
            <span className="muted" style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              {loginNames.employee}
            </span>
          </button>
        </div>
        <p className="muted small">
          CEOs see all invoices, approvals, and notifications. Employees can draft invoices and view approval feedback.
        </p>
      </div>
    </div>
  )

  const paymentInsights = useMemo(() => {
    const totalVolume = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Succeeded').reduce(
      (sum, txn) => sum + txn.amount,
      0,
    )
    const successCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Succeeded').length
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
          <section className="module-card">
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
          <div className="operations-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Payment gateway control centre</h2>
                  <p>Monitor provider health, channel uptime, and reconciliation windows.</p>
                </div>
                <div className="gateway-actions">
                  <button type="button" className="outline">
                    Test webhook
                  </button>
                  <button type="button" className="primary">
                    Refresh sync
                  </button>
                </div>
              </header>
              <div className="gateway-summary">
                <div>
                  <span className={`gateway-status ${PAYMENT_GATEWAY.status.toLowerCase()}`}>
                    {PAYMENT_GATEWAY.status}
                  </span>
                  <h3>{PAYMENT_GATEWAY.providerName}</h3>
                  <p>Settlement window: {PAYMENT_GATEWAY.settlementWindow}</p>
                </div>
                <div className="summary-grid">
                  <div>
                    <span className="label">Fee structure</span>
                    <strong>{PAYMENT_GATEWAY.feePercentage.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="label">Last sync</span>
                    <strong>
                      {new Intl.DateTimeFormat('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(PAYMENT_GATEWAY.lastSync))}
                    </strong>
                  </div>
                  <div>
                    <span className="label">Reconciliation</span>
                    <strong>{PAYMENT_GATEWAY.reconciliationStatus}</strong>
                  </div>
                  <div>
                    <span className="label">Merchant ID</span>
                    <strong>{PAYMENT_GATEWAY.credentials.merchantId}</strong>
                  </div>
                </div>
                <div className="credential-card">
                  <p>
                    Key ending <strong>{PAYMENT_GATEWAY.credentials.keyEnding}</strong>
                  </p>
                  <p>{PAYMENT_GATEWAY.credentials.webhookUrl}</p>
                </div>
              </div>
              <div className="channel-grid">
                {PAYMENT_GATEWAY.channels.map((channel: PaymentGatewayChannel) => (
                  <article key={channel.id} className="channel-card">
                    <header>
                      <h4>{channel.label}</h4>
                      <span className={`channel-status ${channel.status.toLowerCase()}`}>{channel.status}</span>
                    </header>
                    <div className="channel-metrics">
                      <div>
                        <span className="label">Success rate</span>
                        <strong>{channel.successRate.toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span className="label">Settlement SLA</span>
                        <strong>{channel.slaMinutes} min</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Recent payment activity</h2>
                  <p>Authorised captures and settlements across invoices.</p>
                </div>
              </header>
              <div className="transaction-list">
                {paymentInsights.recentTransactions.map((txn: PaymentTransaction) => {
                  const client = CLIENT_DIRECTORY.find((c) => c.id === txn.clientId)
                  const statusClass = txn.status.toLowerCase()
                  return (
                    <div key={txn.id} className="transaction-row">
                      <div>
                        <h4>{txn.reference}</h4>
                        <span className="txn-meta">
                          Invoice {txn.invoiceId.toUpperCase()} • {client?.companyName ?? '—'}
                        </span>
                      </div>
                      <div className="txn-amount">
                        <strong>
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: txn.currency,
                            maximumFractionDigits: 0,
                          }).format(txn.amount)}
                        </strong>
                        <small>
                          Fee {new Intl.NumberFormat('en-IN', { style: 'currency', currency: txn.currency }).format(txn.feeAmount)}
                        </small>
                      </div>
                      <div className="txn-status-block">
                        <span className={`txn-status ${statusClass}`}>{txn.status}</span>
                        <span className="txn-meta">
                          {new Intl.DateTimeFormat('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(txn.receivedAt))}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )
      case 'clients':
        return (
          <div className="operations-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Client portfolio</h2>
                  <p>Profiles of key retainers with contact and contract visibility.</p>
                </div>
                <button type="button" className="outline" onClick={() => setActiveView('builder')}>
                  Draft invoice
                </button>
              </header>
              <div className="client-grid">
                {CLIENT_DIRECTORY.map((client) => (
                  <article key={client.id} className="client-card">
                    <header>
                      <h3>{client.companyName}</h3>
                      <span>{client.contactName}</span>
                    </header>
                    <p className="client-meta">{client.email}</p>
                    <p className="client-meta">{client.phone}</p>
                    <p className="client-meta">
                      {[client.city, client.state].filter(Boolean).join(', ')} • {client.country}
                    </p>
                    {client.gstin ? <span className="chip">GSTIN: {client.gstin}</span> : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      case 'team':
        return (
          <div className="operations-grid">
            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Finance squad roster</h2>
                  <p>Billing, collections, and delivery partners with current focus areas.</p>
                </div>
              </header>
              <div className="team-grid detailed">
                {TEAM_MEMBERS.map((member) => (
                  <article key={member.id} className="team-card focus">
                    <div className="avatar" style={{ backgroundColor: member.avatarColor }}>
                      {member.initials}
                    </div>
                    <div className="team-details">
                      <h3>{member.name}</h3>
                      <span>{member.role}</span>
                      <p>{member.email}</p>
                      <div className="chip-row">
                        <span className="chip">Collections</span>
                        <span className="chip">Q2 OKRs</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      case 'settings':
        return (
          <div className="operations-grid">
            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Billing console settings</h2>
                  <p>Control payment preferences, reminders, and notification policies.</p>
                </div>
              </header>
              <div className="settings-panel">
                <div className="settings-row">
                  <div>
                    <h3>Auto reminder cadence</h3>
                    <p>Send pending invoice nudges every 5 days until payment is confirmed.</p>
                  </div>
                  <button type="button" className="toggle on">
                    Enabled
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <h3>Attach PDF to emails</h3>
                    <p>Automatically generate and attach branded PDFs for every invoice dispatch.</p>
                  </div>
                  <button type="button" className="toggle">
                    Disabled
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <h3>Dual approval workflow</h3>
                    <p>Route invoices above ₹2,00,000 for finance head approval before release.</p>
                  </div>
                  <button type="button" className="toggle on">
                    Enabled
                  </button>
                </div>
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
                  <span className="label">Outstanding receivables</span>
                  <strong>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                      overviewStats.totals.outstanding,
                    )}
                  </strong>
                  <p>Includes pending and overdue invoices awaiting collection.</p>
                </div>
                <div className="stat-card">
                  <span className="label">Draft</span>
                  <strong>{overviewStats.totals.Draft.toLocaleString('en-IN')}</strong>
                  <p>Value of invoices saved but not shared with clients.</p>
                </div>
                <div className="stat-card">
                  <span className="label">Pending approval</span>
                  <strong>{overviewStats.totals.Pending.toLocaleString('en-IN')}</strong>
                  <p>Invoiced amounts awaiting client confirmation.</p>
                </div>
                <div className="stat-card">
                  <span className="label">Collected</span>
                  <strong>{overviewStats.totals.Paid.toLocaleString('en-IN')}</strong>
                  <p>Confirmed payments received this quarter.</p>
                </div>
                <div className="stat-card warning">
                  <span className="label">Overdue</span>
                  <strong>{overviewStats.totals.Overdue.toLocaleString('en-IN')}</strong>
                  <p>Requires immediate follow-up from collections team.</p>
                </div>
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Recent invoices</h2>
                  <p>Latest invoices sent to strategic accounts.</p>
                </div>
              </header>
              <div className="invoice-list">
                {recentInvoices.map((invoice) => {
                  const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
                  return (
                    <article key={invoice.id} className="invoice-card">
                      <header>
                        <div>
                          <h3>{invoice.invoiceNumber}</h3>
                          <span>{client?.companyName ?? '—'}</span>
                        </div>
                        {renderStatusChip(invoice.status)}
                      </header>
                      <p>{invoice.engagement}</p>
                      <footer>
                        <span>
                          Issued {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.issueDate))}
                        </span>
                        <strong>
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: invoice.currency,
                            maximumFractionDigits: 0,
                          }).format(invoice.amount)}
                        </strong>
                      </footer>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Operational updates</h2>
                  <p>Key actions from finance, delivery, and collections.</p>
                </div>
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

            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Service catalogue</h2>
                  <p>Standard billing packages across our practice areas.</p>
                </div>
              </header>
              <div className="service-grid">
                {SERVICE_CATALOG.map((service) => (
                  <article key={service.id} className="service-card">
                    <header>
                      <h3>{service.name}</h3>
                      <span className="service-category">{service.category}</span>
                    </header>
                    <p>{service.description}</p>
                    <footer>
                      <span>{service.unit}</span>
                      <strong>
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          maximumFractionDigits: 0,
                        }).format(service.unitRate)}
                      </strong>
                    </footer>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Service spotlight</h2>
                  <p>Positioning decks and delivery promises for high-value programs.</p>
                </div>
              </header>
              <div className="service-showcase-grid">
                {SERVICE_SHOWCASES.map((item: ServiceShowcase) => (
                  <article key={item.id} className="service-showcase-card">
                    <header>
                      <h3>{item.headline}</h3>
                      <span>{item.persona}</span>
                    </header>
                    <p>{item.summary}</p>
                    <ul>
                      {item.deliverables.map((deliverable) => (
                        <li key={deliverable}>{deliverable}</li>
                      ))}
                    </ul>
                    <footer>
                      <span>{item.projectedTimeline}</span>
                      <button type="button" className="outline" onClick={() => handleViewProposal(item)}>
                        View proposal
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Gateway performance snapshot</h2>
                  <p>Payments processed through {PAYMENT_GATEWAY.providerName}.</p>
                </div>
                <button type="button" className="outline" onClick={() => setActiveView('payments')}>
                  Manage payments
                </button>
              </header>
              <div className="payment-metrics">
                <div>
                  <span className="label">Success rate</span>
                  <strong>{paymentInsights.successRate.toFixed(1)}%</strong>
                </div>
                <div>
                  <span className="label">Total volume</span>
                  <strong>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                      paymentInsights.totalVolume,
                    )}
                  </strong>
                </div>
                <div>
                  <span className="label">Pending captures</span>
                  <strong>{paymentInsights.pendingCount}</strong>
                </div>
                <div>
                  <span className="label">Failed attempts</span>
                  <strong>{paymentInsights.failureCount}</strong>
                </div>
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Finance squad</h2>
                  <p>Specialists coordinating billing, strategy, and delivery.</p>
                </div>
              </header>
              <div className="team-grid">
                {TEAM_MEMBERS.map((member) => (
                  <article key={member.id} className="team-card">
                    <div className="avatar" style={{ backgroundColor: member.avatarColor }}>
                      {member.initials}
                    </div>
                    <div className="team-details">
                      <h3>{member.name}</h3>
                      <span>{member.role}</span>
                      <p>{member.email}</p>
                    </div>
                  </article>
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
      <aside className="sidebar">
        <div className="brand">
          <span className="glyph">A</span>
          <div>
            <p className="muted">Aurora Digital Solutions</p>
            <strong>Billing Desk</strong>
          </div>
        </div>
        <nav className="nav-group">
          <p className="nav-label">Overview</p>
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
            <span className="nav-icon">📊</span>
            Executive summary
          </button>
          <button
            type="button"
            className={activeView === 'invoices' ? 'active' : ''}
            onClick={() => setActiveView('invoices')}
          >
            <span className="nav-icon">📄</span>
            Invoice ledger
          </button>
          <button
            type="button"
            className={activeView === 'builder' ? 'active' : ''}
            onClick={() => setActiveView('builder')}
          >
            <span className="nav-icon">➕</span>
            Create invoice
          </button>
        </nav>
        <nav className="nav-group">
          <p className="nav-label">Operations</p>
          <button
            type="button"
            className={activeView === 'clients' ? 'active' : ''}
            onClick={() => setActiveView('clients')}
          >
            <span className="nav-icon">👥</span>
            Client profiles
          </button>
          <button
            type="button"
            className={activeView === 'team' ? 'active' : ''}
            onClick={() => setActiveView('team')}
          >
            <span className="nav-icon">👔</span>
            Team workload
          </button>
          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            onClick={() => setActiveView('settings')}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
          <button
            type="button"
            className={activeView === 'payments' ? 'active' : ''}
            onClick={() => setActiveView('payments')}
          >
            <span className="nav-icon">💳</span>
            Payment gateway
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
        <footer className="sidebar-footer">
          <p>{ORGANIZATION.contact.email}</p>
          <span>{ORGANIZATION.contact.phone}</span>
        </footer>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="muted">Welcome back, {displayName || 'Finance Team'}</p>
            <h1>{activeView === 'builder' ? 'Generate invoice' : 'Invoice & Billing Command Centre'}</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="outline" onClick={() => setActiveView('builder')}>
              + New invoice
            </button>
            <button type="button" className="ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
        <div className="content-area">{renderContent()}</div>
      </div>
    </div>
  )
}

export default App

export type ServiceCategory = 'Digital Marketing' | 'Web Development' | 'Software Development'

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  description: string
  unit: string
  unitRate: number
}

export interface ClientProfile {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  gstin?: string
}

export interface ClientDetails extends Omit<ClientProfile, 'id'> {}

export interface LineItem {
  id: string
  serviceId: string
  description: string
  quantity: number
  unitPrice: number
  discountRate: number
  notes?: string
}

export interface InvoiceMeta {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  projectName: string
  purchaseOrder?: string
  reference?: string
}

export interface InvoiceFormState {
  clientSelectionId: string
  client: ClientDetails
  currency: 'INR' | 'USD' | 'EUR'
  taxRate: number
  lineItems: LineItem[]
  meta: InvoiceMeta
  terms: string
  additionalNote: string
}

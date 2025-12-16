import type { ClientProfile, Service } from './types'

export const ORGANIZATION = {
  legalName: 'Aurora Digital Solutions Pvt. Ltd.',
  displayName: 'Aurora Digital Solutions',
  tagline: 'Strategic Digital Expertise Delivered',
  taxRegistration: 'GSTIN: 27AABCU9603R1Z7',
  address: {
    line1: '7th Floor, Crest Tower',
    line2: 'Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400051',
    country: 'India',
  },
  contact: {
    phone: '+91 22 4150 2380',
    email: 'billing@auroradigital.in',
    website: 'www.auroradigital.in',
  },
  bank: {
    beneficiary: 'Aurora Digital Solutions Pvt. Ltd.',
    bankName: 'Horizon Bank of India',
    accountNumber: '018901290384',
    ifsc: 'HRZN0001290',
    swift: 'HRZNINBB',
  },
}

export const SERVICE_CATALOG: Service[] = [
  {
    id: 'svc-dm-001',
    name: 'Search Engine Optimization Retainer',
    category: 'Digital Marketing',
    description:
      'Monthly optimization of on-page, off-page, and technical SEO assets with reporting and analytics.',
    unit: 'Monthly Retainer',
    unitRate: 65000,
  },
  {
    id: 'svc-dm-002',
    name: 'Social Media Campaign Management',
    category: 'Digital Marketing',
    description:
      'End-to-end campaign management across social platforms including creative production and performance tracking.',
    unit: 'Campaign',
    unitRate: 54000,
  },
  {
    id: 'svc-web-001',
    name: 'Corporate Website Redesign',
    category: 'Web Development',
    description:
      'Responsive redesign with UX strategy, CMS integration, QA, and deployment.',
    unit: 'Project',
    unitRate: 185000,
  },
  {
    id: 'svc-web-002',
    name: 'eCommerce Platform Build',
    category: 'Web Development',
    description:
      'Full-stack eCommerce implementation with payment gateway integration and admin training.',
    unit: 'Project',
    unitRate: 275000,
  },
  {
    id: 'svc-soft-001',
    name: 'Custom CRM Module Development',
    category: 'Software Development',
    description:
      'Build and integrate tailored CRM module with existing enterprise systems.',
    unit: 'Sprint',
    unitRate: 95000,
  },
  {
    id: 'svc-soft-002',
    name: 'Enterprise API Integration Suite',
    category: 'Software Development',
    description:
      'Secure API integration including documentation, testing, and deployment support.',
    unit: 'Integration Package',
    unitRate: 132000,
  },
]

export const CLIENT_DIRECTORY: ClientProfile[] = [
  {
    id: 'cl-aurora-001',
    companyName: 'Nimbus Finserve Ltd.',
    contactName: 'Riya Malhotra',
    email: 'riya.malhotra@nimbusfinserve.com',
    phone: '+91 98190 44221',
    addressLine1: '903, Sapphire Heights',
    addressLine2: 'Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400058',
    country: 'India',
    gstin: '27AACCN1234B1Z9',
  },
  {
    id: 'cl-aurora-002',
    companyName: 'Helios Retail Pvt. Ltd.',
    contactName: 'Ashwin Rao',
    email: 'ashwin.rao@heliosretail.in',
    phone: '+91 99876 55210',
    addressLine1: '2nd Floor, Meridian Plaza',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    gstin: '29AAECP3245L1Z3',
  },
  {
    id: 'cl-aurora-003',
    companyName: 'Orbit Logistics & Warehousing LLP',
    contactName: 'Samarjeet Singh',
    email: 'samarjeet@orbitlogistics.com',
    phone: '+91 97173 77660',
    addressLine1: 'Plot No. 18, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    postalCode: '201309',
    country: 'India',
    gstin: '09AAHFO6521K1ZW',
  },
]

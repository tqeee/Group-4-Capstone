import portfolioDummyData from '../dummydata/portfolioDummyData';

const fundDetails = [
  {
    id: 'xauusd',
    name: 'OKC XAUUSD Fund',
    currency: 'SGD',
    instrument: 'XAUUSD',
    allocation: 100,
  },
];

const investorDirectory = [
  {
    name: 'Faye Cheah',
    id: 'INV-204812',
    email: 'faye.cheah@example.com',
    registeredAt: '17 Mar 2026',
  },
  {
    name: 'Daniel Tan',
    id: 'INV-204813',
    email: 'daniel.tan@example.com',
    registeredAt: '20 Mar 2026',
  },
  {
    name: 'Amelia Wong',
    id: 'INV-204814',
    email: 'amelia.wong@example.com',
    registeredAt: '24 Mar 2026',
  },
];

const transactions = [
  { reference: 'TXN-2401', date: '8 Apr 2026', investor: 'Faye Cheah', type: 'Deposit', amount: 'SGD 50,000.00', status: 'Completed' },
  { reference: 'TXN-2402', date: '8 Apr 2026', investor: 'Daniel Tan', type: 'Withdrawal', amount: 'SGD 18,400.00', status: 'Review' },
  { reference: 'TXN-2403', date: '7 Apr 2026', investor: 'Amelia Wong', type: 'Transfer', amount: 'SGD 72,300.00', status: 'Completed' },
  { reference: 'TXN-2404', date: '7 Apr 2026', investor: 'Marcus Lee', type: 'Deposit', amount: 'SGD 25,000.00', status: 'Pending' },
];

const dashboardActivity = [
  { label: 'NAV uploaded', time: '8 Apr 2026 · 19:00' },
  { label: 'Daily valuation completed', time: '8 Apr 2026 · 18:45' },
  { label: 'Withdrawal approved', time: '8 Apr 2026 · 16:20' },
  { label: 'Deposit received', time: '8 Apr 2026 · 10:23' },
  { label: 'Investor added', time: '7 Apr 2026 · 15:10' },
];

const pendingActions = [
  { label: 'Deposit Requests Pending', count: 3 },
  { label: 'Withdrawal Requests Pending', count: 2 },
  { label: 'NAV Awaiting Review', count: 1 },
];

export function getFundPerformance() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/fund-performance').then(response => response.json());
  return portfolioDummyData;
}

export function getFundDetails() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/funds').then(response => response.json());
  return fundDetails;
}

export function getInvestorDirectory() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/investors').then(response => response.json());
  return investorDirectory;
}

export function getInvestorProfile(investorId) {
  // Future backend replacement:
  // return fetch(`/api/portfolio-manager/investors/${investorId}`).then(response => response.json());
  return investorDirectory.find(investor => investor.id === investorId) || null;
}

export function getTransactions() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/transactions').then(response => response.json());
  return transactions;
}

export function getDashboardActivity() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/dashboard/activity').then(response => response.json());
  return dashboardActivity;
}

export function getPendingActions() {
  // Future backend replacement:
  // return fetch('/api/portfolio-manager/dashboard/pending-actions').then(response => response.json());
  return pendingActions;
}
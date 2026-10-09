import { ReportsHub } from '@/components/reports/ReportsHub';

export const metadata = {
  title: 'Executive Reports | PharmacyOS',
  description: 'Download sales reports, inventory valuations, and FEFO stock movement ledgers.',
};

export default function ReportsPage() {
  return <ReportsHub />;
}

import { DataImportCenter } from '@/components/import/DataImportCenter';

export const metadata = {
  title: 'CSV Data Migration | PharmacyOS',
  description: 'Bulk import medicines catalog and initial batch inventory into PharmacyOS.',
};

export default function ImportPage() {
  return <DataImportCenter />;
}

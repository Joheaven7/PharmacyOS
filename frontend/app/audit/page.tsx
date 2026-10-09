import { AuditLogViewer } from '@/components/audit/AuditLogViewer';

export const metadata = {
  title: 'System Audit Logs | PharmacyOS',
  description: 'View tenant-isolated security audit logs and transaction history.',
};

export default function AuditLogsPage() {
  return <AuditLogViewer />;
}

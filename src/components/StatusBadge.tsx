import { ReportStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'status-badge-draft' },
  aberto: { label: 'Aberto', className: 'status-badge-open' },
  em_andamento: { label: 'Em Andamento', className: 'status-badge-progress' },
  finalizado: { label: 'Finalizado', className: 'status-badge-done' },
  fechado: { label: 'Fechado', className: 'status-badge-closed' },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={`${config.className} text-xs font-medium`}>
      {config.label}
    </Badge>
  );
}

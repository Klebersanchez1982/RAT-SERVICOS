import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, AlertCircle, Plus, QrCode } from "lucide-react";
import { getReports } from "@/lib/api-service";
import { Report } from "@/lib/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  const drafts = reports.filter(r => r.status === 'rascunho').length;
  const open = reports.filter(r => r.status === 'aberto' || r.status === 'em_andamento').length;
  const done = reports.filter(r => r.status === 'finalizado').length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Visão geral do sistema</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => navigate('/relatorios/novo')} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />Novo RAT
            </Button>
            <Button variant="outline" onClick={() => navigate('/qrcode')} className="flex-1 sm:flex-none">
              <QrCode className="h-4 w-4 mr-2" />Ler QR Code
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total RATs" value={reports.length} icon={FileText} />
          <StatsCard title="Rascunhos" value={drafts} icon={Clock} />
          <StatsCard title="Em Aberto" value={open} icon={AlertCircle} />
          <StatsCard title="Finalizados" value={done} icon={CheckCircle} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {reports.slice(0, 5).map(report => (
                <button
                  key={report.id}
                  onClick={() => navigate(`/relatorios/${report.id}`)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium text-sm text-primary">{report.numero}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="text-sm truncate">{report.clienteNome} • {report.equipamentoDescricao}</p>
                    <p className="text-xs text-muted-foreground">{report.dataAbertura} • {report.tecnicoNome}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

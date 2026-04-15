import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { getReports } from "@/lib/api-service";
import { Report, ReportStatus } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportsList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  const filtered = reports.filter(r => {
    const matchSearch = !search || 
      r.numero.toLowerCase().includes(search.toLowerCase()) ||
      r.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
      r.numeroSerie.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Relatórios Técnicos</h1>
          <Button onClick={() => navigate('/relatorios/novo')}>
            <Plus className="h-4 w-4 mr-2" />Novo RAT
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número, cliente ou série..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum relatório encontrado.</CardContent></Card>
          )}
          {filtered.map(report => (
            <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/relatorios/${report.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-semibold text-primary">{report.numero}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="text-sm font-medium">{report.clienteNome}</p>
                    <p className="text-sm text-muted-foreground">{report.equipamentoDescricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {report.dataAbertura} • {report.tecnicoNome} • {report.tipoManutencao}
                    </p>
                  </div>
                  {report.fotos.length > 0 && (
                    <div className="hidden sm:block flex-shrink-0">
                      <div className="grid grid-cols-3 gap-2">
                        {report.fotos.slice(0, 3).map((foto) => (
                          <img
                            key={foto.id}
                            src={foto.url}
                            alt="Thumbnail"
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                      {report.fotos.length > 3 && (
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          +{report.fotos.length - 3} foto(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

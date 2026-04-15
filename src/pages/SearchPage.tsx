import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";
import { searchReports } from "@/lib/api-service";
import { Report } from "@/lib/types";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Report[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length >= 2) {
      const r = await searchReports(q);
      setResults(r);
      setSearched(true);
    } else {
      setResults([]);
      setSearched(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Buscar</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por número RAT, cliente, série..." value={query} onChange={e => handleSearch(e.target.value)}
            className="pl-11 h-12 text-base" autoFocus />
        </div>
        {searched && results.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum resultado encontrado.</p>
        )}
        <div className="space-y-3">
          {results.map(r => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/relatorios/${r.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold text-primary">{r.numero}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm font-medium">{r.clienteNome} • {r.equipamentoDescricao}</p>
                <p className="text-xs text-muted-foreground">{r.dataAbertura} • {r.tecnicoNome}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

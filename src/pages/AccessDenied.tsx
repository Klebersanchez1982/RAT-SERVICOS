import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Acesso negado</h1>
          <p className="text-muted-foreground">
            Seu nível de acesso não possui permissão para esta funcionalidade.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao início</Button>
        </div>
      </div>
    </AppLayout>
  );
}

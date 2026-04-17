import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { getReportById, saveReport } from "@/lib/api-service";
import { checklistTemplateDefinitions, getDefaultChecklistAnswers } from "@/lib/checklist-templates";
import { ChecklistAnswer, ChecklistItemResult, ChecklistTemplateKey, Report } from "@/lib/types";
import { toast } from "sonner";

const NEW_REPORT_DRAFT_STORAGE_KEY = "rat-report-draft-new";

function isTemplateKey(value: string | undefined): value is ChecklistTemplateKey {
  return Boolean(value && value in checklistTemplateDefinitions);
}

export default function ChecklistFillPage() {
  const navigate = useNavigate();
  const { id, template } = useParams();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<ChecklistAnswer[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");

  const templateKey = isTemplateKey(template) ? template : null;

  const templateLabel = useMemo(() => {
    if (!templateKey) return "Checklist";
    return checklistTemplateDefinitions[templateKey].label;
  }, [templateKey]);

  useEffect(() => {
    const hydrate = async () => {
      if (!templateKey) {
        setLoading(false);
        return;
      }

      if (id) {
        const report = await getReportById(id);
        const persisted = (report?.checklistRespostas || []).filter((answer) => answer.itemId.startsWith(`${templateKey}:`));
        setAnswers(persisted.length > 0 ? persisted : getDefaultChecklistAnswers(templateKey));
        setObservacoesGerais(report?.checklistObservacoesGerais || "");
        setLoading(false);
        return;
      }

      const rawDraft = localStorage.getItem(NEW_REPORT_DRAFT_STORAGE_KEY);
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft) as Partial<Report>;
          const persisted = (draft.checklistRespostas || []).filter((answer) => answer.itemId.startsWith(`${templateKey}:`));
          setAnswers(persisted.length > 0 ? persisted : getDefaultChecklistAnswers(templateKey));
          setObservacoesGerais(draft.checklistObservacoesGerais || "");
        } catch {
          setAnswers(getDefaultChecklistAnswers(templateKey));
          setObservacoesGerais("");
        }
      } else {
        setAnswers(getDefaultChecklistAnswers(templateKey));
        setObservacoesGerais("");
      }

      setLoading(false);
    };

    hydrate();
  }, [id, templateKey]);

  const updateAnswer = (itemId: string, field: "resultado" | "observacao", value: ChecklistItemResult | string) => {
    setAnswers((current) => current.map((answer) => (answer.itemId === itemId ? { ...answer, [field]: value } : answer)));
  };

  const saveChecklist = async () => {
    if (!templateKey) {
      toast.error("Modelo de checklist invalido.");
      return;
    }

    const status = answers.length > 0 && answers.every((answer) => answer.resultado !== "pendente") ? "concluido" : "em_preenchimento";

    if (id) {
      await saveReport({
        id,
        checklistModelo: templateKey,
        checklistRespostas: answers,
        checklistStatus: status,
        checklistObservacoesGerais: observacoesGerais,
      });
      toast.success("Checklist salvo no relatorio.");
      navigate(`/relatorios/${id}/editar?step=6`);
      return;
    }

    const rawDraft = localStorage.getItem(NEW_REPORT_DRAFT_STORAGE_KEY);
    let draft: Partial<Report> = {};

    if (rawDraft) {
      try {
        draft = JSON.parse(rawDraft) as Partial<Report>;
      } catch {
        draft = {};
      }
    }

    const mergedDraft: Partial<Report> = {
      ...draft,
      checklistModelo: templateKey,
      checklistRespostas: answers,
      checklistStatus: status,
      checklistObservacoesGerais: observacoesGerais,
    };

    localStorage.setItem(NEW_REPORT_DRAFT_STORAGE_KEY, JSON.stringify(mergedDraft));
    toast.success("Checklist salvo no rascunho.");
    navigate("/relatorios/novo?step=6");
  };

  if (!templateKey) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Modelo de checklist nao encontrado.</p>
              <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{templateLabel}</h1>
              <p className="text-sm text-muted-foreground">Preencha os itens e salve para voltar ao relatorio.</p>
            </div>
          </div>
          <Button onClick={saveChecklist} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />Salvar checklist
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Itens do Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando checklist...</p>
            ) : (
              answers.map((answer) => (
                <div key={answer.itemId} className="p-3 rounded-lg border space-y-2">
                  <p className="text-sm font-medium">{answer.itemLabel}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label>Resultado</Label>
                      <Select
                        value={answer.resultado}
                        onValueChange={(value) => updateAnswer(answer.itemId, "resultado", value as ChecklistItemResult)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="conforme">Conforme</SelectItem>
                          <SelectItem value="nao_conforme">Nao conforme</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Observacao</Label>
                      <Input
                        placeholder="Informe observacao, se necessario"
                        value={answer.observacao}
                        onChange={(event) => updateAnswer(answer.itemId, "observacao", event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observacoes Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoesGerais}
              onChange={(event) => setObservacoesGerais(event.target.value)}
              placeholder="Registre observacoes gerais do checklist..."
              rows={5}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

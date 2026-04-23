import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  checklistTemplateDefinitions,
  getChecklistBinaryChoices,
  getChecklistProgress,
  getChecklistTemplateSections,
  getDefaultChecklistAnswers,
} from "@/lib/checklist-templates";
import { ChecklistAnswer, ChecklistBinaryChoice, ChecklistItemResult, ChecklistTemplateKey, Report } from "@/lib/types";
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
  const checklistHeaderRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const templateKey = isTemplateKey(template) ? template : null;
  const checklistSections = useMemo(() => (templateKey ? getChecklistTemplateSections(templateKey) : []), [templateKey]);
  const inspecaoGeometriaGroups = useMemo(() => {
    if (templateKey !== "inspecao_geometria") {
      return [] as ChecklistAnswer[][];
    }

    const groups: ChecklistAnswer[][] = [];

    for (let index = 0; index < answers.length; index += 1) {
      const current = answers[index];

      if (!current) {
        continue;
      }

      if (current.itemLabel.startsWith("IMPRECISAO TOTAL DE GIRO\nDA SUPERFICIE INTERNA")) {
        groups.push(answers.slice(index, index + 3));
        index += 2;
        continue;
      }

      if (current.itemLabel.includes("COMPRIMENTO DE 100mm")) {
        groups.push(answers.slice(index, index + 2));
        index += 1;
        continue;
      }

      groups.push([current]);
    }

    return groups;
  }, [answers, templateKey]);

  const templateLabel = useMemo(() => {
    if (!templateKey) return "Checklist";
    return checklistTemplateDefinitions[templateKey].label;
  }, [templateKey]);

  const goBackToChecklist = () => {
    if (id) {
      navigate(`/relatorios/${id}/editar?step=6`);
      return;
    }

    navigate("/relatorios/novo?step=6");
  };

  const scrollToChecklistHeader = () => {
    checklistHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const registerFieldRef = (key: string) => (element: HTMLElement | null) => {
    fieldRefs.current[key] = element;
  };

  const focusField = (key: string) => {
    const element = fieldRefs.current[key];

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  };

  const validateChecklist = () => {
    if (!templateKey) {
      return null;
    }

    if (templateKey === "checklist_cu") {
      for (const section of checklistSections) {
        for (const sectionItem of section.items) {
          const answer = answers.find((entry) => entry.itemId === sectionItem.itemId);

          if (!answer) {
            return { fieldKey: `item:${sectionItem.itemId}:revisado`, label: `${section.groupLabel} / ${sectionItem.subgroupLabel} - Revisado` };
          }

          if (!answer.revisado) {
            return { fieldKey: `item:${sectionItem.itemId}:revisado`, label: `${section.groupLabel} / ${sectionItem.subgroupLabel} - Revisado` };
          }

          if (!answer.trocado) {
            return { fieldKey: `item:${sectionItem.itemId}:trocado`, label: `${section.groupLabel} / ${sectionItem.subgroupLabel} - Trocado` };
          }

          if (!answer.statusLivre?.trim()) {
            return { fieldKey: `item:${sectionItem.itemId}:statusLivre`, label: `${section.groupLabel} / ${sectionItem.subgroupLabel} - Status` };
          }
        }
      }
    } else if (templateKey === "inspecao_geometria") {
      for (const answer of answers) {
        if (!answer.valorEncontrado?.trim()) {
          return { fieldKey: `item:${answer.itemId}:valorEncontrado`, label: `${answer.itemLabel} - Valor encontrado` };
        }

        if (!answer.valorAtual?.trim()) {
          return { fieldKey: `item:${answer.itemId}:valorAtual`, label: `${answer.itemLabel} - Valor atual` };
        }
      }
    } else {
      for (const answer of answers) {
        if (answer.resultado === "pendente") {
          return { fieldKey: `item:${answer.itemId}:resultado`, label: answer.itemLabel };
        }
      }
    }

    if (!observacoesGerais.trim()) {
      return { fieldKey: "observacoesGerais", label: "Observacoes gerais" };
    }

    return null;
  };

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

  const updateAnswer = (
    itemId: string,
    field: "resultado" | "revisado" | "trocado" | "statusLivre" | "valorEncontrado" | "valorAtual",
    value: ChecklistItemResult | ChecklistBinaryChoice | string,
  ) => {
    setAnswers((current) => current.map((answer) => (answer.itemId === itemId ? { ...answer, [field]: value } : answer)));
  };
  const saveChecklist = async () => {
    if (!templateKey) {
      toast.error("Modelo de checklist invalido.");
      return;
    }

    const validationError = validateChecklist();

    if (validationError) {
      toast.error(`Preencha ${validationError.label}.`);
      focusField(validationError.fieldKey);
      return;
    }

    const progress = templateKey ? getChecklistProgress(templateKey, answers) : { completed: 0, total: 0 };
    const status = progress.total > 0 && progress.completed === progress.total ? "concluido" : "em_preenchimento";

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
            <Button variant="ghost" size="icon" onClick={goBackToChecklist}>
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
            <CardTitle ref={checklistHeaderRef}>Itens do Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando checklist...</p>
            ) : templateKey === "checklist_cu" ? (
              checklistSections.map((section) => (
                <div key={section.groupLabel} className="rounded-xl border overflow-hidden shadow-sm">
                  <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 border-l-4 border-l-primary">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{section.groupLabel}</h3>
                    </div>
                  </div>
                  <div className="divide-y">
                    {section.items.map((sectionItem) => {
                      const answer = answers.find((entry) => entry.itemId === sectionItem.itemId);

                      if (!answer) return null;

                      return (
                        <div key={sectionItem.itemId} className="p-4 space-y-3">
                          <div>
                            <p className="text-sm font-medium">{sectionItem.subgroupLabel}</p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                            <div>
                              <Label>Revisado</Label>
                              <Select
                                value={answer.revisado || ""}
                                onValueChange={(value) => updateAnswer(sectionItem.itemId, "revisado", value as ChecklistBinaryChoice)}
                              >
                                <SelectTrigger ref={registerFieldRef(`item:${sectionItem.itemId}:revisado`)} className="w-fit min-w-[96px] h-8 text-xs">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getChecklistBinaryChoices().map((choice) => (
                                    <SelectItem key={choice} value={choice}>
                                      {choice === "sim" ? "Sim" : "Não"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Trocado</Label>
                              <Select
                                value={answer.trocado || ""}
                                onValueChange={(value) => updateAnswer(sectionItem.itemId, "trocado", value as ChecklistBinaryChoice)}
                              >
                                <SelectTrigger ref={registerFieldRef(`item:${sectionItem.itemId}:trocado`)} className="w-fit min-w-[96px] h-8 text-xs">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getChecklistBinaryChoices().map((choice) => (
                                    <SelectItem key={choice} value={choice}>
                                      {choice === "sim" ? "Sim" : "Não"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="lg:col-span-3">
                              <Label>Status</Label>
                              <Textarea
                                ref={registerFieldRef(`item:${sectionItem.itemId}:statusLivre`)}
                                placeholder="Descreva o status"
                                value={answer.statusLivre || ""}
                                onChange={(event) => updateAnswer(sectionItem.itemId, "statusLivre", event.target.value)}
                                onInput={(event) => {
                                  const target = event.currentTarget;
                                  target.style.height = "auto";
                                  target.style.height = `${target.scrollHeight}px`;
                                }}
                                rows={1}
                                className="min-h-10 resize-none overflow-hidden"
                              />
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : templateKey === "inspecao_geometria" ? (
              <div className="rounded-xl border overflow-hidden shadow-sm">
                <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-primary">INSPECAO DE GEOMETRIA</h3>
                  </div>
                </div>
                <div className="divide-y">
                  {inspecaoGeometriaGroups.map((group, groupIndex) => (
                    <div key={`inspecao-group-${groupIndex}`} className="p-2">
                      <div className="rounded-lg border overflow-hidden">
                        {group.map((answer, answerIndex) => (
                          <div
                            key={answer.itemId}
                            className={`p-4 space-y-3 ${answerIndex > 0 ? "border-t" : ""}`}
                          >
                            <div>
                              <p className="text-sm font-medium whitespace-pre-line">{answer.itemLabel}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Valor encontrado</Label>
                                <Input
                                  ref={registerFieldRef(`item:${answer.itemId}:valorEncontrado`)}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  placeholder="0"
                                  value={answer.valorEncontrado || ""}
                                  onChange={(event) => updateAnswer(answer.itemId, "valorEncontrado", event.target.value)}
                                />
                              </div>

                              <div>
                                <Label>Valor atual</Label>
                                <Input
                                  ref={registerFieldRef(`item:${answer.itemId}:valorAtual`)}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  placeholder="0"
                                  value={answer.valorAtual || ""}
                                  onChange={(event) => updateAnswer(answer.itemId, "valorAtual", event.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                        <SelectTrigger ref={registerFieldRef(`item:${answer.itemId}:resultado`)}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="conforme">Conforme</SelectItem>
                          <SelectItem value="nao_conforme">Nao conforme</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
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
              ref={registerFieldRef("observacoesGerais")}
              value={observacoesGerais}
              onChange={(event) => setObservacoesGerais(event.target.value)}
              onInput={(event) => {
                const target = event.currentTarget;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
              placeholder="Registre observacoes gerais do checklist..."
              rows={1}
              className="min-h-24 resize-none overflow-hidden"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-2">
          <Button type="button" variant="outline" onClick={scrollToChecklistHeader}>
            Voltar ao cabeçalho
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

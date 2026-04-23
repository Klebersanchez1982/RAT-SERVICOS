import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarIcon, Plus, Save } from "lucide-react";
import { getReportById, saveReport } from "@/lib/api-service";
import {
  checklistTemplateDefinitions,
  getChecklistBinaryChoices,
  getChecklistProgress,
  getChecklistTemplateSections,
  getDefaultChecklistAnswers,
} from "@/lib/checklist-templates";
import {
  ChecklistAnswer,
  ChecklistBinaryChoice,
  ChecklistCorrectiveEntry,
  ChecklistInstrucaoCabecalho,
  ChecklistItemResult,
  ChecklistTemplateKey,
  Report,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NEW_REPORT_DRAFT_STORAGE_KEY = "rat-report-draft-new";
const CHECKLIST_CORRETIVAS_MIN_ROWS = 1;
const INSTRUCAO_GEOMETRICA_IMAGE_BASE_PATH = "/instrucao-geometrica";

type InstrucaoGeometricaMeta = {
  item: string;
  especificado: string;
  campoA: string;
  campoB?: string;
};

const INSTRUCAO_GEOMETRICA_META: InstrucaoGeometricaMeta[] = [
  {
    item: "ITEM 1.1",
    especificado: "A e B - Max 0,06 / total",
    campoA: "A - Longitudinal (eixo X) encontrado (mm)",
    campoB: "B - Transversal (eixo Y) encontrado (mm)",
  },
  {
    item: "ITEM 1.2",
    especificado: "0 a 0,005 mm",
    campoA: "Encontrado (mm)",
  },
  {
    item: "ITEM 1.3",
    especificado: "A max 0,008 mm | B max 0,015 mm",
    campoA: "A - Mais proximo do nariz (mm)",
    campoB: "B - A 300 mm do nariz (mm)",
  },
  {
    item: "ITEM 1.4",
    especificado: "A e B - Max 0,012 / 300 mm",
    campoA: "A - Plano XZ encontrado (mm)",
    campoB: "B - Plano YZ encontrado (mm)",
  },
  {
    item: "ITEM 1.5",
    especificado: "Max 0,020 / 500 mm",
    campoA: "Encontrado (mm)",
  },
  {
    item: "ITEM 1.6",
    especificado: "Max 0,015 / total",
    campoA: "Encontrado (mm)",
  },
  {
    item: "ITEM 1.7",
    especificado: "Max 0,020 / total",
    campoA: "Encontrado (mm)",
  },
  {
    item: "ITEM 1.8",
    especificado: "Max 0,015 / 300 mm",
    campoA: "Encontrado (mm)",
  },
  {
    item: "ITEM 1.9",
    especificado: "A e B - Max 0,020 / 300 mm",
    campoA: "A - Plano XZ encontrado (mm)",
    campoB: "B - Plano YZ encontrado (mm)",
  },
];

function createEmptyChecklistCorretiva(): ChecklistCorrectiveEntry {
  return {
    data: "",
    servicoExecutado: "",
    defeito: "",
    relatorioOuOs: "",
    responsavel: "",
  };
}

function normalizeChecklistCorretivas(entries?: ChecklistCorrectiveEntry[]): ChecklistCorrectiveEntry[] {
  const normalized = (entries || []).map((entry) => ({
    data: entry.data || "",
    servicoExecutado: entry.servicoExecutado || "",
    defeito: entry.defeito || "",
    relatorioOuOs: entry.relatorioOuOs || "",
    responsavel: entry.responsavel || "",
  }));

  while (normalized.length < CHECKLIST_CORRETIVAS_MIN_ROWS) {
    normalized.push(createEmptyChecklistCorretiva());
  }

  return normalized;
}

function parseIsoDate(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateToDisplay(value: string): string {
  if (!value) {
    return "dd/mm/aaaa";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function isTemplateKey(value: string | undefined): value is ChecklistTemplateKey {
  return Boolean(value && value in checklistTemplateDefinitions);
}

function getInstrucaoCabecalho(
  answer: ChecklistAnswer,
  index: number,
  meta?: InstrucaoGeometricaMeta,
): Required<ChecklistInstrucaoCabecalho> {
  return {
    tituloDocumento: index === 0 ? "INSPECAO GEOMETRICA CENTRO DE USINAGEM" : "INSTRUÇÃO COMPLEMENTAR DE INSPEÇÃO",
    chaveCabecalho: answer.instrucaoCabecalho?.chaveCabecalho || "",
    edCabecalho: answer.instrucaoCabecalho?.edCabecalho || "",
    descricao: answer.instrucaoCabecalho?.descricao || answer.itemLabel,
    elaborado: answer.instrucaoCabecalho?.elaborado || "",
    analisadoAprovado: answer.instrucaoCabecalho?.analisadoAprovado || "",
    data: answer.instrucaoCabecalho?.data || "",
    folha: answer.instrucaoCabecalho?.folha || `${index + 1}/9`,
    chave: answer.instrucaoCabecalho?.chave || (meta?.item || `ITEM ${index + 1}`),
    ed: answer.instrucaoCabecalho?.ed || "",
    tipo: answer.instrucaoCabecalho?.tipo || "Individual / Coletivo / Fixo",
  };
}

export default function ChecklistFillPage() {
  const navigate = useNavigate();
  const { id, template } = useParams();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<ChecklistAnswer[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [corretivas, setCorretivas] = useState<ChecklistCorrectiveEntry[]>(() => normalizeChecklistCorretivas());
  const [openCalendarIndex, setOpenCalendarIndex] = useState<number | null>(null);
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
    } else if (templateKey === "checklist_preventiva") {
      for (const section of checklistSections) {
        for (const sectionItem of section.items) {
          const answer = answers.find((entry) => entry.itemId === sectionItem.itemId);

          if (!answer) {
            return { fieldKey: `item:${sectionItem.itemId}:statusLivre`, label: `${section.groupLabel} / ${sectionItem.subgroupLabel} - Status` };
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
    } else if (templateKey === "instrucao_geometrica") {
      for (const [index, answer] of answers.entries()) {
        const meta = INSTRUCAO_GEOMETRICA_META[index];

        if (!answer.valorEncontrado?.trim()) {
          return {
            fieldKey: `item:${answer.itemId}:valorEncontrado`,
            label: `${meta?.item || answer.itemLabel} - ${meta?.campoA || "Encontrado (mm)"}`,
          };
        }

        if (meta?.campoB && !answer.valorAtual?.trim()) {
          return {
            fieldKey: `item:${answer.itemId}:valorAtual`,
            label: `${meta.item} - ${meta.campoB}`,
          };
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
        setCorretivas(normalizeChecklistCorretivas(report?.checklistCorretivas));
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
          setCorretivas(normalizeChecklistCorretivas(draft.checklistCorretivas));
        } catch {
          setAnswers(getDefaultChecklistAnswers(templateKey));
          setObservacoesGerais("");
          setCorretivas(normalizeChecklistCorretivas());
        }
      } else {
        setAnswers(getDefaultChecklistAnswers(templateKey));
        setObservacoesGerais("");
        setCorretivas(normalizeChecklistCorretivas());
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

  const updateInstrucaoCabecalho = (
    itemId: string,
    field: keyof ChecklistInstrucaoCabecalho,
    value: string,
  ) => {
    setAnswers((current) =>
      current.map((answer) =>
        answer.itemId === itemId
          ? {
              ...answer,
              instrucaoCabecalho: {
                ...(answer.instrucaoCabecalho || {}),
                [field]: value,
              },
            }
          : answer,
      ),
    );
  };

  const updateCorretiva = (index: number, field: keyof ChecklistCorrectiveEntry, value: string) => {
    setCorretivas((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)),
    );
  };

  const addCorretiva = () => {
    setCorretivas((current) => [...current, createEmptyChecklistCorretiva()]);
  };

  const selectCorretivaDate = (index: number, dateValue: Date) => {
    updateCorretiva(index, "data", toIsoDate(dateValue));
    setOpenCalendarIndex(null);
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
        checklistCorretivas: corretivas,
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
      checklistCorretivas: corretivas,
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
                              <div ref={registerFieldRef(`item:${sectionItem.itemId}:revisado`)} className="mt-1 grid grid-cols-2 gap-2 lg:hidden">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-9 hover:bg-green-50",
                                    answer.revisado === "sim" && "pointer-events-none",
                                  )}
                                  style={
                                    answer.revisado === "sim"
                                      ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#ffffff" }
                                      : { borderColor: "#86efac", color: "#15803d" }
                                  }
                                  onClick={() => updateAnswer(sectionItem.itemId, "revisado", "sim")}
                                >
                                  Sim
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-9 hover:bg-red-50",
                                    answer.revisado === "nao" && "pointer-events-none",
                                  )}
                                  style={
                                    answer.revisado === "nao"
                                      ? { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }
                                      : { borderColor: "#fca5a5", color: "#b91c1c" }
                                  }
                                  onClick={() => updateAnswer(sectionItem.itemId, "revisado", "nao")}
                                >
                                  Não
                                </Button>
                              </div>
                              <div className="hidden lg:block">
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
                            </div>

                            <div>
                              <Label>Trocado</Label>
                              <div ref={registerFieldRef(`item:${sectionItem.itemId}:trocado`)} className="mt-1 grid grid-cols-2 gap-2 lg:hidden">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-9 hover:bg-green-50",
                                    answer.trocado === "sim" && "pointer-events-none",
                                  )}
                                  style={
                                    answer.trocado === "sim"
                                      ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#ffffff" }
                                      : { borderColor: "#86efac", color: "#15803d" }
                                  }
                                  onClick={() => updateAnswer(sectionItem.itemId, "trocado", "sim")}
                                >
                                  Sim
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-9 hover:bg-red-50",
                                    answer.trocado === "nao" && "pointer-events-none",
                                  )}
                                  style={
                                    answer.trocado === "nao"
                                      ? { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }
                                      : { borderColor: "#fca5a5", color: "#b91c1c" }
                                  }
                                  onClick={() => updateAnswer(sectionItem.itemId, "trocado", "nao")}
                                >
                                  Não
                                </Button>
                              </div>
                              <div className="hidden lg:block">
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
            ) : templateKey === "checklist_preventiva" ? (
              checklistSections.map((section) => (
                <div key={section.groupLabel} className="rounded-xl border overflow-hidden shadow-sm">
                  <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 border-l-4 border-l-primary">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{section.groupLabel}</h3>
                    </div>
                  </div>
                  <div className="md:hidden divide-y">
                    {section.items.map((sectionItem) => {
                      const answer = answers.find((entry) => entry.itemId === sectionItem.itemId);

                      if (!answer) return null;

                      return (
                        <div key={sectionItem.itemId} className="p-3 space-y-3">
                          <p className="text-sm font-medium">{sectionItem.subgroupLabel}</p>

                          <div>
                            <Label>Observacoes</Label>
                            <Textarea
                              placeholder="Observacoes"
                              value={answer.observacao || ""}
                              onChange={(event) => {
                                setAnswers((current) =>
                                  current.map((entry) =>
                                    entry.itemId === sectionItem.itemId
                                      ? { ...entry, observacao: event.target.value }
                                      : entry,
                                  ),
                                );
                              }}
                              onInput={(event) => {
                                const target = event.currentTarget;
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                              rows={1}
                              className="mt-1 min-h-10 resize-none overflow-hidden"
                            />
                          </div>

                          <div>
                            <Label>Status</Label>
                            <div ref={registerFieldRef(`item:${sectionItem.itemId}:statusLivre`)} className="mt-1 grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "h-9 hover:bg-green-50",
                                  answer.statusLivre === "sim" && "pointer-events-none",
                                )}
                                style={
                                  answer.statusLivre === "sim"
                                    ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#ffffff" }
                                    : { borderColor: "#86efac", color: "#15803d" }
                                }
                                onClick={() => updateAnswer(sectionItem.itemId, "statusLivre", "sim")}
                              >
                                Sim
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "h-9 hover:bg-red-50",
                                  answer.statusLivre === "nao" && "pointer-events-none",
                                )}
                                style={
                                  answer.statusLivre === "nao"
                                    ? { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }
                                    : { borderColor: "#fca5a5", color: "#b91c1c" }
                                }
                                onClick={() => updateAnswer(sectionItem.itemId, "statusLivre", "nao")}
                              >
                                Não
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-3 py-2 font-semibold">Descritivo servico a ser executado</th>
                          <th className="px-3 py-2 font-semibold w-[30%]">Observacoes</th>
                          <th className="px-3 py-2 font-semibold w-[24%]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((sectionItem) => {
                          const answer = answers.find((entry) => entry.itemId === sectionItem.itemId);

                          if (!answer) return null;

                          return (
                            <tr key={sectionItem.itemId} className="border-b align-top">
                              <td className="px-3 py-3 font-medium">{sectionItem.subgroupLabel}</td>
                              <td className="px-3 py-2">
                                <Textarea
                                  placeholder="Observacoes"
                                  value={answer.observacao || ""}
                                  onChange={(event) => {
                                    setAnswers((current) =>
                                      current.map((entry) =>
                                        entry.itemId === sectionItem.itemId
                                          ? { ...entry, observacao: event.target.value }
                                          : entry,
                                      ),
                                    );
                                  }}
                                  onInput={(event) => {
                                    const target = event.currentTarget;
                                    target.style.height = "auto";
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                  rows={1}
                                  className="min-h-10 resize-none overflow-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={answer.statusLivre || ""}
                                  onValueChange={(value) => updateAnswer(sectionItem.itemId, "statusLivre", value as ChecklistBinaryChoice)}
                                >
                                  <SelectTrigger ref={registerFieldRef(`item:${sectionItem.itemId}:statusLivre`)} className="w-fit min-w-[96px] h-8 text-xs">
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
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                <div className="p-3 space-y-3">
                  {inspecaoGeometriaGroups.map((group, groupIndex) => (
                    <div key={`inspecao-group-${groupIndex}`} className="space-y-2">
                      <div className="rounded-lg border overflow-hidden">
                        {group.map((answer, answerIndex) => (
                          <div
                            key={answer.itemId}
                            className={`p-3 sm:p-4 space-y-2 sm:space-y-3 ${answerIndex > 0 ? "border-t" : ""}`}
                          >
                            <div>
                              <p className="text-sm font-medium whitespace-pre-line">{answer.itemLabel}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <Label>Valor encontrado</Label>
                                <Input
                                  ref={registerFieldRef(`item:${answer.itemId}:valorEncontrado`)}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  placeholder="0"
                                  className="mt-1"
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
                                  className="mt-1"
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
            ) : templateKey === "instrucao_geometrica" ? (
              <div className="rounded-xl border overflow-hidden shadow-sm">
                <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-primary">INSTRUCAO GEOMETRICA</h3>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {answers.map((answer, index) => {
                    const meta = INSTRUCAO_GEOMETRICA_META[index];
                    const imageSrc = `${INSTRUCAO_GEOMETRICA_IMAGE_BASE_PATH}/items/item-1-${index + 1}.png`;
                    const cabecalho = getInstrucaoCabecalho(answer, index, meta);

                    return (
                      <div key={answer.itemId} className="rounded-lg border overflow-hidden">
                        <div className="p-3 sm:p-4 space-y-3">
                          <div className="rounded-md border overflow-hidden text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-12">
                              <div className="sm:col-span-8 border-b sm:border-r p-2">
                                <p className="font-semibold">Titulo</p>
                                <p className="mt-1 text-[11px] sm:text-xs font-medium">{cabecalho.tituloDocumento}</p>
                              </div>
                              <div className="sm:col-span-3 border-b sm:border-r p-2">
                                <p className="font-semibold">CHAVE</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.chaveCabecalho}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "chaveCabecalho", event.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-1 border-b p-2">
                                <p className="font-semibold">ED.</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.edCabecalho}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "edCabecalho", event.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12">
                              <div className="sm:col-span-5 border-b sm:border-r p-2">
                                <p className="font-semibold">Descricao</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.descricao}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "descricao", event.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-2 border-b sm:border-r p-2">
                                <p className="font-semibold">Elaborado</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.elaborado}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "elaborado", event.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-3 border-b sm:border-r p-2">
                                <p className="font-semibold">Analisado / Aprovado</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.analisadoAprovado}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "analisadoAprovado", event.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-2 border-b p-2">
                                <p className="font-semibold">Data</p>
                                <Textarea
                                  rows={2}
                                  placeholder="dd/mm/aaaa"
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.data}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "data", event.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12">
                              <div className="sm:col-span-3 border-b sm:border-r p-2">
                                <p className="font-semibold">Folha</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.folha}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "folha", event.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-9 border-b p-2">
                                <p className="font-semibold">Tipo</p>
                                <Textarea
                                  rows={2}
                                  className="mt-1 min-h-14 text-xs resize-y"
                                  value={cabecalho.tipo}
                                  onChange={(event) => updateInstrucaoCabecalho(answer.itemId, "tipo", event.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Figura de referencia</Label>
                            <div className="rounded-md border overflow-hidden bg-muted/20">
                              <img
                                src={imageSrc}
                                alt={`Figura de referencia ${meta?.item || `item-${index + 1}`}`}
                                className="w-full h-auto"
                                loading="lazy"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <div>
                              <Label>{meta?.campoA || "Encontrado (mm)"}</Label>
                              <Input
                                ref={registerFieldRef(`item:${answer.itemId}:valorEncontrado`)}
                                type="number"
                                inputMode="decimal"
                                step="any"
                                placeholder="0"
                                className="mt-1"
                                value={answer.valorEncontrado || ""}
                                onChange={(event) => updateAnswer(answer.itemId, "valorEncontrado", event.target.value)}
                              />
                            </div>

                            {meta?.campoB ? (
                              <div>
                                <Label>{meta.campoB}</Label>
                                <Input
                                  ref={registerFieldRef(`item:${answer.itemId}:valorAtual`)}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  placeholder="0"
                                  className="mt-1"
                                  value={answer.valorAtual || ""}
                                  onChange={(event) => updateAnswer(answer.itemId, "valorAtual", event.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="hidden sm:block" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

        {templateKey === "checklist_preventiva" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Controle de Corretivas</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addCorretiva}>
                  <Plus className="h-4 w-4 mr-1" />Mais
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {corretivas.map((item, index) => (
                <div key={`corretiva-${index}`} className="rounded-lg border p-2 border-t-0 first:border-t">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-1 mb-2">
                    <div className="md:col-span-2">
                      <Label htmlFor={`data-${index}`}>Data</Label>
                      <Popover
                        open={openCalendarIndex === index}
                        onOpenChange={(open) => setOpenCalendarIndex(open ? index : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id={`data-${index}`}
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !item.data && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDateToDisplay(item.data)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseIsoDate(item.data)}
                            onSelect={(selectedDate) => {
                              if (!selectedDate) {
                                return;
                              }

                              selectCorretivaDate(index, selectedDate);
                            }}
                            footer={
                              <div className="border-t p-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => selectCorretivaDate(index, new Date())}
                                >
                                  HOJE
                                </Button>
                              </div>
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="md:col-span-5">
                      <Label htmlFor={`servico-${index}`}>Servico executado</Label>
                      <Input
                        id={`servico-${index}`}
                        className="mt-1"
                        value={item.servicoExecutado}
                        onChange={(event) => updateCorretiva(index, "servicoExecutado", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor={`defeito-${index}`}>Defeito</Label>
                      <Input
                        id={`defeito-${index}`}
                        className="mt-1"
                        value={item.defeito}
                        onChange={(event) => updateCorretiva(index, "defeito", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`relatorio-${index}`}>Relatorio ou O.S</Label>
                      <Input
                        id={`relatorio-${index}`}
                        className="mt-1"
                        value={item.relatorioOuOs}
                        onChange={(event) => updateCorretiva(index, "relatorioOuOs", event.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`responsavel-${index}`}>Responsavel</Label>
                    <Input
                      id={`responsavel-${index}`}
                      className="mt-1"
                      value={item.responsavel}
                      onChange={(event) => updateCorretiva(index, "responsavel", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pb-2">
          <Button type="button" variant="outline" onClick={scrollToChecklistHeader}>
            Voltar ao cabeçalho
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

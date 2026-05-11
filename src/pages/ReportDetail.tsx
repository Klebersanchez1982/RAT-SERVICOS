import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Edit, MessageCircle, Printer, RotateCcw, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { getReportById, hasPermission } from "@/lib/api-service";
import { Report } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getChecklistTemplateSections } from "@/lib/checklist-templates";
import jsPDF from "jspdf";
import { toast } from "sonner";

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoDescription, setSelectedPhotoDescription] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (id) getReportById(id).then(r => setReport(r || null));
  }, [id]);

  const handleOpenPhoto = (url: string, description: string) => {
    setSelectedPhotoUrl(url);
    setSelectedPhotoDescription(description);
    setZoom(1);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 1));
  const handleResetZoom = () => setZoom(1);

  const handleWheelZoom = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 0.25, 4));
    } else {
      setZoom(prev => Math.max(prev - 0.25, 1));
    }
  };

  const sanitizeFileName = (value: string) => value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");

  const formatCurrency = (value: number) => `R$ ${(value || 0).toFixed(2)}`;

  const buildPdfDocument = (source: Report) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const maxWidth = 515;
    const lineHeight = 16;
    let y = 44;

    const ensureSpace = (needed = lineHeight) => {
      if (y + needed > 800) {
        doc.addPage();
        y = 44;
      }
    };

    const addTitle = (title: string) => {
      ensureSpace(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(title, marginX, y);
      y += 22;
    };

    const addField = (label: string, value?: string) => {
      const safeValue = value && value.trim().length > 0 ? value : "-";
      const wrapped = doc.splitTextToSize(`${label}: ${safeValue}`, maxWidth);
      ensureSpace(wrapped.length * lineHeight + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * lineHeight;
    };

    const addSpacer = (size = 8) => {
      y += size;
    };

    addTitle(`Relatorio Tecnico - OS ${source.numero}`);
    addField("Status", source.status.replace("_", " "));
    addField("Data", `${source.dataAbertura} ${source.horaAbertura ? `as ${source.horaAbertura}` : ""}`.trim());
    addField("Tecnico", source.tecnicoNome);

    addSpacer();
    addTitle("Informacoes Gerais");
    addField("Tipo", source.tipoManutencao);
    addField("Cliente", source.clienteNome);

    addSpacer();
    addTitle("Equipamento");
    addField("Descricao", source.equipamentoDescricao);
    addField("Numero de Serie", source.numeroSerie);

    addSpacer();
    addTitle("Servico");
    addField("Problema Relatado", source.problemaRelatado);
    addField("Diagnostico", source.diagnostico);
    addField("Servico Executado", source.servicoExecutado);
    addField("Informacoes Adicionais", source.informacoesAdicionais);

    addSpacer();
    addTitle("Despesas");
    addField("Pedagio", formatCurrency(source.pedagio));
    addField("Refeicao", formatCurrency(source.refeicao));
    addField("Estadia", formatCurrency(source.estadia));
    addField("Total", formatCurrency((source.pedagio || 0) + (source.refeicao || 0) + (source.estadia || 0)));

    addSpacer();
    addTitle("Checklist");
    addField("Modelo", source.checklistModelo || "-");
    addField("Status", (source.checklistStatus || "pendente").replace("_", " "));

    if (source.pecas && source.pecas.length > 0) {
      addSpacer();
      addTitle("Pecas Utilizadas");
      source.pecas.forEach((part, index) => {
        addField(`Item ${index + 1}`, `${part.descricao} - Qtd: ${part.quantidade}`);
      });
    }

    if (source.fotos && source.fotos.length > 0) {
      addSpacer();
      addField("Fotos anexadas", String(source.fotos.length));
    }

    addSpacer(12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    ensureSpace(14);
    doc.text(`Criado por ${source.criadoPor}${source.editadoPor ? ` | Editado por ${source.editadoPor}` : ""}`, marginX, y);

    const filename = sanitizeFileName(`OS-${source.numero}.pdf`);
    return { doc, filename };
  };

  const handleGeneratePdf = () => {
    if (!report) return;
    try {
      const { doc, filename } = buildPdfDocument(report);
      doc.save(filename);
      toast.success("PDF gerado com sucesso.");
    } catch {
      toast.error("Nao foi possivel gerar o PDF.");
    }
  };

  const handleGeneratePdfAndShareWhatsapp = async () => {
    if (!report) return;

    try {
      const { doc, filename } = buildPdfDocument(report);
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
      const message = `Segue PDF da OS ${report.numero} - ${report.clienteNome}.`;

      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({
            title: `OS ${report.numero}`,
            text: message,
            files: [pdfFile],
          });
          toast.success("PDF anexado e compartilhado com sucesso.");
          return;
        } catch {
          // Segue para fallback quando o navegador nao suporta anexo por share.
        }
      }

      doc.save(filename);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      toast.info("O navegador nao permitiu anexo automatico. PDF foi baixado e o WhatsApp foi aberto para voce anexar manualmente.");
    } catch {
      toast.error("Nao foi possivel gerar e compartilhar o PDF.");
    }
  };

  const handleSharePdfNative = async () => {
    if (!report) return;

    if (typeof navigator === "undefined" || !("share" in navigator)) {
      toast.error("Seu navegador nao suporta compartilhamento de arquivos.");
      return;
    }

    try {
      const { doc, filename } = buildPdfDocument(report);
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

      await navigator.share({
        title: `OS ${report.numero}`,
        text: `Segue PDF da OS ${report.numero} - ${report.clienteNome}.`,
        files: [pdfFile],
      });

      toast.success("PDF compartilhado com sucesso.");
    } catch {
      toast.error("Nao foi possivel compartilhar o PDF.");
    }
  };

  if (!report) return <AppLayout><div className="p-6 text-center text-muted-foreground">Carregando...</div></AppLayout>;

  const canEdit = report.status !== 'fechado' && hasPermission("reports.edit");
  const checklistLabelMap = {
    checklist_cu: 'CHECK LIST C.U',
    checklist_preventiva: 'CHECK LIST PREVENTIVA PADRÃO',
    inspecao_geometria: 'INSPEÇÃO DE GEOMETRIA',
    instrucao_geometrica: 'Instrução Geométrica Centro de Usinagem',
  } as const;

  const checklistSections = report.checklistModelo ? getChecklistTemplateSections(report.checklistModelo) : [];
  const formatDate = (value: string) => {
    if (!value) return "—";

    const parts = value.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    return value;
  };
  const checklistCorretivasPreenchidas = (report.checklistCorretivas || []).filter(
    (item) =>
      Boolean(item.data?.trim()) ||
      Boolean(item.servicoExecutado?.trim()) ||
      Boolean(item.defeito?.trim()) ||
      Boolean(item.relatorioOuOs?.trim()) ||
      Boolean(item.responsavel?.trim()),
  );

  return (
    <AppLayout>
      <div className="report-print-root p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono">{report.numero}</h1>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-xs text-muted-foreground">Numero da OS: {report.numero}</p>
              <p className="text-sm text-muted-foreground">{report.dataAbertura} às {report.horaAbertura}</p>
            </div>
          </div>
          <div className="report-print-hidden flex gap-2">
            {canEdit && (
              <Button size="sm" onClick={() => navigate(`/relatorios/${id}/editar`)}>
                <Edit className="h-4 w-4 mr-1" />
                {report.status === 'finalizado' ? 'Editar e reenviar' : 'Editar'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleGeneratePdfAndShareWhatsapp}
              className="bg-[#25D366] text-white hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="h-4 w-4 mr-1" />PDF + WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={handleSharePdfNative}>
              <Share2 className="h-4 w-4 mr-1" />Compartilhar
            </Button>
            <Button size="sm" variant="outline" onClick={handleGeneratePdf}><Printer className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="capitalize font-medium">{report.tipoManutencao}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Técnico</span><span className="font-medium">{report.tecnicoNome}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{report.clienteNome}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Descrição</span><span className="font-medium">{report.equipamentoDescricao}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">N° Série</span><span className="font-mono">{report.numeroSerie}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalhes do Serviço</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div><p className="text-muted-foreground mb-1">Problema Relatado</p><p>{report.problemaRelatado || '—'}</p></div>
            <Separator />
            <div><p className="text-muted-foreground mb-1">Diagnóstico</p><p>{report.diagnostico || '—'}</p></div>
            <Separator />
            <div><p className="text-muted-foreground mb-1">Serviço Executado</p><p>{report.servicoExecutado || '—'}</p></div>
            {report.informacoesAdicionais && (<><Separator /><div><p className="text-muted-foreground mb-1">Informações Adicionais</p><p>{report.informacoesAdicionais}</p></div></>)}
          </CardContent>
        </Card>

        {report.pecas.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Peças Utilizadas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...new Map(report.pecas.filter(part => part.origem === 'kit').map(part => [part.kitId || part.kitNome || 'Kit', part.kitNome || 'Kit'])).entries()].map(([kitKey, kitNome]) => {
                  const itens = report.pecas.filter(part => part.origem === 'kit' && (part.kitId || part.kitNome || 'Kit') === kitKey);
                  if (itens.length === 0) return null;

                  return (
                    <div key={kitKey} className="space-y-2">
                      <h3 className="text-sm font-semibold">{kitNome}</h3>
                      <div className="space-y-2">
                        {itens.map(p => (
                          <div key={p.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                            <span>{p.descricao}</span><span className="font-medium">Qtd: {p.quantidade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {report.pecas.some(part => (part.origem || 'avulso') === 'avulso') && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Itens avulsos</h3>
                    <div className="space-y-2">
                      {report.pecas.filter(part => (part.origem || 'avulso') === 'avulso').map(p => (
                        <div key={p.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                          <span>{p.descricao}</span><span className="font-medium">Qtd: {p.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Deslocamento e Despesas</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Veículo</span><span className="font-medium">{report.veiculoDescricao} {report.placa}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Saída</span><span className="font-medium">{report.deslocamentoIda || '—'}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Retorno</span><span className="font-medium">{report.deslocamentoVolta || '—'}</span></div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/50 rounded"><p className="text-muted-foreground text-xs">Pedágio</p><p className="font-medium">R$ {report.pedagio.toFixed(2)}</p></div>
              <div className="text-center p-2 bg-muted/50 rounded"><p className="text-muted-foreground text-xs">Refeição</p><p className="font-medium">R$ {report.refeicao.toFixed(2)}</p></div>
              <div className="text-center p-2 bg-muted/50 rounded"><p className="text-muted-foreground text-xs">Estadia</p><p className="font-medium">R$ {report.estadia.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Modelo</span><span className="font-medium">{(report.checklistModelo && checklistLabelMap[report.checklistModelo]) || '—'}</span></div>
              <div className="report-field-row flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{(report.checklistStatus || 'pendente').replace('_', ' ')}</span></div>
            </div>

            {report.checklistRespostas && report.checklistRespostas.length > 0 && (
              <div className="space-y-3 pt-2">
                {report.checklistModelo === 'checklist_cu' ? (
                  checklistSections.map((section) => (
                    <div key={section.groupLabel} className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/60 px-3 py-2 border-b">
                        <p className="text-xs font-semibold tracking-wide">{section.groupLabel}</p>
                      </div>
                      <div className="divide-y">
                        {section.items.map((sectionItem) => {
                          const item = report.checklistRespostas?.find((answer) => answer.itemId === sectionItem.itemId);

                          if (!item) return null;

                          return (
                            <div key={sectionItem.itemId} className="p-3 space-y-1">
                              <p className="font-medium">{sectionItem.subgroupLabel}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-muted-foreground">
                                <p>Revisado: {(item.revisado || '—').toUpperCase()}</p>
                                <p>Trocado: {(item.trocado || '—').toUpperCase()}</p>
                                <p>Status: {item.statusLivre || '—'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : report.checklistModelo === 'checklist_preventiva' ? (
                  checklistSections.map((section) => (
                    <div key={section.groupLabel} className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/60 px-3 py-2 border-b">
                        <p className="text-xs font-semibold tracking-wide">{section.groupLabel}</p>
                      </div>
                      <div className="divide-y">
                        {section.items.map((sectionItem) => {
                          const item = report.checklistRespostas?.find((answer) => answer.itemId === sectionItem.itemId);

                          if (!item) return null;

                          return (
                            <div key={sectionItem.itemId} className="p-3 space-y-1">
                              <p className="font-medium">{sectionItem.subgroupLabel}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                                <p>Observacoes: {item.observacao || '—'}</p>
                                <p>Status: {item.statusLivre || '—'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : report.checklistModelo === 'inspecao_geometria' ? (
                  report.checklistRespostas.map((item) => (
                    <div key={item.itemId} className="p-2 rounded bg-muted/50">
                      <p className="font-medium whitespace-pre-line">{item.itemLabel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <p>Valor encontrado: {item.valorEncontrado || '—'}</p>
                        <p>Valor atual: {item.valorAtual || '—'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  report.checklistRespostas.map((item) => (
                    <div key={item.itemId} className="p-2 rounded bg-muted/50">
                      <p className="font-medium">{item.itemLabel}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Resultado: {item.resultado.replace('_', ' ')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {report.checklistObservacoesGerais && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Observacoes gerais</p>
                <p className="text-sm whitespace-pre-wrap">{report.checklistObservacoesGerais}</p>
              </div>
            )}

            {checklistCorretivasPreenchidas.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">Controle de corretivas</p>
                {checklistCorretivasPreenchidas.map((item, index) => (
                  <div key={`corretiva-${index}`} className="rounded border p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 text-xs text-muted-foreground">
                      <p>Data: {formatDate(item.data)}</p>
                      <p>Servico executado: {item.servicoExecutado || '—'}</p>
                      <p>Defeito: {item.defeito || '—'}</p>
                      <p>Relatorio ou O.S: {item.relatorioOuOs || '—'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Responsavel: {item.responsavel || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {report.checklistLinkExterno && (
                <Button size="sm" variant="outline" asChild>
                  <a href={report.checklistLinkExterno} target="_blank" rel="noreferrer">Abrir preenchimento externo</a>
                </Button>
              )}
              {report.checklistArquivoUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={report.checklistArquivoUrl} download={report.checklistArquivoNome || 'checklist'}>Baixar checklist final</a>
                </Button>
              )}
              {report.checklistCapaUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={report.checklistCapaUrl} download={report.checklistCapaNome || 'capa'}>Baixar capa</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fotos do Atendimento</CardTitle></CardHeader>
          <CardContent>
            {report.fotos.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Camera className="h-10 w-10 mx-auto mb-2" />
                Nenhuma foto foi adicionada neste relatório.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.fotos.map((foto) => (
                  <div key={foto.id} className="space-y-1">
                    <img
                      src={foto.url}
                      alt={foto.descricao || "Foto do atendimento"}
                      className="w-full h-32 object-cover rounded-lg border cursor-zoom-in"
                      onClick={() => handleOpenPhoto(foto.url, foto.descricao || "Foto do atendimento")}
                    />
                    <p className="text-xs text-muted-foreground capitalize">{foto.categoria}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(selectedPhotoUrl)} onOpenChange={(isOpen) => { if (!isOpen) setSelectedPhotoUrl(null); }}>
          <DialogContent className="max-w-5xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Visualizar imagem</DialogTitle>
            </DialogHeader>

            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm text-muted-foreground truncate">{selectedPhotoDescription}</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="icon" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleResetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-full max-h-[70vh] overflow-auto rounded-md border bg-black/5">
              {selectedPhotoUrl && (
                <img
                  src={selectedPhotoUrl}
                  alt={selectedPhotoDescription}
                  className="mx-auto h-auto max-w-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
                  onWheel={handleWheelZoom}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground text-center pb-6">
          Criado por {report.criadoPor} {report.editadoPor && `• Editado por ${report.editadoPor}`}
        </p>
      </div>
    </AppLayout>
  );
}

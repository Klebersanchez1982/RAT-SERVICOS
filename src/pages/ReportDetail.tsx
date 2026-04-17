import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Edit, Printer, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { getReportById, hasPermission } from "@/lib/api-service";
import { Report } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  if (!report) return <AppLayout><div className="p-6 text-center text-muted-foreground">Carregando...</div></AppLayout>;

  const canEdit = report.status !== 'fechado' && hasPermission("reports.edit");
  const checklistLabelMap = {
    checklist_cu: 'CHECK LIST C.U',
    checklist_preventiva: 'CHECK LIST PREVENTIVA PADRÃO',
    inspecao_geometria: 'INSPEÇÃO DE GEOMETRIA',
    instrucao_geometrica: 'Instrução Geométrica Centro de Usinagem',
  } as const;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono">{report.numero}</h1>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-sm text-muted-foreground">{report.dataAbertura} às {report.horaAbertura}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button size="sm" onClick={() => navigate(`/relatorios/${id}/editar`)}>
                <Edit className="h-4 w-4 mr-1" />
                {report.status === 'finalizado' ? 'Editar e reenviar' : 'Editar'}
              </Button>
            )}
            <Button size="sm" variant="outline"><Printer className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="capitalize font-medium">{report.tipoManutencao}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Técnico</span><span className="font-medium">{report.tecnicoNome}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{report.clienteNome}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Descrição</span><span className="font-medium">{report.equipamentoDescricao}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">N° Série</span><span className="font-mono">{report.numeroSerie}</span></div>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Veículo</span><span className="font-medium">{report.veiculoDescricao} {report.placa}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saída</span><span className="font-medium">{report.deslocamentoIda || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Retorno</span><span className="font-medium">{report.deslocamentoVolta || '—'}</span></div>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Modelo</span><span className="font-medium">{(report.checklistModelo && checklistLabelMap[report.checklistModelo]) || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{(report.checklistStatus || 'pendente').replace('_', ' ')}</span></div>
            </div>

            {report.checklistRespostas && report.checklistRespostas.length > 0 && (
              <div className="space-y-2 pt-2">
                {report.checklistRespostas.map((item) => (
                  <div key={item.itemId} className="p-2 rounded bg-muted/50">
                    <p className="font-medium">{item.itemLabel}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Resultado: {item.resultado.replace('_', ' ')}
                    </p>
                    {item.observacao && <p className="text-xs">Obs: {item.observacao}</p>}
                  </div>
                ))}
              </div>
            )}

            {report.checklistObservacoesGerais && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Observacoes gerais</p>
                <p className="text-sm whitespace-pre-wrap">{report.checklistObservacoesGerais}</p>
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

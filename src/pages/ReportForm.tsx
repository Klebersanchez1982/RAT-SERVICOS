import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Send, Plus, Trash2, Camera, X } from "lucide-react";
import {
  deleteReportPhoto,
  getCurrentUser,
  getClients,
  getEquipments,
  getPartKits,
  getReportById,
  getReportPhotos,
  getVehicles,
  isRemoteBackendEnabled,
  saveReport,
  uploadReportPhoto,
} from "@/lib/api-service";
import { Client, Equipment, Vehicle, Report, MaintenanceType, ReportPart, PhotoCategory, ReportPhoto, PartKit, ChecklistTemplateKey, ChecklistStatus } from "@/lib/types";
import { checklistTemplates } from "@/lib/checklist-templates";
import { toast } from "sonner";

const NEW_REPORT_DRAFT_STORAGE_KEY = 'rat-report-draft-new';

const steps = [
  { id: 1, title: "Informações Gerais" },
  { id: 2, title: "Equipamento" },
  { id: 3, title: "Serviço" },
  { id: 4, title: "Peças e Materiais" },
  { id: 5, title: "Deslocamento" },
  { id: 6, title: "Checklist" },
  { id: 7, title: "Fotos" },
  { id: 8, title: "Revisão" },
];

export default function ReportForm() {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [partKits, setPartKits] = useState<PartKit[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState('');
  const isEditing = Boolean(id);

  const [form, setForm] = useState<Partial<Report>>({
    tipoManutencao: 'corretiva',
    pecas: [],
    fotos: [],
    checklistStatus: 'pendente',
    horasTrabalho: 0,
    pedagio: 0,
    refeicao: 0,
    estadia: 0,
  });

  useEffect(() => {
    const stepParam = Number(searchParams.get('step'));
    if (Number.isFinite(stepParam) && stepParam >= 1 && stepParam <= steps.length) {
      setStep(stepParam);
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([getClients(), getVehicles()]).then(([c, v]) => {
      setClients(c);
      setVehicles(v);
    });
    getPartKits().then(setPartKits);
    if (id) {
      getReportById(id).then(r => { if (r) setForm(r); });
      if (isRemoteBackendEnabled()) {
        getReportPhotos(id).then((photos) => {
          setForm(prev => ({ ...prev, fotos: photos }));
        });
      }
    } else {
      const rawDraft = localStorage.getItem(NEW_REPORT_DRAFT_STORAGE_KEY);
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft) as Partial<Report>;
          setForm(prev => ({
            ...prev,
            ...draft,
            tecnicoId: draft.tecnicoId || currentUser.id,
            tecnicoNome: draft.tecnicoNome || currentUser.nome,
          }));
          return;
        } catch {
          localStorage.removeItem(NEW_REPORT_DRAFT_STORAGE_KEY);
        }
      }

      setForm(prev => ({
        ...prev,
        tecnicoId: currentUser.id,
        tecnicoNome: currentUser.nome,
      }));
    }
  }, [id, currentUser.id, currentUser.nome]);

  useEffect(() => {
    if (form.clienteId) {
      getEquipments(form.clienteId).then(setEquipments);
    }
  }, [form.clienteId]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(vehicle => vehicle.ativo || vehicle.id === form.veiculoId);
  }, [vehicles, form.veiculoId]);

  const availableClients = useMemo(() => {
    return clients.filter(client => client.ativo || client.id === form.clienteId);
  }, [clients, form.clienteId]);

  const availablePartKits = useMemo(() => {
    return partKits.filter(kit => kit.tecnicoId === currentUser.id);
  }, [partKits, currentUser.id]);

  const update = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const currentChecklistAnswers = useMemo(() => {
    const templateKey = form.checklistModelo;
    if (!templateKey) return [];
    return (form.checklistRespostas || []).filter(answer => answer.itemId.startsWith(`${templateKey}:`));
  }, [form.checklistModelo, form.checklistRespostas]);

  const openChecklistScreen = (templateKey: ChecklistTemplateKey) => {
    const draft: Partial<Report> = {
      ...form,
      checklistModelo: templateKey,
      checklistStatus: form.checklistStatus || 'em_preenchimento',
      tecnicoId: form.tecnicoId || currentUser.id,
      tecnicoNome: form.tecnicoNome || currentUser.nome,
    };

    if (!id) {
      localStorage.setItem(NEW_REPORT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      navigate(`/relatorios/checklist/${templateKey}`);
      return;
    }

    navigate(`/relatorios/${id}/checklist/${templateKey}`);
  };

  const handleClientChange = (clienteId: string) => {
    const client = clients.find(c => c.id === clienteId);
    update('clienteId', clienteId);
    update('clienteNome', client?.nomeFantasia || '');
    update('equipamentoId', '');
    update('equipamentoDescricao', '');
    update('numeroSerie', '');
  };

  const handleEquipmentChange = (equipId: string) => {
    const eq = equipments.find(e => e.id === equipId);
    update('equipamentoId', equipId);
    update('equipamentoDescricao', eq?.descricao || '');
    update('numeroSerie', eq?.numeroSerie || '');
  };

  const handleVehicleChange = (vId: string) => {
    const v = vehicles.find(ve => ve.id === vId);
    update('veiculoId', vId);
    update('veiculoDescricao', v?.descricao || '');
    update('placa', v?.placa || '');
  };

  const addPart = (origem: 'kit' | 'avulso') => {
    const pecas = [...(form.pecas || []), { id: String(Date.now()), descricao: '', quantidade: 1, observacao: '', origem }];
    update('pecas', pecas);
  };

  const addKit = (kitId: string) => {
    const kit = availablePartKits.find(item => item.id === kitId);
    if (!kit) return;

    const kitParts: ReportPart[] = kit.pecas.map((part, index) => ({
      id: `${kit.id}-${Date.now()}-${index}`,
      descricao: part.descricao,
      quantidade: part.quantidade,
      observacao: part.observacao || '',
      origem: 'kit',
      kitId: kit.id,
      kitNome: kit.nome,
    }));

    update('pecas', [...(form.pecas || []), ...kitParts]);
    setSelectedKitId('');
  };

  const removePart = (partId: string) => {
    update('pecas', (form.pecas || []).filter(p => p.id !== partId));
  };

  const updatePart = (partId: string, field: keyof ReportPart, value: any) => {
    update('pecas', (form.pecas || []).map(p => p.id === partId ? { ...p, [field]: value } : p));
  };

  const isDataUrl = (value: string) => /^data:image\//i.test(value);

  const addLocalPhoto = (photo: ReportPhoto) => {
    setForm(prev => ({
      ...prev,
      fotos: [...(prev.fotos || []), photo],
    }));
  };

  const replacePhoto = (tempId: string, nextPhoto: ReportPhoto) => {
    setForm(prev => ({
      ...prev,
      fotos: (prev.fotos || []).map((photo) => (photo.id === tempId ? nextPhoto : photo)),
    }));
  };

  const processDataUrlPhoto = async (dataUrl: string, descricao: string) => {
    const tempId = String(Date.now() + Math.floor(Math.random() * 1000));
    const localPhoto: ReportPhoto = {
      id: tempId,
      relatorioId: form.id || '',
      url: dataUrl,
      categoria: 'durante',
      descricao,
    };

    addLocalPhoto(localPhoto);

    if (isRemoteBackendEnabled() && form.id) {
      try {
        setUploadingPhotos(true);
        const uploaded = await uploadReportPhoto(form.id, {
          dataUrl,
          categoria: localPhoto.categoria,
          descricao: localPhoto.descricao,
        });
        replacePhoto(tempId, uploaded);
      } catch {
        toast.error('Não foi possível enviar a foto para o backend.');
      } finally {
        setUploadingPhotos(false);
      }
    }
  };

  const handleSave = async (status?: 'rascunho' | 'aberto' | 'finalizado') => {
    setSaving(true);
    try {
      const saved = await saveReport({
        ...form,
        tecnicoId: form.tecnicoId || currentUser.id,
        tecnicoNome: form.tecnicoNome || currentUser.nome,
        ...(status ? { status } : {}),
      });

      const pendingPhotos = (form.fotos || []).filter(photo => isDataUrl(photo.url));
      if (saved.id && pendingPhotos.length > 0 && isRemoteBackendEnabled()) {
        setUploadingPhotos(true);
        const uploadedPhotos = await Promise.all(
          pendingPhotos.map(photo =>
            uploadReportPhoto(saved.id, {
              dataUrl: photo.url,
              categoria: photo.categoria,
              descricao: photo.descricao,
            }).catch(() => photo),
          ),
        );

        const finalPhotos = [
          ...(form.fotos || []).filter(photo => !isDataUrl(photo.url)),
          ...uploadedPhotos,
        ];

        setForm(prev => ({ ...prev, fotos: finalPhotos }));
        await saveReport({ id: saved.id, fotos: finalPhotos });
      }

      if (status === 'rascunho') {
        toast.success('Rascunho salvo!');
      } else if (status === 'finalizado') {
        toast.success('Relatório atualizado e reenviado!');
      } else {
        toast.success(isEditing ? 'Relatório atualizado!' : 'Relatório enviado!');
      }

      if (!id) {
        localStorage.removeItem(NEW_REPORT_DRAFT_STORAGE_KEY);
      }

      navigate('/relatorios');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setUploadingPhotos(false);
      setSaving(false);
    }
  };

  const handlePhotoCapture = async () => {
    // Tentar usar WebRTC para melhor resolução
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 4096 },
          height: { ideal: 4096 }
        }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          
          const newPhoto = {
            id: String(Date.now()),
            relatorioId: form.id || '',
            url: dataUrl,
            categoria: 'durante' as PhotoCategory,
            descricao: `Foto - ${new Date().toLocaleString()}`,
          };

          processDataUrlPhoto(newPhoto.url, newPhoto.descricao)
            .then(() => toast.success('Foto adicionada com sucesso!'))
            .catch(() => toast.error('Erro ao processar foto.'));
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      // Fallback para input file padrão
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.multiple = true;
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          const filesArray = Array.from(files);
          const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
            reader.readAsDataURL(file);
          });

          try {
            const dataUrls = await Promise.all(filesArray.map(readAsDataUrl));
            const newPhotos = dataUrls.map((url, i) => ({
              id: String(Date.now() + i),
              relatorioId: form.id || '',
              url,
              categoria: 'durante' as PhotoCategory,
              descricao: filesArray[i].name,
            }));

            await Promise.all(newPhotos.map(photo => processDataUrlPhoto(photo.url, photo.descricao)));
            toast.success(`${filesArray.length} foto(s) adicionada(s)`);
          } catch {
            toast.error('Erro ao processar foto(s).');
          }
        }
      };
      input.click();
    }
  };

  const handleRemovePhoto = async (photo: ReportPhoto) => {
    const reportId = form.id;
    if (!reportId) {
      update('fotos', (form.fotos || []).filter(item => item.id !== photo.id));
      return;
    }

    try {
      if (isRemoteBackendEnabled() && !isDataUrl(photo.url)) {
        await deleteReportPhoto(reportId, photo.id, photo.driveFileId);
      }
      update('fotos', (form.fotos || []).filter(item => item.id !== photo.id));
      toast.success('Foto removida.');
    } catch {
      toast.error('Não foi possível remover a foto.');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{id ? `Editar ${form.numero || ''}` : 'Novo Relatório'}</h1>
            <p className="text-sm text-muted-foreground">Etapa {step} de {steps.length} — {steps[step - 1].title}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-1">
          {steps.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              className={`flex-1 h-2 rounded-full transition-colors ${s.id <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {/* Step 1: General Info */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Tipo de Manutenção</Label>
                  <Select value={form.tipoManutencao} onValueChange={v => update('tipoManutencao', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corretiva">Corretiva</SelectItem>
                      <SelectItem value="garantia">Garantia</SelectItem>
                      <SelectItem value="instalacao">Instalação</SelectItem>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="vistoria">Vistoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Cliente</Label>
                  <Select value={form.clienteId} onValueChange={handleClientChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {availableClients.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Somente clientes ativos são exibidos.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Equipamento</Label>
                <Select value={form.equipamentoId} onValueChange={handleEquipmentChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                  <SelectContent>
                    {equipments.map(e => <SelectItem key={e.id} value={e.id}>{e.descricao}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Número de Série</Label>
                <Input value={form.numeroSerie || ''} readOnly className="bg-muted" />
              </div>
              <div><Label>Problema Relatado</Label>
                <Textarea value={form.problemaRelatado || ''} onChange={e => update('problemaRelatado', e.target.value)} placeholder="Descreva o problema relatado pelo cliente..." rows={4} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Service */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Serviço Executado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Diagnóstico</Label>
                <Textarea value={form.diagnostico || ''} onChange={e => update('diagnostico', e.target.value)} placeholder="Diagnóstico técnico..." rows={3} />
              </div>
              <div><Label>Serviço Executado</Label>
                <Textarea value={form.servicoExecutado || ''} onChange={e => update('servicoExecutado', e.target.value)} placeholder="Descreva o serviço executado..." rows={4} />
              </div>
              <div><Label>Informações Adicionais</Label>
                <Textarea value={form.informacoesAdicionais || ''} onChange={e => update('informacoesAdicionais', e.target.value)} placeholder="Observações, recomendações..." rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Parts */}
        {step === 4 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Peças e Materiais</CardTitle>
              <div className="flex flex-wrap gap-2 justify-end items-center">
                <Select value={selectedKitId} onValueChange={setSelectedKitId}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecionar kit" /></SelectTrigger>
                  <SelectContent>
                    {availablePartKits.map(kit => (
                      <SelectItem key={kit.id} value={kit.id}>{kit.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => selectedKitId && addKit(selectedKitId)} disabled={!selectedKitId}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar kit
                </Button>
                <Button size="sm" variant="outline" onClick={() => addPart('avulso')}><Plus className="h-4 w-4 mr-1" />Avulso</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(form.pecas || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça adicionada.</p>
              )}
              {([...new Map((form.pecas || []).filter(part => part.origem === 'kit').map(part => [part.kitId || part.kitNome || 'Kit', part.kitNome || 'Kit'])).entries()] as Array<[string, string]>).map(([kitKey, kitNome]) => {
                const itens = (form.pecas || []).filter(part => (part.origem || 'avulso') === 'kit' && (part.kitId || part.kitNome || 'Kit') === kitKey);

                if (itens.length === 0) return null;

                return (
                  <div key={kitKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{kitNome}</h3>
                      <span className="text-xs text-muted-foreground">{itens.length} item(ns)</span>
                    </div>
                    <div className="space-y-2">
                      {itens.map(part => (
                        <div key={part.id} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Descrição da peça" value={part.descricao} onChange={e => updatePart(part.id, 'descricao', e.target.value)} />
                            <div className="flex gap-2">
                              <Input type="number" placeholder="Qtd" value={part.quantidade} onChange={e => updatePart(part.id, 'quantidade', Number(e.target.value))} className="w-20" min={1} />
                              <Input placeholder="Observação" value={part.observacao} onChange={e => updatePart(part.id, 'observacao', e.target.value)} />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removePart(part.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {((form.pecas || []).filter(part => (part.origem || 'avulso') === 'avulso').length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Itens avulsos</h3>
                    <span className="text-xs text-muted-foreground">{(form.pecas || []).filter(part => (part.origem || 'avulso') === 'avulso').length} item(ns)</span>
                  </div>
                  <div className="space-y-2">
                    {(form.pecas || []).filter(part => (part.origem || 'avulso') === 'avulso').map(part => (
                      <div key={part.id} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Input placeholder="Descrição da peça" value={part.descricao} onChange={e => updatePart(part.id, 'descricao', e.target.value)} />
                          <div className="flex gap-2">
                            <Input type="number" placeholder="Qtd" value={part.quantidade} onChange={e => updatePart(part.id, 'quantidade', Number(e.target.value))} className="w-20" min={1} />
                            <Input placeholder="Observação" value={part.observacao} onChange={e => updatePart(part.id, 'observacao', e.target.value)} />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removePart(part.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Travel */}
        {step === 5 && (
          <Card>
            <CardHeader><CardTitle>Deslocamento e Despesas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Veículo</Label>
                  <Select value={form.veiculoId} onValueChange={handleVehicleChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.descricao} - {v.placa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Somente veículos ativos são exibidos.</p>
                </div>
                <div><Label>Placa</Label>
                  <Input value={form.placa || ''} readOnly className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Hora Saída</Label>
                  <Input type="time" value={form.deslocamentoIda || ''} onChange={e => update('deslocamentoIda', e.target.value)} />
                </div>
                <div><Label>Hora Retorno</Label>
                  <Input type="time" value={form.deslocamentoVolta || ''} onChange={e => update('deslocamentoVolta', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Pedágio (R$)</Label>
                  <Input type="number" value={form.pedagio || 0} onChange={e => update('pedagio', Number(e.target.value))} min={0} step={0.50} />
                </div>
                <div><Label>Refeição (R$)</Label>
                  <Input type="number" value={form.refeicao || 0} onChange={e => update('refeicao', Number(e.target.value))} min={0} step={0.50} />
                </div>
                <div><Label>Estadia (R$)</Label>
                  <Input type="number" value={form.estadia || 0} onChange={e => update('estadia', Number(e.target.value))} min={0} step={0.50} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Checklist */}
        {step === 6 && (
          <Card>
            <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo de checklist</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checklistTemplates.map(template => (
                    <Button
                      key={template.key}
                      type="button"
                      variant={form.checklistModelo === template.key ? 'default' : 'outline'}
                      onClick={() => openChecklistScreen(template.key)}
                      className="justify-start"
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Ao clicar no modelo, abre a tela de preenchimento específico automaticamente.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Status do checklist</Label>
                  <Select value={form.checklistStatus || 'pendente'} onValueChange={(value) => update('checklistStatus', value as ChecklistStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_preenchimento">Em preenchimento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Itens respondidos</Label>
                  <Input
                    readOnly
                    value={`${currentChecklistAnswers.filter(answer => answer.resultado !== 'pendente').length}/${currentChecklistAnswers.length}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Photos */}
        {step === 7 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fotos</CardTitle>
              <Button size="sm" onClick={handlePhotoCapture} disabled={uploadingPhotos}>
                <Camera className="h-4 w-4 mr-1" />{uploadingPhotos ? 'Enviando...' : 'Capturar'}
              </Button>
            </CardHeader>
            <CardContent>
              {(form.fotos || []).length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma foto adicionada.</p>
                  <Button className="mt-3" variant="outline" onClick={handlePhotoCapture}>Tirar Foto</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(form.fotos || []).map(foto => (
                    <div key={foto.id} className="relative group">
                      <button
                        type="button"
                        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/65 text-white flex items-center justify-center"
                        onClick={() => handleRemovePhoto(foto)}
                        aria-label="Remover foto"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <img src={foto.url} alt={foto.descricao} className="w-full h-32 object-cover rounded-lg" />
                      <Select value={foto.categoria} onValueChange={v => {
                        update('fotos', (form.fotos || []).map(f => f.id === foto.id ? { ...f, categoria: v as PhotoCategory } : f));
                      }}>
                        <SelectTrigger className="absolute bottom-2 left-2 right-2 h-7 text-xs bg-card/90">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="antes">Antes</SelectItem>
                          <SelectItem value="durante">Durante</SelectItem>
                          <SelectItem value="depois">Depois</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 8: Review */}
        {step === 8 && (
          <Card>
            <CardHeader><CardTitle>Revisão do Relatório</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{form.tipoManutencao}</span></div>
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{form.clienteNome || '—'}</span></div>
                <div><span className="text-muted-foreground">Equipamento:</span> <span className="font-medium">{form.equipamentoDescricao || '—'}</span></div>
                <div><span className="text-muted-foreground">N° Série:</span> <span className="font-mono">{form.numeroSerie || '—'}</span></div>
                <div className="col-span-full"><span className="text-muted-foreground">Problema:</span> <p className="font-medium mt-1">{form.problemaRelatado || '—'}</p></div>
                <div className="col-span-full"><span className="text-muted-foreground">Diagnóstico:</span> <p className="font-medium mt-1">{form.diagnostico || '—'}</p></div>
                <div className="col-span-full"><span className="text-muted-foreground">Serviço:</span> <p className="font-medium mt-1">{form.servicoExecutado || '—'}</p></div>
                <div><span className="text-muted-foreground">Kits usados:</span> <span className="font-medium">{new Set((form.pecas || []).filter(p => p.origem === 'kit').map(p => p.kitNome || 'Kit')).size}</span></div>
                <div><span className="text-muted-foreground">Peças avulsas:</span> <span className="font-medium">{(form.pecas || []).filter(p => (p.origem || 'avulso') === 'avulso').length} itens</span></div>
                <div><span className="text-muted-foreground">Checklist:</span> <span className="font-medium">{checklistTemplates.find(t => t.key === form.checklistModelo)?.label || '—'}</span></div>
                <div><span className="text-muted-foreground">Status checklist:</span> <span className="font-medium capitalize">{(form.checklistStatus || 'pendente').replace('_', ' ')}</span></div>
                <div><span className="text-muted-foreground">Veículo:</span> <span className="font-medium">{form.veiculoDescricao || '—'} {form.placa}</span></div>
                <div><span className="text-muted-foreground">Despesas:</span> <span className="font-medium">R$ {((form.pedagio || 0) + (form.refeicao || 0) + (form.estadia || 0)).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Fotos:</span> <span className="font-medium">{(form.fotos || []).length}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pb-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />Anterior
            </Button>
          )}
          {step < steps.length && (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1">
              Próxima<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === steps.length && (
            <>
              <Button variant="outline" onClick={() => handleSave('rascunho')} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />Rascunho
              </Button>
              {isEditing && form.status === 'finalizado' ? (
                <Button onClick={() => handleSave('finalizado')} disabled={saving} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />Salvar e reenviar
                </Button>
              ) : (
                <Button onClick={() => handleSave('aberto')} disabled={saving} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />Enviar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Lock, LockOpen, Pencil, Plus, Search, Wrench } from "lucide-react";
import { getClients, getEquipments, hasPermission, saveEquipment, setEquipmentBlocked, updateEquipment } from "@/lib/api-service";
import { Client, Equipment } from "@/lib/types";

export default function EquipmentsPage() {
  const canManageEquipments = hasPermission("equipments.manage");
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formEquipment, setFormEquipment] = useState({
    clienteId: "",
    clienteNome: "",
    descricao: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
    localizacao: "",
    qrCode: "",
    ativo: true,
  });

  useEffect(() => {
    Promise.all([getClients(), getEquipments()]).then(([loadedClients, loadedEquipments]) => {
      setClients(loadedClients);
      setEquipments(loadedEquipments);
    });
  }, []);

  const isEditing = Boolean(editingEquipmentId);

  function resetForm() {
    setFormEquipment({
      clienteId: "",
      clienteNome: "",
      descricao: "",
      marca: "",
      modelo: "",
      numeroSerie: "",
      localizacao: "",
      qrCode: "",
      ativo: true,
    });
  }

  function openCreateDialog() {
    if (!canManageEquipments) return;
    setEditingEquipmentId(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(equipment: Equipment) {
    if (!canManageEquipments) return;
    setEditingEquipmentId(equipment.id);
    setFormEquipment({
      clienteId: equipment.clienteId,
      clienteNome: equipment.clienteNome,
      descricao: equipment.descricao,
      marca: equipment.marca,
      modelo: equipment.modelo,
      numeroSerie: equipment.numeroSerie,
      localizacao: equipment.localizacao,
      qrCode: equipment.qrCode,
      ativo: equipment.ativo,
    });
    setIsDialogOpen(true);
  }

  function handleFieldChange(field: keyof typeof formEquipment, value: string | boolean) {
    setFormEquipment(prev => ({ ...prev, [field]: value }));
  }

  async function handleSaveEquipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canManageEquipments) {
      toast({ title: "Sem permissão", description: "Seu nível de acesso não pode gerenciar equipamentos.", variant: "destructive" });
      return;
    }

    if (!formEquipment.descricao.trim() || !formEquipment.numeroSerie.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha pelo menos Descrição e Número de Série.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing && editingEquipmentId) {
        const updated = await updateEquipment(editingEquipmentId, {
          clienteId: formEquipment.clienteId,
          clienteNome: formEquipment.clienteNome,
          descricao: formEquipment.descricao,
          marca: formEquipment.marca,
          modelo: formEquipment.modelo,
          numeroSerie: formEquipment.numeroSerie,
          localizacao: formEquipment.localizacao,
          qrCode: formEquipment.qrCode,
          ativo: formEquipment.ativo,
        });

        if (!updated) {
          toast({
            title: "Equipamento não encontrado",
            description: "Não foi possível editar o equipamento selecionado.",
            variant: "destructive",
          });
          return;
        }

        setEquipments(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        toast({
          title: "Equipamento atualizado",
          description: `${updated.descricao} foi atualizado com sucesso.`,
        });
      } else {
        const created = await saveEquipment(formEquipment);
        setEquipments(prev => [created, ...prev]);
        toast({
          title: "Equipamento criado",
          description: `${created.descricao} foi adicionado com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setEditingEquipmentId(null);
      resetForm();
    } catch {
      toast({
        title: isEditing ? "Erro ao editar equipamento" : "Erro ao criar equipamento",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBlocked(equipment: Equipment) {
    if (!canManageEquipments) {
      toast({ title: "Sem permissão", description: "Seu nível de acesso não pode alterar status de equipamentos.", variant: "destructive" });
      return;
    }

    try {
      const updated = await setEquipmentBlocked(equipment.id, equipment.ativo);
      if (!updated) {
        toast({
          title: "Equipamento não encontrado",
          description: "Não foi possível atualizar o status do equipamento.",
          variant: "destructive",
        });
        return;
      }

      setEquipments(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast({
        title: updated.ativo ? "Equipamento desbloqueado" : "Equipamento bloqueado",
        description: `${updated.descricao} está ${updated.ativo ? "ativo" : "inativo"}.`,
      });
    } catch {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  }

  const displayedEquipments = useMemo(() => {
    const filtered = equipments.filter(e =>
      e.descricao.toLowerCase().includes(search.toLowerCase()) ||
      e.numeroSerie.toLowerCase().includes(search.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.descricao.localeCompare(b.descricao, "pt-BR");
    });
  }, [equipments, search]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />Equipamentos</h1>
          {canManageEquipments && <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Novo</Button>}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar equipamento ou série..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="space-y-3">
          {displayedEquipments.map(e => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{e.descricao}</h3>
                  <Badge variant={e.ativo ? "default" : "destructive"}>{e.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{e.clienteNome}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Marca: {e.marca}</span>
                  <span>Modelo: {e.modelo}</span>
                  <span className="font-mono">Série: {e.numeroSerie}</span>
                  <span>Local: {e.localizacao}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {canManageEquipments && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(e)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                      </Button>
                      <Button size="sm" variant={e.ativo ? "destructive" : "outline"} onClick={() => handleToggleBlocked(e)}>
                        {e.ativo ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
                        {e.ativo ? "Bloquear" : "Desbloquear"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize os dados do equipamento selecionado." : "Preencha os dados para cadastrar um novo equipamento."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSaveEquipment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input id="descricao" value={formEquipment.descricao} onChange={e => handleFieldChange("descricao", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="numeroSerie">Número de Série *</Label>
                  <Input id="numeroSerie" value={formEquipment.numeroSerie} onChange={e => handleFieldChange("numeroSerie", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clienteNome">Cliente</Label>
                  <Select
                    value={formEquipment.clienteId || "sem-cliente"}
                    onValueChange={(value) => {
                      if (value === "sem-cliente") {
                        setFormEquipment(prev => ({ ...prev, clienteId: "", clienteNome: "" }));
                        return;
                      }

                      const selected = clients.find(c => c.id === value);
                      setFormEquipment(prev => ({
                        ...prev,
                        clienteId: value,
                        clienteNome: selected?.nomeFantasia || "",
                      }));
                    }}
                  >
                    <SelectTrigger id="clienteNome">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem-cliente">Sem cliente vinculado</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.nomeFantasia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" value={formEquipment.marca} onChange={e => handleFieldChange("marca", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" value={formEquipment.modelo} onChange={e => handleFieldChange("modelo", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input id="localizacao" value={formEquipment.localizacao} onChange={e => handleFieldChange("localizacao", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="qrCode">QR Code (opcional)</Label>
                  <Input id="qrCode" value={formEquipment.qrCode} onChange={e => handleFieldChange("qrCode", e.target.value)} placeholder="Se vazio, será gerado automaticamente" />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingEquipmentId(null);
                    resetForm();
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving || !canManageEquipments}>{isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

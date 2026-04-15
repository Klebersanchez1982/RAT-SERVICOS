import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Lock, LockOpen, Pencil, Plus, Car } from "lucide-react";
import { getVehicles, saveVehicle, setVehicleBlocked, updateVehicle } from "@/lib/api-service";
import { Vehicle } from "@/lib/types";
import { formatVehiclePlate } from "@/lib/utils";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formVehicle, setFormVehicle] = useState({
    descricao: "",
    modelo: "",
    ano: "",
    placa: "",
    ativo: true,
  });

  useEffect(() => { getVehicles().then(setVehicles); }, []);

  const isEditing = Boolean(editingVehicleId);

  function resetForm() {
    setFormVehicle({ descricao: "", modelo: "", ano: "", placa: "", ativo: true });
  }

  function openCreateDialog() {
    setEditingVehicleId(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(vehicle: Vehicle) {
    setEditingVehicleId(vehicle.id);
    setFormVehicle({
      descricao: vehicle.descricao,
      modelo: vehicle.modelo,
      ano: vehicle.ano,
      placa: vehicle.placa,
      ativo: vehicle.ativo,
    });
    setIsDialogOpen(true);
  }

  function handleFieldChange(field: keyof typeof formVehicle, value: string | boolean) {
    setFormVehicle(prev => ({ ...prev, [field]: value }));
  }

  async function handleSaveVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formVehicle.descricao.trim() || !formVehicle.placa.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha pelo menos Descrição e Placa.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing && editingVehicleId) {
        const updated = await updateVehicle(editingVehicleId, {
          descricao: formVehicle.descricao,
          modelo: formVehicle.modelo,
          ano: formVehicle.ano,
          placa: formVehicle.placa,
          ativo: formVehicle.ativo,
        });

        if (!updated) {
          toast({
            title: "Veículo não encontrado",
            description: "Não foi possível editar o veículo selecionado.",
            variant: "destructive",
          });
          return;
        }

        setVehicles(prev => prev.map(vehicle => (vehicle.id === updated.id ? updated : vehicle)));
        toast({
          title: "Veículo atualizado",
          description: `${updated.descricao} foi atualizado com sucesso.`,
        });
      } else {
        const created = await saveVehicle(formVehicle);
        setVehicles(prev => [created, ...prev]);
        toast({
          title: "Veículo criado",
          description: `${created.descricao} foi adicionado com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setEditingVehicleId(null);
      resetForm();
    } catch {
      toast({
        title: isEditing ? "Erro ao editar veículo" : "Erro ao criar veículo",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBlocked(vehicle: Vehicle) {
    try {
      const updated = await setVehicleBlocked(vehicle.id, vehicle.ativo);
      if (!updated) {
        toast({
          title: "Veículo não encontrado",
          description: "Não foi possível atualizar o status do veículo.",
          variant: "destructive",
        });
        return;
      }

      setVehicles(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast({
        title: updated.ativo ? "Veículo desbloqueado" : "Veículo bloqueado",
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

  const displayedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.descricao.localeCompare(b.descricao, "pt-BR");
    });
  }, [vehicles]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Car className="h-6 w-6 text-primary" />Veículos</h1>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayedVehicles.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{v.descricao}</h3>
                  <Badge variant={v.ativo ? "default" : "destructive"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{v.modelo} • {v.ano}</p>
                <p className="text-sm font-mono font-medium mt-1">{v.placa}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(v)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button size="sm" variant={v.ativo ? "destructive" : "outline"} onClick={() => handleToggleBlocked(v)}>
                    {v.ativo ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
                    {v.ativo ? "Bloquear" : "Desbloquear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize os dados do veículo selecionado." : "Preencha os dados para cadastrar um novo veículo."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSaveVehicle}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input id="descricao" value={formVehicle.descricao} onChange={e => handleFieldChange("descricao", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input id="placa" value={formVehicle.placa} onChange={e => handleFieldChange("placa", formatVehiclePlate(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ano">Ano</Label>
                  <Input id="ano" value={formVehicle.ano} onChange={e => handleFieldChange("ano", e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" value={formVehicle.modelo} onChange={e => handleFieldChange("modelo", e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingVehicleId(null);
                    resetForm();
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

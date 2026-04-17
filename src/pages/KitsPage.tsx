import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { deletePartKit, getCurrentUser, getPartKits, getReports, getUsers, hasPermission, savePartKit, updatePartKit } from "@/lib/api-service";
import { PartKit, User } from "@/lib/types";
import { Package2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Report } from "@/lib/types";

interface KitPartForm {
  id: string;
  descricao: string;
  quantidade: number;
  observacao: string;
}

interface KitFormState {
  nome: string;
  descricao: string;
  tecnicoId: string;
  tecnicoNome: string;
  pecas: KitPartForm[];
}

function createEmptyPart(): KitPartForm {
  return {
    id: String(Date.now() + Math.floor(Math.random() * 1000)),
    descricao: "",
    quantidade: 1,
    observacao: "",
  };
}

function createEmptyForm(): KitFormState {
  return {
    nome: "",
    descricao: "",
    tecnicoId: "",
    tecnicoNome: "",
    pecas: [createEmptyPart()],
  };
}

export default function KitsPage() {
  const currentUser = getCurrentUser();
  const canManageKits = hasPermission("kits.manage");
  const canManageAllKits = currentUser.perfil === "admin";
  const [kits, setKits] = useState<PartKit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formKit, setFormKit] = useState<KitFormState>(createEmptyForm());

  useEffect(() => {
    Promise.all([getPartKits(), getUsers(), getReports()]).then(([loadedKits, loadedUsers, loadedReports]) => {
      setKits(loadedKits);
      setUsers(loadedUsers);
      setReports(loadedReports);
    });
  }, []);

  const technicianUsers = useMemo(
    () => users.filter(user => user.ativo && (user.perfil === "gerente" || user.perfil === "tecnico" || user.perfil === "admin")),
    [users],
  );

  const isEditing = Boolean(editingKitId);

  const displayedKits = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    const visibleByProfile = canManageAllKits
      ? kits
      : kits.filter(kit => kit.tecnicoId === currentUser.id);

    const filtered = visibleByProfile.filter(kit =>
      kit.nome.toLowerCase().includes(normalizedSearch) ||
      kit.descricao.toLowerCase().includes(normalizedSearch) ||
      kit.tecnicoNome.toLowerCase().includes(normalizedSearch) ||
      kit.pecas.some(part => part.descricao.toLowerCase().includes(normalizedSearch)),
    );

    return [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [kits, search, canManageAllKits, currentUser.id]);

  const kitUsage = useMemo(() => {
    const usage = new Map<string, { reportCount: number; lastUsed: string | null; itemCount: number }>();

    displayedKits.forEach(kit => {
      usage.set(kit.id, { reportCount: 0, lastUsed: null, itemCount: kit.pecas.length });
    });

    reports.forEach(report => {
      const kitIdsUsed = new Set(
        report.pecas
          .filter(part => part.origem === 'kit')
          .map(part => part.kitId || displayedKits.find(kit => kit.nome === part.kitNome)?.id || part.kitNome || ''),
      );

      kitIdsUsed.forEach(kitId => {
        if (!kitId || !usage.has(kitId)) return;
        const current = usage.get(kitId)!;
        current.reportCount += 1;
        if (!current.lastUsed || report.dataAbertura > current.lastUsed) {
          current.lastUsed = report.dataAbertura;
        }
        usage.set(kitId, current);
      });
    });

    return usage;
  }, [displayedKits, reports]);

  function resetForm() {
    setFormKit({
      ...createEmptyForm(),
      tecnicoId: currentUser.id,
      tecnicoNome: currentUser.nome,
    });
  }

  function openCreateDialog() {
    if (!canManageKits) return;
    setEditingKitId(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(kit: PartKit) {
    if (!canManageKits) return;
    setEditingKitId(kit.id);
    setFormKit({
      nome: kit.nome,
      descricao: kit.descricao,
      tecnicoId: kit.tecnicoId,
      tecnicoNome: kit.tecnicoNome,
      pecas: kit.pecas.map((part, index) => ({
        id: `${kit.id}-${index}`,
        descricao: part.descricao,
        quantidade: part.quantidade,
        observacao: part.observacao || "",
      })),
    });
    setIsDialogOpen(true);
  }

  function handleOwnerChange(tecnicoId: string) {
    const owner = technicianUsers.find(user => user.id === tecnicoId);
    if (!owner) return;

    setFormKit(prev => ({
      ...prev,
      tecnicoId: owner.id,
      tecnicoNome: owner.nome,
    }));
  }

  function handleFormChange(field: keyof Omit<KitFormState, "pecas">, value: string) {
    setFormKit(prev => ({ ...prev, [field]: value }));
  }

  function addPartRow() {
    setFormKit(prev => ({ ...prev, pecas: [...prev.pecas, createEmptyPart()] }));
  }

  function updatePartRow(partId: string, field: keyof KitPartForm, value: string | number) {
    setFormKit(prev => ({
      ...prev,
      pecas: prev.pecas.map(part => (part.id === partId ? { ...part, [field]: value } : part)),
    }));
  }

  function removePartRow(partId: string) {
    setFormKit(prev => ({
      ...prev,
      pecas: prev.pecas.filter(part => part.id !== partId),
    }));
  }

  async function handleSaveKit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageKits) {
      toast({ title: "Sem permissão", description: "Seu nível de acesso não pode gerenciar kits.", variant: "destructive" });
      return;
    }

    if (!formKit.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para o kit.",
        variant: "destructive",
      });
      return;
    }

    if (!formKit.tecnicoId || !formKit.tecnicoNome) {
      toast({
        title: "Técnico obrigatório",
        description: "Selecione o técnico dono do kit.",
        variant: "destructive",
      });
      return;
    }

    const validParts = formKit.pecas.filter(part => part.descricao.trim());
    if (validParts.length === 0) {
      toast({
        title: "Adicione itens",
        description: "O kit precisa ter pelo menos uma peça.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        nome: formKit.nome.trim(),
        descricao: formKit.descricao.trim(),
        tecnicoId: formKit.tecnicoId,
        tecnicoNome: formKit.tecnicoNome,
        pecas: validParts.map(part => ({
          descricao: part.descricao.trim(),
          quantidade: Number(part.quantidade || 1),
          observacao: part.observacao.trim(),
        })),
      };

      if (isEditing && editingKitId) {
        const updated = await updatePartKit(editingKitId, payload);
        if (!updated) {
          toast({
            title: "Kit não encontrado",
            description: "Não foi possível atualizar o kit selecionado.",
            variant: "destructive",
          });
          return;
        }

        setKits(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        toast({
          title: "Kit atualizado",
          description: `${updated.nome} foi atualizado com sucesso.`,
        });
      } else {
        const created = await savePartKit(payload);
        setKits(prev => [created, ...prev]);
        toast({
          title: "Kit criado",
          description: `${created.nome} foi adicionado com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setEditingKitId(null);
      resetForm();
    } catch {
      toast({
        title: isEditing ? "Erro ao editar kit" : "Erro ao criar kit",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteKit(kit: PartKit) {
    if (!canManageKits) {
      toast({ title: "Sem permissão", description: "Seu nível de acesso não pode excluir kits.", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(`Excluir o kit ${kit.nome}?`);
    if (!confirmed) return;

    try {
      const deleted = await deletePartKit(kit.id);
      if (!deleted) {
        toast({
          title: "Kit não encontrado",
          description: "Não foi possível excluir o kit selecionado.",
          variant: "destructive",
        });
        return;
      }

      setKits(prev => prev.filter(item => item.id !== kit.id));
      toast({
        title: "Kit excluído",
        description: `${kit.nome} foi removido com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro ao excluir kit",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package2 className="h-6 w-6 text-primary" />Kits de Peças
          </h1>
          {canManageKits && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />Novo kit
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar kit ou peça..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>

        {canManageAllKits && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {displayedKits.slice(0, 3).map(kit => {
              const stats = kitUsage.get(kit.id);
              return (
                <Card key={`usage-${kit.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Controle do admin</p>
                    <h3 className="font-semibold text-sm truncate">{kit.nome}</h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Relatórios</span><span className="font-medium">{stats?.reportCount || 0}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="font-medium">{stats?.itemCount || 0}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Último uso</span><span className="font-medium">{stats?.lastUsed || '—'}</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedKits.map(kit => (
            <Card key={kit.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{kit.nome}</h3>
                    <p className="text-sm text-muted-foreground">{kit.descricao || 'Sem descrição.'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Técnico: {kit.tecnicoNome}</p>
                  </div>
                  <Badge variant="secondary">{kit.pecas.length} itens</Badge>
                </div>

                <div className="space-y-1 text-sm">
                  {kit.pecas.slice(0, 4).map((part, index) => (
                    <div key={`${kit.id}-${index}`} className="flex justify-between gap-2 rounded bg-muted/50 px-3 py-2">
                      <span className="truncate">{part.descricao}</span>
                      <span className="font-medium">x{part.quantidade}</span>
                    </div>
                  ))}
                  {kit.pecas.length > 4 && (
                    <p className="text-xs text-muted-foreground">+ {kit.pecas.length - 4} item(ns) adicionais</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canManageKits && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(kit)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteKit(kit)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {displayedKits.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum kit encontrado.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar kit" : "Novo kit"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveKit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kit-nome">Nome do kit</Label>
              <Input
                id="kit-nome"
                value={formKit.nome}
                onChange={event => handleFormChange("nome", event.target.value)}
                placeholder="Ex.: Kit Preventivo Básico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kit-descricao">Descrição</Label>
              <Textarea
                id="kit-descricao"
                value={formKit.descricao}
                onChange={event => handleFormChange("descricao", event.target.value)}
                placeholder="Quando usar este kit e em quais situações ele se aplica."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Técnico responsável</Label>
              <Select
                value={formKit.tecnicoId}
                onValueChange={handleOwnerChange}
                disabled={!canManageAllKits || !canManageKits}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {technicianUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canManageAllKits && (
                <p className="text-xs text-muted-foreground">Apenas administradores podem alterar o técnico dono do kit.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Peças do kit</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPartRow}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar peça
                </Button>
              </div>

              <div className="space-y-3">
                {formKit.pecas.map((part, index) => (
                  <div key={part.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePartRow(part.id)}
                        disabled={formKit.pecas.length === 1 || !canManageKits}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-3 space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={part.descricao}
                          onChange={event => updatePartRow(part.id, "descricao", event.target.value)}
                          placeholder="Descrição da peça"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={part.quantidade}
                          onChange={event => updatePartRow(part.id, "quantidade", Number(event.target.value))}
                        />
                      </div>
                      <div className="md:col-span-5 space-y-2">
                        <Label>Observação</Label>
                        <Input
                          value={part.observacao}
                          onChange={event => updatePartRow(part.id, "observacao", event.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || !canManageKits}>
                {isSaving ? "Salvando..." : "Salvar kit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

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
import { Lock, LockOpen, Pencil, Plus, Search, Building2 } from "lucide-react";
import { getClients, saveClient, setClientBlocked, updateClient } from "@/lib/api-service";
import { Client } from "@/lib/types";
import { formatCnpj, formatPhoneBr } from "@/lib/utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formClient, setFormClient] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    cidade: "",
    estado: "",
    telefone: "",
    contato: "",
    email: "",
    endereco: "",
    ativo: true,
  });

  useEffect(() => { getClients().then(setClients); }, []);

  const isEditing = Boolean(editingClientId);

  function resetForm() {
    setFormClient({
      nomeFantasia: "",
      razaoSocial: "",
      cnpj: "",
      cidade: "",
      estado: "",
      telefone: "",
      contato: "",
      email: "",
      endereco: "",
      ativo: true,
    });
  }

  function openCreateDialog() {
    setEditingClientId(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClientId(client.id);
    setFormClient({
      nomeFantasia: client.nomeFantasia,
      razaoSocial: client.razaoSocial,
      cnpj: client.cnpj,
      cidade: client.cidade,
      estado: client.estado,
      telefone: client.telefone,
      contato: client.contato,
      email: client.email,
      endereco: client.endereco,
      ativo: client.ativo,
    });
    setIsDialogOpen(true);
  }

  function handleFieldChange(field: keyof typeof formClient, value: string | boolean) {
    setFormClient(prev => ({ ...prev, [field]: value }));
  }

  async function handleSaveClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formClient.nomeFantasia.trim() || !formClient.cnpj.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha pelo menos Nome Fantasia e CNPJ.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing && editingClientId) {
        const updated = await updateClient(editingClientId, {
          nomeFantasia: formClient.nomeFantasia,
          razaoSocial: formClient.razaoSocial,
          cnpj: formClient.cnpj,
          cidade: formClient.cidade,
          estado: formClient.estado,
          telefone: formClient.telefone,
          contato: formClient.contato,
          email: formClient.email,
          endereco: formClient.endereco,
          ativo: formClient.ativo,
        });

        if (!updated) {
          toast({
            title: "Cliente não encontrado",
            description: "Não foi possível editar o cliente selecionado.",
            variant: "destructive",
          });
          return;
        }

        setClients(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        toast({
          title: "Cliente atualizado",
          description: `${updated.nomeFantasia} foi atualizado com sucesso.`,
        });
      } else {
        const created = await saveClient(formClient);
        setClients(prev => [created, ...prev]);
        toast({
          title: "Cliente criado",
          description: `${created.nomeFantasia} foi adicionado com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setEditingClientId(null);
      resetForm();
    } catch {
      toast({
        title: isEditing ? "Erro ao editar cliente" : "Erro ao criar cliente",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBlocked(client: Client) {
    try {
      const updated = await setClientBlocked(client.id, client.ativo);
      if (!updated) {
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível atualizar o status do cliente.",
          variant: "destructive",
        });
        return;
      }

      setClients(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast({
        title: updated.ativo ? "Cliente desbloqueado" : "Cliente bloqueado",
        description: `${updated.nomeFantasia} está ${updated.ativo ? "ativo" : "inativo"}.`,
      });
    } catch {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  }

  const displayedClients = useMemo(() => {
    const filtered = clients.filter(c =>
      c.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search)
    );

    return [...filtered].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.nomeFantasia.localeCompare(b.nomeFantasia, "pt-BR");
    });
  }, [clients, search]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />Clientes</h1>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="space-y-3">
          {displayedClients.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.nomeFantasia}</h3>
                  <Badge variant={c.ativo ? "default" : "destructive"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.razaoSocial}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                  <span>CNPJ: {c.cnpj}</span>
                  <span>{c.cidade}/{c.estado}</span>
                  <span>{c.telefone}</span>
                  <span>{c.contato}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(c)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button size="sm" variant={c.ativo ? "destructive" : "outline"} onClick={() => handleToggleBlocked(c)}>
                    {c.ativo ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
                    {c.ativo ? "Bloquear" : "Desbloquear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize os dados do cliente selecionado." : "Preencha os dados para cadastrar um novo cliente."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSaveClient}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
                  <Input id="nomeFantasia" value={formClient.nomeFantasia} onChange={e => handleFieldChange("nomeFantasia", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" value={formClient.cnpj} onChange={e => handleFieldChange("cnpj", formatCnpj(e.target.value))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="razaoSocial">Razão Social</Label>
                  <Input id="razaoSocial" value={formClient.razaoSocial} onChange={e => handleFieldChange("razaoSocial", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={formClient.endereco} onChange={e => handleFieldChange("endereco", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formClient.cidade} onChange={e => handleFieldChange("cidade", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="estado">UF</Label>
                  <Input id="estado" maxLength={2} value={formClient.estado} onChange={e => handleFieldChange("estado", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formClient.telefone} onChange={e => handleFieldChange("telefone", formatPhoneBr(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contato">Contato</Label>
                  <Input id="contato" value={formClient.contato} onChange={e => handleFieldChange("contato", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formClient.email} onChange={e => handleFieldChange("email", e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingClientId(null);
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

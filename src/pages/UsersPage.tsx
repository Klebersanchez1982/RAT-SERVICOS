import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Lock, LockOpen, Pencil, Plus, Users } from "lucide-react";
import { getUsers, saveUser, setUserBlocked, updateUser } from "@/lib/api-service";
import { User } from "@/lib/types";

const roleLabels: Record<User["perfil"], string> = {
  admin: 'Administrador',
  tecnico_interno: 'Técnico Interno',
  tecnico_externo: 'Técnico Externo',
  consulta: 'Consulta',
};

const roleOrder: Record<User["perfil"], number> = {
  admin: 0,
  tecnico_interno: 1,
  tecnico_externo: 2,
  consulta: 3,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formUser, setFormUser] = useState({
    nome: "",
    email: "",
    perfil: "consulta" as User["perfil"],
    ativo: true,
    senha: "",
    confirmarSenha: "",
  });

  useEffect(() => { getUsers().then(setUsers); }, []);

  const isEditing = Boolean(editingUserId);

  function resetForm() {
    setFormUser({
      nome: "",
      email: "",
      perfil: "consulta",
      ativo: true,
      senha: "",
      confirmarSenha: "",
    });
  }

  function openCreateDialog() {
    setEditingUserId(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUserId(user.id);
    setFormUser({
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      ativo: user.ativo,
      senha: "",
      confirmarSenha: "",
    });
    setIsDialogOpen(true);
  }

  function handleFieldChange(field: keyof typeof formUser, value: string | boolean) {
    setFormUser(prev => ({ ...prev, [field]: value }));
  }

  async function handleSaveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formUser.nome.trim() || !formUser.email.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha pelo menos Nome e E-mail.",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing) {
      if (!formUser.senha || formUser.senha.length < 6) {
        toast({
          title: "Senha inválida",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (formUser.senha !== formUser.confirmarSenha) {
        toast({
          title: "Confirmação de senha",
          description: "Senha e confirmação não conferem.",
          variant: "destructive",
        });
        return;
      }
    } else if (formUser.senha || formUser.confirmarSenha) {
      if (formUser.senha.length < 6) {
        toast({
          title: "Senha inválida",
          description: "A nova senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (formUser.senha !== formUser.confirmarSenha) {
        toast({
          title: "Confirmação de senha",
          description: "Nova senha e confirmação não conferem.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSaving(true);
      const normalizedEmail = formUser.email.trim().toLowerCase();

      if (isEditing && editingUserId) {
        const updated = await updateUser(
          editingUserId,
          {
            nome: formUser.nome,
            email: normalizedEmail,
            perfil: formUser.perfil,
            ativo: formUser.ativo,
          },
          formUser.senha || undefined,
        );

        if (!updated) {
          toast({
            title: "Usuário não encontrado",
            description: "Não foi possível editar o usuário selecionado.",
            variant: "destructive",
          });
          return;
        }

        setUsers(prev => prev.map(user => (user.id === updated.id ? updated : user)));
        toast({
          title: "Usuário atualizado",
          description: `${updated.nome} foi atualizado com sucesso.`,
        });
      } else {
        const created = await saveUser({
          nome: formUser.nome,
          email: normalizedEmail,
          perfil: formUser.perfil,
          ativo: formUser.ativo,
          password: formUser.senha,
        });
        setUsers(prev => [created, ...prev]);
        toast({
          title: "Usuário criado",
          description: `${created.nome} foi adicionado com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setEditingUserId(null);
      resetForm();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Tente novamente em instantes.";
      toast({
        title: isEditing ? "Erro ao editar usuário" : "Erro ao criar usuário",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBlocked(user: User) {
    try {
      const updated = await setUserBlocked(user.id, user.ativo);

      if (!updated) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi possível atualizar o status do usuário.",
          variant: "destructive",
        });
        return;
      }

      setUsers(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast({
        title: updated.ativo ? "Usuário desbloqueado" : "Usuário bloqueado",
        description: `${updated.nome} está ${updated.ativo ? "ativo" : "inativo"}.`,
      });
    } catch {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  }

  const displayedUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = users.filter((user) => {
      if (!normalizedSearch) return true;

      const roleLabel = roleLabels[user.perfil].toLowerCase();
      const statusLabel = user.ativo ? "ativo" : "inativo";

      return (
        user.nome.toLowerCase().includes(normalizedSearch)
        || user.email.toLowerCase().includes(normalizedSearch)
        || roleLabel.includes(normalizedSearch)
        || statusLabel.includes(normalizedSearch)
      );
    });

    return [...filtered].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;

      const roleDiff = roleOrder[a.perfil] - roleOrder[b.perfil];
      if (roleDiff !== 0) return roleDiff;

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [users, search]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Usuários</h1>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>

        <Input
          placeholder="Buscar por nome, e-mail, perfil ou status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="space-y-3">
          {displayedUsers.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{u.nome}</h3>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant="secondary">{roleLabels[u.perfil]}</Badge>
                  <Badge variant={u.ativo ? "default" : "destructive"}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(u)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={u.ativo ? "destructive" : "outline"}
                    onClick={() => handleToggleBlocked(u)}
                  >
                    {u.ativo ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
                    {u.ativo ? "Bloquear" : "Desbloquear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Atualize os dados do usuário e, se quiser, defina uma nova senha."
                  : "Preencha os dados para cadastrar um novo usuário com senha."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSaveUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" value={formUser.nome} onChange={e => handleFieldChange("nome", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" value={formUser.email} onChange={e => handleFieldChange("email", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="perfil">Perfil</Label>
                  <Select value={formUser.perfil} onValueChange={value => handleFieldChange("perfil", value as User["perfil"])}>
                    <SelectTrigger id="perfil"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="tecnico_interno">Técnico Interno</SelectItem>
                      <SelectItem value="tecnico_externo">Técnico Externo</SelectItem>
                      <SelectItem value="consulta">Consulta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ativo">Status</Label>
                  <div className="h-10 px-3 border rounded-md flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{formUser.ativo ? "Ativo" : "Inativo"}</span>
                    <Switch id="ativo" checked={formUser.ativo} onCheckedChange={checked => handleFieldChange("ativo", checked)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="senha">{isEditing ? "Nova senha" : "Senha *"}</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formUser.senha}
                    onChange={e => handleFieldChange("senha", e.target.value)}
                    placeholder={isEditing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmarSenha">{isEditing ? "Confirmar nova senha" : "Confirmar senha *"}</Label>
                  <Input
                    id="confirmarSenha"
                    type="password"
                    value={formUser.confirmarSenha}
                    onChange={e => handleFieldChange("confirmarSenha", e.target.value)}
                    placeholder={isEditing ? "Repita a nova senha" : "Repita a senha"}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingUserId(null);
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

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";
import { getAccessControlConfig, getCurrentUser, hasPermission, saveAccessControlConfig, getRuntimeSettings, saveRuntimeSettings } from "@/lib/api-service";
import { toast } from "@/components/ui/use-toast";
import { AccessControlConfig, PermissionKey } from "@/lib/types";

const permissionLabels: Array<{ key: PermissionKey; label: string }> = [
  { key: "dashboard.view", label: "Ver dashboard" },
  { key: "reports.view", label: "Ver relatórios" },
  { key: "reports.create", label: "Criar relatórios" },
  { key: "reports.edit", label: "Editar relatórios" },
  { key: "qrcode.view", label: "Ler QR Code" },
  { key: "search.view", label: "Buscar" },
  { key: "clients.view", label: "Ver clientes" },
  { key: "clients.manage", label: "Gerenciar clientes" },
  { key: "equipments.view", label: "Ver equipamentos" },
  { key: "equipments.manage", label: "Gerenciar equipamentos" },
  { key: "vehicles.view", label: "Ver veículos" },
  { key: "vehicles.manage", label: "Gerenciar veículos" },
  { key: "kits.view", label: "Ver kits" },
  { key: "kits.manage", label: "Gerenciar kits" },
  { key: "users.view", label: "Ver usuários" },
  { key: "users.manage", label: "Gerenciar usuários" },
  { key: "settings.view", label: "Ver configurações" },
  { key: "settings.manage", label: "Gerenciar configurações" },
];

export default function SettingsPage() {
  const currentUser = getCurrentUser();
  const canManageSettings = currentUser.perfil === "admin";
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [accessControl, setAccessControl] = useState<AccessControlConfig>(() => getAccessControlConfig());

  useEffect(() => {
    const settings = getRuntimeSettings();
    setAppsScriptUrl(settings.appsScriptUrl);
    setDriveFolderId(settings.driveFolderId);
    setCompanyName(settings.companyName);
    setCompanyCnpj(settings.companyCnpj);
    setCompanyPhone(settings.companyPhone);
    setAccessControl(getAccessControlConfig());
  }, []);

  function handlePermissionChange(level: "gerente" | "tecnico", permission: PermissionKey, checked: boolean) {
    if (!canManageSettings) return;
    setAccessControl(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [permission]: checked,
      },
    }));
  }

  function handleSaveAppsScript(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = appsScriptUrl.trim();
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode alterar configurações.",
        variant: "destructive",
      });
      return;
    }

    if (!normalizedUrl) {
      toast({
        title: "Informe a URL",
        description: "A URL do Web App do Apps Script não pode ficar vazia.",
        variant: "destructive",
      });
      return;
    }

    saveRuntimeSettings({
      appsScriptUrl: normalizedUrl,
      driveFolderId: driveFolderId.trim(),
    });

    toast({
      title: "Configurações salvas",
      description: "A URL do Apps Script e a pasta do Drive foram gravadas no navegador.",
    });
  }

  function handleSaveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode alterar configurações.",
        variant: "destructive",
      });
      return;
    }

    const normalizedCnpj = companyCnpj.trim();
    if (!companyName.trim() || !normalizedCnpj) {
      toast({
        title: "Preencha os dados da empresa",
        description: "Informe nome da empresa e CNPJ para salvar.",
        variant: "destructive",
      });
      return;
    }

    saveRuntimeSettings({
      companyName: companyName.trim(),
      companyCnpj: normalizedCnpj,
      companyPhone: companyPhone.trim(),
    });

    toast({
      title: "Empresa salva",
      description: "Os dados da empresa foram gravados no navegador.",
    });
  }

  function handleSaveAccessControl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode alterar permissões.",
        variant: "destructive",
      });
      return;
    }

    saveAccessControlConfig(accessControl);
    toast({
      title: "Permissões salvas",
      description: "Os níveis de acesso foram atualizados com sucesso.",
    });
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Configurações</h1>
        <p className="text-sm text-muted-foreground">Usuário logado: {currentUser.nome}</p>
        
        <Card>
          <form onSubmit={handleSaveAppsScript}>
          <CardHeader><CardTitle className="text-base">Google Apps Script</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apps-script-url">URL do Web App (Apps Script)</Label>
              <Input
                id="apps-script-url"
                value={appsScriptUrl}
                onChange={(event) => setAppsScriptUrl(event.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                disabled={!canManageSettings}
              />
              <p className="text-xs text-muted-foreground mt-1">Cole a URL do seu Google Apps Script publicado como Web App.</p>
            </div>
            <div>
              <Label htmlFor="drive-folder-id">ID da Pasta do Google Drive (Fotos)</Label>
              <Input
                id="drive-folder-id"
                value={driveFolderId}
                onChange={(event) => setDriveFolderId(event.target.value)}
                placeholder="ID da pasta no Google Drive"
                disabled={!canManageSettings}
              />
            </div>
            <Button type="submit" disabled={!canManageSettings}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleSaveCompany}>
          <CardHeader><CardTitle className="text-base">Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Sua Empresa Ltda"
                disabled={!canManageSettings}
              />
            </div>
            <div>
              <Label htmlFor="company-cnpj">CNPJ</Label>
              <Input
                id="company-cnpj"
                value={companyCnpj}
                onChange={(event) => setCompanyCnpj(event.target.value)}
                placeholder="00.000.000/0001-00"
                disabled={!canManageSettings}
              />
            </div>
            <div>
              <Label htmlFor="company-phone">Telefone</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={(event) => setCompanyPhone(event.target.value)}
                placeholder="(00) 0000-0000"
                disabled={!canManageSettings}
              />
            </div>
            <Button type="submit" disabled={!canManageSettings}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleSaveAccessControl}>
            <CardHeader><CardTitle className="text-base">Níveis de Acesso e Permissões</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O nível Administrador sempre tem acesso total. Configure abaixo os dois níveis inferiores.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-md border p-3">
                  <h3 className="font-medium">Gerente</h3>
                  {permissionLabels.map((permission) => (
                    <div key={`gerente-${permission.key}`} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{permission.label}</span>
                      <Switch
                        checked={accessControl.gerente[permission.key]}
                        onCheckedChange={(checked) => handlePermissionChange("gerente", permission.key, checked)}
                        disabled={!canManageSettings}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-md border p-3">
                  <h3 className="font-medium">Técnico</h3>
                  {permissionLabels.map((permission) => (
                    <div key={`tecnico-${permission.key}`} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{permission.label}</span>
                      <Switch
                        checked={accessControl.tecnico[permission.key]}
                        onCheckedChange={(checked) => handlePermissionChange("tecnico", permission.key, checked)}
                        disabled={!canManageSettings}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={!canManageSettings}><Save className="h-4 w-4 mr-2" />Salvar permissões</Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

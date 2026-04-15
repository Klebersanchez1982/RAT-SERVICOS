import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";
import { getRuntimeSettings, saveRuntimeSettings } from "@/lib/api-service";
import { toast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  useEffect(() => {
    const settings = getRuntimeSettings();
    setAppsScriptUrl(settings.appsScriptUrl);
    setDriveFolderId(settings.driveFolderId);
    setCompanyName(settings.companyName);
    setCompanyCnpj(settings.companyCnpj);
    setCompanyPhone(settings.companyPhone);
  }, []);

  function handleSaveAppsScript(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = appsScriptUrl.trim();
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

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Configurações</h1>
        
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
              />
            </div>
            <Button type="submit"><Save className="h-4 w-4 mr-2" />Salvar</Button>
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
              />
            </div>
            <div>
              <Label htmlFor="company-cnpj">CNPJ</Label>
              <Input
                id="company-cnpj"
                value={companyCnpj}
                onChange={(event) => setCompanyCnpj(event.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <Label htmlFor="company-phone">Telefone</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={(event) => setCompanyPhone(event.target.value)}
                placeholder="(00) 0000-0000"
              />
            </div>
            <Button type="submit"><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </CardContent>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

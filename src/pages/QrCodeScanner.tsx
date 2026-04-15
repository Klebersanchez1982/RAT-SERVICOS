import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { QrCode, Camera, Search, FileText, History } from "lucide-react";
import { getEquipmentByQrCode, getEquipmentHistory } from "@/lib/api-service";
import { Equipment, Report } from "@/lib/types";
import { toast } from "sonner";

function getCameraErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (!window.isSecureContext) {
    return "A câmera exige contexto seguro. Use localhost ou HTTPS para acessar esta página.";
  }

  if (/NotAllowedError|Permission|denied|rejected/i.test(errorMessage)) {
    return "Permissão de câmera negada. Libere o acesso à câmera no navegador e tente novamente.";
  }

  if (/NotFoundError|No cameras|camera not found/i.test(errorMessage)) {
    return "Nenhuma câmera foi encontrada no dispositivo.";
  }

  if (/NotReadableError|in use|track start error/i.test(errorMessage)) {
    return "A câmera já está em uso por outro aplicativo.";
  }

  return "Não foi possível acessar a câmera.";
}

export default function QrCodeScanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<Report[]>([]);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const handleSearch = async (code: string) => {
    if (!code.trim()) return;
    const eq = await getEquipmentByQrCode(code.trim());
    if (eq) {
      setEquipment(eq);
      const hist = await getEquipmentHistory(eq.id);
      setHistory(hist);
      toast.success(`Equipamento encontrado: ${eq.descricao}`);
    } else {
      toast.error("Equipamento não encontrado.");
      setEquipment(null);
      setHistory([]);
    }
  };

  const startScanner = () => {
    if (!scanning) setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    const initializeScanner = async () => {
      try {
        const containerId = scannerRef.current?.id ?? "qr-reader";
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        if (!window.isSecureContext) {
          throw new Error("InsecureContextError");
        }

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error("No cameras found");
        }

        const preferredCamera = cameras.find((camera: { id: string; label: string }) =>
          /back|rear|environment|traseira/i.test(camera.label)
        );

        const scanner = new Html5Qrcode(containerId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          preferredCamera?.id ?? cameras[0].id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop().then(() => {
              if (cancelled) return;
              setScanning(false);
              handleSearch(decodedText);
            });
          },
          () => {}
        );
      } catch (err) {
        if (!cancelled) {
          toast.error(getCameraErrorMessage(err));
          setScanning(false);
        }
      }
    };

    initializeScanner();

    return () => {
      cancelled = true;
    };
  }, [scanning]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleNewReport = () => {
    if (equipment) {
      navigate(`/relatorios/novo?equipamento=${equipment.id}`);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" />Ler QR Code
        </h1>

        <Card>
          <CardContent className="p-4 space-y-4">
            {!scanning ? (
              <Button onClick={startScanner} className="w-full h-32 flex flex-col gap-2">
                <Camera className="h-8 w-8" />
                <span>Abrir Câmera</span>
              </Button>
            ) : (
              <div className="space-y-3">
                <div id="qr-reader" ref={scannerRef} className="rounded-lg overflow-hidden" />
                <Button variant="outline" onClick={stopScanner} className="w-full">Fechar Câmera</Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input placeholder="Ou digite o código/série..." value={manualCode} onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(manualCode)} />
              <Button onClick={() => handleSearch(manualCode)}><Search className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {equipment && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Equipamento
                  <Button size="sm" onClick={handleNewReport}><FileText className="h-4 w-4 mr-1" />Novo RAT</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Descrição</span><p className="font-medium">{equipment.descricao}</p></div>
                  <div><span className="text-muted-foreground">Cliente</span><p className="font-medium">{equipment.clienteNome}</p></div>
                  <div><span className="text-muted-foreground">Marca/Modelo</span><p className="font-medium">{equipment.marca} {equipment.modelo}</p></div>
                  <div><span className="text-muted-foreground">N° Série</span><p className="font-mono font-medium">{equipment.numeroSerie}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Localização</span><p className="font-medium">{equipment.localizacao}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />Histórico de Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum atendimento registrado.</p>
                ) : (
                  <div className="divide-y">
                    {history.map(r => (
                      <button key={r.id} onClick={() => navigate(`/relatorios/${r.id}`)}
                        className="w-full flex items-start justify-between p-4 hover:bg-muted/50 transition-colors text-left text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-primary">{r.numero}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <p>{r.problemaRelatado?.substring(0, 80)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.dataAbertura} • {r.tecnicoNome}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

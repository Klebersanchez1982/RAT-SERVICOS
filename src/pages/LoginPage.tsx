import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wrench } from "lucide-react";
import { isAuthenticated, loginUser } from "@/lib/api-service";
import { toast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({
        title: "Preencha os campos",
        description: "Informe e-mail e senha para entrar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await loginUser(email, password, rememberSession);
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao sistema.",
      });
      navigate("/", { replace: true });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Não foi possível entrar.";
      toast({
        title: "Erro no login",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Wrench className="h-5 w-5" />
            <span className="text-sm font-semibold">RAT System</span>
          </div>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
            </div>

            <div className="h-10 px-3 border rounded-md flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lembrar sessão</span>
              <Switch checked={rememberSession} onCheckedChange={setRememberSession} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

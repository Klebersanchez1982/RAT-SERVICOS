import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentUser, logoutUser } from "@/lib/api-service";
import { User, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  function handleLogoff() {
    logoutUser();

    toast({
      title: "Logoff realizado",
      description: "Sua sessão foi encerrada.",
    });

    navigate("/login", { replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogoff}>
                <LogOut className="h-4 w-4 mr-1" />Logoff
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium leading-none">{user.nome}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.perfil.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

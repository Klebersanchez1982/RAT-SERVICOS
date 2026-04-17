import {
  FileText, Users, Settings, Building2, Wrench,
  Car, QrCode, LayoutDashboard, Search, Package2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { hasPermission } from "@/lib/api-service";
import { PermissionKey } from "@/lib/types";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/api-service";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard.view" as PermissionKey },
  { title: "Relatórios", url: "/relatorios", icon: FileText, permission: "reports.view" as PermissionKey },
  { title: "Novo Relatório", url: "/relatorios/novo", icon: FileText, permission: "reports.create" as PermissionKey },
  { title: "Ler QR Code", url: "/qrcode", icon: QrCode, permission: "qrcode.view" as PermissionKey },
  { title: "Buscar", url: "/buscar", icon: Search, permission: "search.view" as PermissionKey },
];

const cadastroItems = [
  { title: "Clientes", url: "/clientes", icon: Building2, permission: "clients.view" as PermissionKey },
  { title: "Equipamentos", url: "/equipamentos", icon: Wrench, permission: "equipments.view" as PermissionKey },
  { title: "Kits de Peças", url: "/kits", icon: Package2, permission: "kits.view" as PermissionKey },
  { title: "Veículos", url: "/veiculos", icon: Car, permission: "vehicles.view" as PermissionKey },
  { title: "Usuários", url: "/usuarios", icon: Users, permission: "users.view" as PermissionKey },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permission: "settings.view" as PermissionKey, adminOnly: true },
];

export function AppSidebar() {
  const currentUser = getCurrentUser();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const canShowItem = (item: { permission: PermissionKey; adminOnly?: boolean }) => {
    if (!hasPermission(item.permission)) return false;
    if (item.adminOnly && currentUser.perfil !== "admin") return false;
    return true;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-sidebar-primary" />
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground">RAT System</h1>
              <p className="text-xs text-sidebar-foreground/60">Assistência Técnica</p>
            </div>
          </div>
        )}
        {collapsed && <Wrench className="h-6 w-6 text-sidebar-primary mx-auto" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                canShowItem(item) && (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastroItems.map((item) => (
                canShowItem(item) && (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50 text-center">
            v1.0 • Google Sheets
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

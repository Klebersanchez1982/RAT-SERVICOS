import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ReportsList from "./pages/ReportsList";
import ReportForm from "./pages/ReportForm";
import ReportDetail from "./pages/ReportDetail";
import QrCodeScanner from "./pages/QrCodeScanner";
import SearchPage from "./pages/SearchPage";
import ClientsPage from "./pages/ClientsPage";
import EquipmentsPage from "./pages/EquipmentsPage";
import VehiclesPage from "./pages/VehiclesPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import KitsPage from "./pages/KitsPage";
import AccessDenied from "./pages/AccessDenied";
import ChecklistFillPage from "./pages/ChecklistFillPage";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import LoginPage from "./pages/LoginPage";
import { getCurrentUser, hasPermission, isAuthenticated } from "@/lib/api-service";
import { PermissionKey } from "@/lib/types";

const queryClient = new QueryClient();

function ProtectedRoute({ children, permission, adminOnly }: { children: JSX.Element; permission?: PermissionKey; adminOnly?: boolean }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && getCurrentUser().perfil !== "admin") {
    return <AccessDenied />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }

  return children;
}

function LoginRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<ProtectedRoute permission="dashboard.view"><Index /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute permission="reports.view"><ReportsList /></ProtectedRoute>} />
            <Route path="/relatorios/novo" element={<ProtectedRoute permission="reports.create"><ReportForm /></ProtectedRoute>} />
            <Route path="/relatorios/:id" element={<ProtectedRoute permission="reports.view"><ReportDetail /></ProtectedRoute>} />
            <Route path="/relatorios/:id/editar" element={<ProtectedRoute permission="reports.edit"><ReportForm /></ProtectedRoute>} />
            <Route path="/relatorios/:id/checklist/:template" element={<ProtectedRoute permission="reports.edit"><ChecklistFillPage /></ProtectedRoute>} />
            <Route path="/relatorios/checklist/:template" element={<ProtectedRoute permission="reports.create"><ChecklistFillPage /></ProtectedRoute>} />
            <Route path="/qrcode" element={<ProtectedRoute permission="qrcode.view"><QrCodeScanner /></ProtectedRoute>} />
            <Route path="/buscar" element={<ProtectedRoute permission="search.view"><SearchPage /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute permission="clients.view"><ClientsPage /></ProtectedRoute>} />
            <Route path="/equipamentos" element={<ProtectedRoute permission="equipments.view"><EquipmentsPage /></ProtectedRoute>} />
            <Route path="/kits" element={<ProtectedRoute permission="kits.view"><KitsPage /></ProtectedRoute>} />
            <Route path="/veiculos" element={<ProtectedRoute permission="vehicles.view"><VehiclesPage /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute permission="users.view"><UsersPage /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute permission="settings.view" adminOnly><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

export default App;

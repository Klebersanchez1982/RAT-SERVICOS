import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import LoginPage from "./pages/LoginPage";
import { isAuthenticated } from "@/lib/api-service";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><ReportsList /></ProtectedRoute>} />
            <Route path="/relatorios/novo" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
            <Route path="/relatorios/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/relatorios/:id/editar" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
            <Route path="/qrcode" element={<ProtectedRoute><QrCodeScanner /></ProtectedRoute>} />
            <Route path="/buscar" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/equipamentos" element={<ProtectedRoute><EquipmentsPage /></ProtectedRoute>} />
            <Route path="/veiculos" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

export default App;

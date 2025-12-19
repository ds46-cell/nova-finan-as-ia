import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SecurityCheck from "./pages/SecurityCheck";
import Dashboard from "./pages/Dashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminNotificacoes from "./pages/AdminNotificacoes";
import Financeiro from "./pages/Financeiro";
import Analises from "./pages/Analises";
import Integracoes from "./pages/Integracoes";
import Compliance from "./pages/Compliance";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Monitoramento from "./pages/Monitoramento";
import IAAgentes from "./pages/IAAgentes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/security-check" element={<SecurityCheck />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/notificacoes" element={<AdminNotificacoes />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/analises" element={<Analises />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/monitoramento" element={<Monitoramento />} />
            <Route path="/ia-agentes" element={<IAAgentes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

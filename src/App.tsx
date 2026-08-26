import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ComoFunciona from "./pages/ComoFunciona.tsx";
import QueroCarro from "./pages/QueroCarro.tsx";
import Lojista from "./pages/Lojista.tsx";
import Login from "./pages/Login.tsx";
import Painel from "./pages/Painel.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Admin from "./pages/Admin.tsx";
import PerfilLojista from "./pages/PerfilLojista.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import MinhasPropostas from "./pages/MinhasPropostas.tsx";
import MinhasPropostasLojista from "./pages/MinhasPropostasLojista.tsx";
import PoliticaPrivacidade from "./pages/legal/PoliticaPrivacidade.tsx";
import TermosCondicoes from "./pages/legal/TermosCondicoes.tsx";
import PoliticaCookies from "./pages/legal/PoliticaCookies.tsx";
import Rgpd from "./pages/legal/Rgpd.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PaymentTestModeBanner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/como-funciona" element={<ComoFunciona />} />
          <Route path="/quero-carro" element={<QueroCarro />} />
          <Route path="/lojista" element={<Lojista />} />
          <Route path="/login" element={<Login />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/checkout/return" element={<CheckoutReturn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/perfil" element={<PerfilLojista />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/minhas-propostas/:token" element={<MinhasPropostas />} />
          <Route path="/painel/propostas" element={<MinhasPropostasLojista />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-condicoes" element={<TermosCondicoes />} />
          <Route path="/politica-cookies" element={<PoliticaCookies />} />
          <Route path="/rgpd" element={<Rgpd />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

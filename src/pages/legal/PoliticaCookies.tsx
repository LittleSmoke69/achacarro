import { LegalLayout } from "./LegalLayout";

const PoliticaCookies = () => (
  <LegalLayout title="Política de Cookies" subtitle="AchaCarro.pt">
    <h2>O que são Cookies?</h2>
    <p>
      Cookies são pequenos ficheiros armazenados no dispositivo do utilizador para melhorar a
      navegação e personalizar a experiência.
    </p>

    <h2>Tipos de Cookies Utilizados</h2>
    <h3>Cookies Essenciais</h3>
    <p>Necessários para o funcionamento do website.</p>
    <h3>Cookies Analíticos</h3>
    <p>Utilizados para estatísticas e melhoria da plataforma.</p>
    <h3>Cookies de Marketing</h3>
    <p>Usados para campanhas publicitárias e remarketing.</p>
    <h3>Cookies de Funcionalidade</h3>
    <p>Permitem guardar preferências do utilizador.</p>

    <h2>Gestão de Cookies</h2>
    <p>
      O utilizador pode aceitar, rejeitar ou configurar os cookies através do banner de
      consentimento apresentado ao entrar no website.
    </p>
    <p>Também pode alterar as definições do navegador para bloquear cookies.</p>

    <h2>Cookies de Terceiros</h2>
    <p>Podemos utilizar serviços como:</p>
    <ul>
      <li>Google Analytics</li>
      <li>Meta/Facebook Pixel</li>
      <li>TikTok Pixel</li>
      <li>YouTube embeds</li>
    </ul>
  </LegalLayout>
);

export default PoliticaCookies;

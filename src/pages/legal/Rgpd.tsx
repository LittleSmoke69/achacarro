import { LegalLayout } from "./LegalLayout";

const Rgpd = () => (
  <LegalLayout title="Gestão de Consentimento RGPD/LGPD" subtitle="AchaCarro.pt">
    <h2>Consentimento de Dados</h2>
    <p>Ao utilizar este website e submeter formulários, o utilizador declara que:</p>
    <ul>
      <li>Leu e concorda com a Política de Privacidade;</li>
      <li>Autoriza o tratamento dos seus dados;</li>
      <li>Autoriza o contacto por email, telefone ou WhatsApp;</li>
      <li>Autoriza a partilha dos dados com parceiros comerciais para envio de propostas.</li>
    </ul>

    <h2>Consentimento de Marketing</h2>
    <p>O utilizador poderá optar por receber:</p>
    <ul>
      <li>Promoções;</li>
      <li>Novidades;</li>
      <li>Ofertas de veículos;</li>
      <li>Campanhas comerciais.</li>
    </ul>
    <p>O consentimento pode ser retirado a qualquer momento.</p>

    <h2>Direitos RGPD/LGPD</h2>
    <p>O utilizador pode:</p>
    <ul>
      <li>Solicitar acesso aos dados;</li>
      <li>Solicitar eliminação;</li>
      <li>Solicitar alteração;</li>
      <li>Revogar consentimento.</li>
    </ul>
    <p>
      Contacto para assuntos de proteção de dados:{" "}
      <a href="mailto:geral@achacarro.pt">📧 geral@achacarro.pt</a>
    </p>
  </LegalLayout>
);

export default Rgpd;

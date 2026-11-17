import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Texto-base para um app pessoal em português. Não substitui revisão de um advogado: ajuste ao seu caso antes de abrir para o público.
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || "";
const UPDATED = "8 de novembro de 2026";

function Page({ title, children }) {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] px-5 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-night"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar</Link>
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      <p className="mb-5 text-sm text-soft">Atualizado em {UPDATED}</p>
      <div className="space-y-5 leading-relaxed [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
    </div>
  );
}

const Contact = () => (CONTACT ? <a className="font-semibold text-night underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> : <>a pessoa que te convidou para o app</>);

export function Terms() {
  return (
    <Page title="Termos de uso">
      <section><h2>O que é o NutriFoto</h2><p>É um diário alimentar. Você registra o que come, por foto ou texto, e o app usa inteligência artificial para <b>estimar</b> alimentos, quantidades, calorias e macronutrientes.</p></section>
      <section><h2>Não é orientação médica</h2><p>As estimativas podem errar, e as metas sugeridas são um ponto de partida. O app não diagnostica, não trata e não substitui médico ou nutricionista. Se você tem alguma condição de saúde, está grávida, tem histórico de transtorno alimentar ou tem dúvidas, converse com um profissional antes de mudar sua alimentação.</p></section>
      <section><h2>Sua conta</h2><ul><li>O app é para maiores de 18 anos.</li><li>Use um e-mail seu e uma senha que só você saiba. Você é responsável pelo que acontece na sua conta.</li><li>O cadastro pode exigir um código de convite, que é pessoal e pode ser cancelado.</li></ul></section>
      <section><h2>Uso aceitável</h2><p>Não tente invadir o app, sobrecarregá-lo, usar contas de outras pessoas nem enviar conteúdo ilegal. A análise por IA tem limite diário por pessoa para o serviço continuar gratuito para todos.</p></section>
      <section><h2>Sem garantia de funcionamento</h2><p>O NutriFoto é um projeto pessoal e gratuito. Ele pode ficar fora do ar, mudar ou ser encerrado. Por isso, use <b>Ajustes → Seus dados</b> para exportar uma cópia do que for importante para você. Se o app for encerrado, avisaremos com antecedência razoável.</p></section>
      <section><h2>Encerrar a conta</h2><p>Você pode excluir sua conta a qualquer momento em Ajustes. Isso apaga seus dados e suas fotos. Podemos suspender contas que violem estes termos.</p></section>
      <section><h2>Mudanças e contato</h2><p>Estes termos podem mudar; mudanças relevantes serão avisadas no app. Dúvidas: <Contact />. Veja também a <Link to="/privacidade" className="font-semibold text-night underline">política de privacidade</Link>.</p></section>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Política de privacidade">
      <section><h2>Quais dados guardamos</h2><ul><li>Conta: e-mail, nome (opcional), foto de perfil (opcional) e a senha, que fica guardada de forma criptografada e que ninguém consegue ler.</li><li>Seu diário: refeições, alimentos, quantidades, calorias, macros, observações, fotos dos pratos, água, peso e suas metas.</li><li>Uso: quantas análises por IA você fez no dia.</li></ul><p>Dados sobre alimentação e peso podem revelar informações de saúde. Por isso eles só são usados para o app funcionar para você, e você os fornece de forma voluntária ao usar o app.</p></section>
      <section><h2>Para que usamos</h2><p>Só para fazer o app funcionar: mostrar seu diário, calcular totais e gráficos, estimar refeições, enviar e-mails de senha e confirmação. Não vendemos seus dados, não mostramos anúncios e não usamos rastreadores.</p></section>
      <section><h2>Com quem os dados passam</h2><ul><li><b>Supabase</b>: guarda o banco de dados e as fotos.</li><li><b>Cloudflare</b>: hospeda o app e processa as requisições.</li><li><b>Google (Gemini) ou Anthropic (Claude)</b>: recebem a foto ou o texto da refeição <b>somente quando você pede uma análise</b>, para devolver a estimativa. Eles têm suas próprias políticas.</li><li><b>Resend</b>: envia os e-mails de recuperação de senha e confirmação.</li></ul></section>
      <section><h2>Por quanto tempo</h2><p>Enquanto sua conta existir. Ao excluir a conta em Ajustes, apagamos seus dados e suas fotos. Cópias de segurança do provedor podem levar um tempo para desaparecer.</p></section>
      <section><h2>Seus direitos (LGPD)</h2><p>Você pode acessar seus dados e levar uma cópia em <b>Ajustes → Seus dados</b> (CSV ou JSON), corrigir informações no próprio app, excluir a conta e pedir esclarecimentos sobre o tratamento dos dados. Para qualquer pedido, fale com <Contact />.</p></section>
      <section><h2>Armazenamento no seu aparelho</h2><p>O app guarda no navegador apenas o necessário para manter você conectado. Não usamos cookies de publicidade.</p></section>
      <section><h2>Menores de idade</h2><p>O app é só para maiores de 18 anos.</p></section>
      <section><h2>Contato</h2><p>Dúvidas sobre privacidade: <Contact />. Veja também os <Link to="/termos" className="font-semibold text-night underline">termos de uso</Link>.</p></section>
    </Page>
  );
}

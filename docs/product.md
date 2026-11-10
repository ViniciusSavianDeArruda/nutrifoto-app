# Product

<!-- impeccable:product-schema 1 -->

> Nota de origem: este arquivo foi escrito a partir do briefing que o dono do projeto deu na conversa, sem rodada de entrevista, e foi atualizado quando o app passou a poder ser usado por mais pessoas (convites, recuperação de senha, termos). Fatos inferidos estão marcados com (inferido); confirme ou corrija quando quiser.

## Platform

web

## Stack
React + Vite + Tailwind (PWA, JavaScript) no front, hospedado no Cloudflare Pages. API em TypeScript com Hono + Drizzle no Cloudflare Workers (plano gratuito), com PostgreSQL e fotos no Supabase (banco via Hyperdrive). IA de visão via Gemini. E-mails de senha e confirmação via Resend. O back-end é só em TypeScript (a versão antiga em Python foi removida a pedido do dono). Decidido pelo dono do projeto.

## Users
Primeiro, o dono do app: um jovem adulto que quer organizar o que come e aumentar a massa corporal (comer mais), registrando refeições pelo celular, geralmente com uma mão só, na hora de comer ou logo depois, em ambientes variados (mesa, cozinha, restaurante, com luz ruim). Depois, amigos e familiares que ele convida: pessoas comuns, adultas (18+), com objetivos diferentes (ganhar, manter ou perder peso) e sem conhecimento de nutrição. (inferido: usuário com pressa, que desiste se o registro demorar mais que alguns toques.)

## Product Purpose
Registrar o que se come tirando uma foto: a IA identifica os alimentos, estima porção em gramas, calorias e macros, e a pessoa corrige o que errou. O histórico guarda tudo para mostrar padrões (calorias por dia, macros, horários). Sucesso: registrar uma refeição em poucos segundos e, com o tempo, confiar nos números porque eles foram revisados pela própria pessoa.

## Positioning
O app trata a estimativa da IA como rascunho editável, não como verdade: cada alimento é um cartão que pode ser corrigido, tem nível de confiança visível e recalcula proporcionalmente ao mudar a porção. Não é app de dieta nem de treino; é um diário com foto.

## Operating Context
- No Cloudflare Workers a API não dorme: não há espera de "acordar o servidor". O app ainda chama /health ao abrir e sabe esperar caso a API demore.
- Vários usuários dividem as mesmas cotas gratuitas (Gemini, 500 MB de banco e 1 GB de fotos no Supabase, e-mails do Resend). O limite diário de análises por pessoa e o cadastro por convite existem para proteger essas cotas.
- O Resend gratuito só entrega e-mail a terceiros depois de verificar um domínio próprio; sem isso, só chega ao e-mail do dono da conta Resend.
- A cota gratuita do Gemini é limitada por projeto e por modelo; o app precisa funcionar (salvar refeição sem análise, registrar por texto) quando a cota acabar.
- Fotos ficam no plano gratuito do Supabase (1 GB, 5 GB de tráfego/mês): reduzir para 1024 px e usar miniaturas nas listas.
- Banco gratuito do Supabase pausa após 1 semana sem atividade e não tem backup diário: exportação de dados é recurso do produto.
- Idioma da interface: português do Brasil. Unidades: gramas, kcal.

## Capabilities and Constraints
- Foto → análise por IA → cartões editáveis → salvar com data/hora e tipo de refeição (café da manhã, almoço, lanche, jantar, outro).
- Valores nutricionais são estimativas e a interface deve dizer isso com clareza, sem alarmismo.
- Histórico, tela "Hoje" com meta diária e macros, gráficos (7/30 dias, média semanal, distribuição de macros, horários), favoritos, registro e correção por texto, água, peso.
- Calculadora de meta (Mifflin-St Jeor) nos Ajustes: sugere calorias, macros e água para ganhar, manter ou perder peso; só para maiores de 18; é estimativa e o app diz isso.
- Contas para mais gente: cadastro em três modos (`open`, `invite`, `closed`); convites por código criados pelo dono (`npm run invite`); aceite dos termos de uso e da política de privacidade no cadastro; recuperação de senha e confirmação de e-mail por link (válidos por 1 hora e 48 horas, uso único); trocar a senha derruba as sessões antigas; nome e foto de perfil.
- Login obrigatório (a API fica acessível na internet); cada usuário só vê os próprios dados.
- Apenas tema claro (o modo escuro foi removido por decisão do dono).
- Fora do escopo por enquanto: código de barras (Open Food Facts), lembretes por notificação push, gráfico de peso com tendência, banco de alimentos TACO, relatório em PDF, ver vitaminas e minerais.

## Brand Commitments
Nome: NutriFoto. Tom: leve, motivador, sem culpa nem julgamento sobre comida. Nada de linguagem de "pecado", "trapaça", "queimar" ou punição por exceder meta. Sem gamificação agressiva.

## Evidence on Hand
Nenhum conteúdo real ainda: sem fotos de refeições, sem depoimentos, sem números de uso. Não inventar usuários, avaliações nem estatísticas. Dados de demonstração, quando usados, devem ser rotulados como exemplo.

## Product Principles
1. Registrar rápido vence registrar perfeito: o caminho foto → salvar tem de caber em poucos toques.
2. A IA propõe, a pessoa decide: toda estimativa é editável e mostra sua confiança.
3. Números sem julgamento: metas orientam, nunca punem.
4. Funcionar degradado: sem IA, sem cota, com servidor dormindo ou sem rede, o usuário ainda consegue registrar e não perde a refeição.
5. Os dados são da pessoa: exportar tudo e apagar a conta são recursos de primeira classe. Alimentação e peso são dados sensíveis (saúde): nunca vendidos, sem anúncios, sem rastreadores.
6. Ninguém é empurrado a comer menos ou mais do que o corpo pede: sugestões de meta são ponto de partida, vêm com aviso e não substituem profissional.

## Accessibility & Inclusion
Uso com uma mão no celular: alvos de toque de no mínimo 44 px, ações principais ao alcance do polegar. Contraste adequado em ambientes com luz forte. Não depender só de cor para indicar confiança ou excesso de meta. Respeitar prefers-reduced-motion. O app é só para maiores de 18 anos.

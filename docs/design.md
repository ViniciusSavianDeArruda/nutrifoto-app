---
name: NutriFoto
description: Diário alimentar com foto, claro e verde: números firmes, barras de macro simples, cor com função.
colors:
  leaf-night: "#16533C"
  leaf-night-deep: "#0E3A29"
  leaf-mist: "#F6F8F5"
  leaf-line: "#D0DCCD"
  surface: "#FFFFFF"
  ink: "#14261C"
  ink-soft: "#4A6052"
  yolk: "#FFC83D"
  yolk-ink: "#2A1F00"
  protein-plum: "#9C3D6A"
  carb-wheat: "#B7791F"
  fat-blue: "#246EA0"
  fiber-leaf: "#2F7D5B"
  notice-amber: "#8A5A00"
  notice-amber-bg: "#FFF3D6"
  error-brick: "#A32A1F"
  error-brick-bg: "#FDE9E6"
typography:
  display-numeral:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  data:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.leaf-night}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
  button-capture:
    backgroundColor: "{colors.yolk}"
    textColor: "{colors.yolk-ink}"
    rounded: "{rounded.pill}"
    size: "64px"
  button-quiet:
    backgroundColor: "{colors.leaf-mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 14px"
  tabbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    height: "64px"
---

## Overview

NutriFoto é uma ferramenta de uso diário, feita para uma mão e para pressa. O visual é claro, verde e limpo: um verde-floresta profundo na casca e nas ações, fundo quase branco com um toque de verde, e as cores dos próprios alimentos como cores de dados. A tipografia é um sans humanista de trabalho para texto e um semicondensado de numerais firmes para valores. A densidade é compacta, em linhas de 56 a 64 px, sem respiro de vitrine. A navegação, os controles e a organização das telas são os padrões que qualquer pessoa já conhece: barra de abas embaixo, listas, campos, botões.

Modo: Operate. A pessoa completa uma tarefa (registrar, conferir, corrigir). Escaneabilidade e consistência vencem expressão; a marca vive em detalhes precisos.

**Logo:** um prato visto de cima (círculo claro) com uma folha verde e uma gema amarela, dentro de quatro cantos de visor de câmera, sobre um quadrado arredondado `leaf-night`. Junta "foto" e "comida natural". Arquivos: `apps/web/public/icon.svg` e os PNGs 192/512 gerados dele.

**Resumo do dia (tela Hoje):** uma barra de progresso para cada macro (carboidrato, proteína, gordura) com o valor, a meta e a cor do macro, e abaixo uma faixa única "De onde vêm as calorias" com a porcentagem de cada macro, mais a fibra. Substituiu a antiga "bandeja" de três compartimentos por pedido do dono, por ser mais fácil de ler. Nas listas de refeições continua uma mini-bandeja de 40 px (`MiniTray`) mostrando a proporção de macros da refeição.

**Só tema claro.** Não há modo escuro nem seletor de tema; o app fica claro mesmo se o celular estiver em modo escuro.

Cena de uso: alguém sentado à mesa ou em pé na cozinha, celular numa mão, luz forte de janela ou luz amarela de restaurante, quer registrar e voltar a comer. Por isso o tema é claro, legível sob luz forte.

## Colors

Estratégia: **Committed**. O verde-floresta (`leaf-night`) carrega a casca do app: ícone de aba ativa, cabeçalhos fortes e ações primárias. O chão é um quase-branco com tinta verde (`leaf-mist`), nunca cinza puro. Cartões e superfícies são brancos.

- **Casca e ação:** `leaf-night` (#16533C) para botão primário, aba ativa e títulos de destaque; `leaf-night-deep` (#0E3A29) para estados pressionados.
- **Captura:** `yolk` (#FFC83D) é usada em um único lugar, o botão redondo de registrar refeição, com texto `yolk-ink`. Cor rara, função única.
- **Macros (cores de dados, sempre acompanhadas de rótulo):** proteína `protein-plum`, carboidrato `carb-wheat`, gordura `fat-blue`, fibra `fiber-leaf`. A gordura é azul para não se confundir com o verde da marca. Nunca aparecem como decoração.
- **Estados:** `notice-amber` sobre `notice-amber-bg` para avisos e confiança baixa; `error-brick` sobre `error-brick-bg` apenas para falhas reais (rede, servidor, cota). **Passar da meta não é erro**: usa-se um indicador neutro (ícone + texto "acima da meta"), nunca vermelho.
- **Texto:** `ink` (#14261C) e `ink-soft` (#4A6052): contraste de 14:1 e 6,3:1 sobre `leaf-mist`. Sobre `leaf-night`, texto branco (9:1).

Regra de acessibilidade: cor nunca é a única informação. Confiança vem com ícone e palavra (alta, média, baixa); macros vêm com rótulo; meta vem com número.

## Typography

- **Figtree** para interface e texto corrido (pesos 400, 600, 700). **Barlow Semi Condensed** (600) para numerais grandes e valores em listas e gráficos, sempre com `font-variant-numeric: tabular-nums`. Hospedadas localmente via pacotes `@fontsource`, sem depender de CDN.
- Escala: numeral de destaque 3,5 rem (uso raro: calorias do dia), título 1,25 rem, corpo 1 rem, rótulo 0,8125 rem, dado 1,125 rem. Passos de peso evidentes. Corpo nunca abaixo de 16 px em campos (evita zoom no celular).
- Sem rótulo pequeno acima de título (eyebrow). O título carrega o próprio peso.

## Layout

Mobile-first, uma coluna, largura máxima de 480 px centralizada em telas largas. Barra de abas fixa (fundo branco, aba ativa em verde) embaixo com quatro destinos (Hoje, Histórico, Gráficos, Ajustes) e o botão redondo de registrar sobressaindo ao centro. Ações principais ao alcance do polegar. Toda área tocável com no mínimo 44 px. Espaçamento em múltiplos de 4, grupos firmes (8 px) e separações generosas (24 a 40 px) entre blocos; mais espaço acima de um título do que abaixo. Respeita áreas seguras (notch e barra de gestos).

Desktop (a partir de `lg`, 1024 px): a barra de abas dá lugar a um menu lateral fixo de 256 px, em verde `night` com texto branco, com logo, botão amarelo de registrar, os quatro destinos e o perfil no rodapé. O conteúdo fica centralizado com no máximo 1200 px (720 px nas telas de formulário: registrar, revisar e detalhe da refeição), usando grades de duas colunas em Hoje, Histórico, Gráficos, Favoritos e Ajustes. Abaixo de 1024 px nada muda.

## Elevation & Depth

Profundidade discreta: cartões brancos sobre o fundo `leaf-mist` com borda de 1 px `leaf-line` e uma sombra suave de deslocamento vertical (0 1px 2px com blur baixo). A barra de abas tem sombra para cima. Nada de brilho, vidro ou sombra dura.

## Shapes

Cantos de 10 px para campos e botões, 16 px para cartões, pílula para chips, barras e o botão de captura. Ícones de uma biblioteca única (lucide), traço de 2 px.

## Components

- **Macros do dia:** três linhas, cada uma com bolinha da cor, nome, valor grande em Barlow e "/ meta g", e uma barra de progresso de 10 px com cantos arredondados. Passou da meta: a barra enche e o valor ganha " +" (sem alarme). Abaixo, uma faixa de 12 px dividida nas proporções de calorias (carboidrato e proteína 4 kcal/g, gordura 9 kcal/g) com legenda em porcentagem.
- **Mini-bandeja:** forma de 40 px na linha de cada refeição, com níveis relativos de proteína, carboidrato e gordura da refeição, ao lado da miniatura da foto.
- **Avatar:** círculo com a foto de perfil (256 px, JPEG) ou a inicial do nome sobre `leaf-night`. Aparece na tela Hoje (44 px) e nos Ajustes (64 px).
- **Telas de fora do app** (entrar, criar conta, esqueci a senha, redefinir senha, confirmar e-mail): moldura única com o logo, título, formulário e links para termos e privacidade no rodapé. O cadastro mostra o campo de convite quando o servidor exige e a caixa de aceite dos termos.
- **Calculadora de meta:** cartão nos Ajustes com sexo, idade, altura, peso, atividade e objetivo; mostra a sugestão e o botão "Usar estas metas", que só preenche o formulário (a pessoa confere e salva).
- **Linha de refeição:** miniatura 56 px, tipo e horário, nome resumido dos itens, kcal em Barlow à direita, mini-bandeja. Linha inteira é o alvo de toque.
- **Cartão de alimento (editável):** nome editável, porção em gramas com passos de ± e campo numérico, kcal e macros que recalculam ao vivo, selo de confiança (ícone + palavra), ação de remover. Um cartão por alimento, sem cartões dentro de cartões.
- **Botão de captura:** círculo de 64 px em `yolk`, ícone de câmera; abre a câmera do celular. Único elemento amarelo.
- **Estados:** carregando (esqueletos nas listas; texto "acordando o servidor…" quando a API demora), vazio (frase curta e uma ação), erro (o problema e como seguir), cota esgotada (oferece salvar sem análise ou registrar por texto).
- **Movimento:** só transições curtas de estado. `prefers-reduced-motion` desliga as animações.

## Do's and Don'ts

- Faça: números em Barlow tabular; cor de macro sempre com rótulo; textos sem julgamento ("acima da meta", nunca "estourou"); uma ação principal por tela.
- Faça: usar a faixa de composição só no resumo do dia e a mini-bandeja só nas listas.
- Não faça: vermelho para passar da meta; emoji ou glifos Unicode no lugar de ícones; gradiente em texto; cartões dentro de cartões; barra lateral colorida de 1 px ou mais em cartões; anéis de progresso; amarelo fora do botão de captura.
- Não faça: tema escuro (decisão do dono); voltar à bandeja de três compartimentos no resumo do dia; usar verde como cor de macro (gordura é azul).

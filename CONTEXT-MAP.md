# Context Map — CYBERDECK

**CYBERDECK** é o guarda-chuva de ferramentas criativas cyberpunk, 100% client-side. Cada
app é um "programa" que roda no deck e compartilha a linguagem visual e os padrões de
código, mas é versionado e deployado de forma independente (ver ADR 0011 e ADR 0012).

## Contexts

- [ASCII//Convert](./apps/ascii/CONTEXT.md) — converte uma Source Image ou Live Source num
  canvas de arte ASCII interativo, com preview em tempo real e Export.
- [GLITCH//Studio](./apps/glitch/CONTEXT.md) — aplica um pipeline de efeitos de glitch
  (pixel sort, RGB split, scanlines, corrupção de blocos) sobre uma imagem ou webcam, com
  preview em tempo real, presets e Export.
- [GOLEM//Console](./apps/golem/CONTEXT.md) — um *fantasy computer* de 32 bits: assembler,
  emulador e um Console de linha de comando, com registradores, memória e Terminal visíveis
  ao vivo durante a execução. **Ainda não implementado** — o modelo está fixado, o código não
  existe.

## Shared package

- **Deck Kit** (`@cyberdeck/deck-kit`) — a casca compartilhada sobre a qual todo programa do
  deck é montado: a linguagem visual (design tokens + Tailwind preset), os primitivos de `ui/`,
  os hooks e utils neutros de framework, e a plumbing genérica de browser (mecanismo de erro
  operacional, core de Recording). **Não** é um core de domínio — o pipeline de cada app (conversão
  ASCII, Effects de glitch) fica no app. Escopo e fronteiras em ADR 0014; `EmptyStateHero` e
  `Tooltip` cruzaram numa segunda leva (ADR 0015).

## Relationships

- **Linguagem visual compartilhada** — ambos os apps herdam do Deck Kit os design tokens
  (`tokens.css`), o Tailwind preset, os primitivos de `ui/`, `cn()` e o sistema de toast.
- **Só a superfície com diff vazio + dois callers foi extraída** — ADR 0011 tolerou a duplicação
  como sinal até o segundo app tornar as junções óbvias; ADR 0014 registra que o gatilho disparou
  e move só o que estava provado. O que diverge de propósito fica copiado (webcam-state, os nomes
  de `outputFilename`) — sinal, não dívida.
- **Paridade de interação entre os programas** — GLITCH//Studio provou um modelo de Source mais
  limpo (entrada única pelo empty state, controles ao vivo no overlay do canvas), e ADR 0015 o
  torna canônico e converge o ASCII//Convert nele. A convergência tornou `EmptyStateHero` e
  `Tooltip` diff-vazio, que então cruzaram pro Deck Kit — o `EmptyStateHero` por convergência
  deliberada antes da extração, o `Tooltip` como o "segundo caller" que ADR 0014 já previa. A
  paridade é de *casca e padrão*, não de features: AI Analyze (ASCII) e Presets/Seed (GLITCH)
  divergem de propósito. **Mirror** deixou de ser divergência e virou feature compartilhada
  (ADR 0016), mas com implementações de propósito diferentes — ASCII espelha só o preview via CSS,
  GLITCH espelha os pixels no Pipeline porque seu canvas *é* a saída. A convergência do control
  panel (Presets na frente, tweaks atrás de um `advanced` disclosure) também passou a valer pro
  ASCII, casando com o modelo que o GLITCH já usava.
- **Mesmo padrão de núcleo** — ambos os pipelines são funções puras sobre `ImageData`
  (imperative shell / functional core), com o único ponto de escrita no canvas visível
  isolado no passo de Paint. O GOLEM//Console segue o mesmo padrão com outra moeda: o core
  puro é `step(machine) → machine` e o assembler (`Source → Image`), e a casca é o driver de
  rAF que dirige o `step` no Clock escolhido.
- **O GOLEM//Console diverge na gramática de controle, de propósito** — não tem control panel
  nem `advanced` disclosure: todo controle passa pelo Console, e os painéis são read-only
  (ADR 0018). A paridade continua sendo de *casca e padrão*, não de widget — o Console **é** o
  control panel desse programa, e os painéis de estado são o seu canvas. Ele também rompe com
  a forma dos outros dois em algo mais fundo: ASCII e GLITCH são *stateless* (mesma entrada,
  mesma saída, sem tempo), enquanto o GOLEM é uma máquina de estados no tempo. Por isso o
  Export não é um artefato visual — é um link compartilhável com o Source, e `.hex`/trace como
  comandos.
- **"Shell" e "Console" não são sinônimos aqui** — *shell* continua significando a camada
  impura do código (imperative shell / functional core) em todo o deck; **Console** é o painel
  de linha de comando do GOLEM. E, dentro do GOLEM, **Terminal** é o dispositivo de saída da
  máquina simulada, não a linha de comando.

# Context Map — CYBERDECK

**CYBERDECK** é o guarda-chuva de ferramentas criativas cyberpunk, 100% client-side. Cada
app é um "programa" que roda no deck e compartilha a linguagem visual e os padrões de
código, mas é versionado e deployado de forma independente (ver ADR 0011 e ADR 0012).

> Nota de transição: a estrutura-alvo é o monorepo `cyberdeck` com `apps/*`. A migração do
> ASCII//Convert para `apps/ascii/` ainda não ocorreu — hoje seu `CONTEXT.md` vive na raiz
> (`./CONTEXT.md`). Os caminhos abaixo são os de destino.

## Contexts

- [ASCII//Convert](./apps/ascii/CONTEXT.md) — converte uma Source Image ou Live Source num
  canvas de arte ASCII interativo, com preview em tempo real e Export.
  _(Atualmente em `./CONTEXT.md` até a migração — ADR 0011.)_
- [GLITCH//Studio](./apps/glitch/CONTEXT.md) — aplica um pipeline de efeitos de glitch
  (pixel sort, RGB split, scanlines, corrupção de blocos) sobre uma imagem ou webcam, com
  preview em tempo real, presets e Export.

## Relationships

- **Linguagem visual compartilhada** — ambos herdam os design tokens (`index.css`), os
  primitivos de `ui/`, `cn()`, o sistema de toast/erro e os padrões de Export / Capture /
  Recording do ASCII//Convert.
- **Sem código compartilhado extraído (ainda)** — por decisão explícita (ADR 0011), não há
  `packages/` comum. A duplicação entre os apps é tolerada como sinal de qual é a superfície
  realmente compartilhada; a extração de um core só acontece quando o segundo app tornar as
  junções óbvias.
- **Mesmo padrão de núcleo** — ambos os pipelines são funções puras sobre `ImageData`
  (imperative shell / functional core), com o único ponto de escrita no canvas visível
  isolado no passo de Paint.

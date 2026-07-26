# Deck Kit

A casca compartilhada sobre a qual todo programa do deck é montado — a linguagem visual, os
primitivos de `ui/`, os hooks e utils neutros de framework. Não é um core de domínio: o pipeline de
cada programa fica no programa (ADR 0014). Este glossário cobre os termos da **linguagem visual**,
que é o que atravessa todos os programas.

## Language

**Theme**:
Uma variação nomeada da linguagem visual do deck. Todo Theme é escuro — a relação neon sobre
quase-preto é o registro do deck, não uma preferência. Um Theme alcança tudo que o deck desenha e
para onde começam os pixels do usuário (ADR 0024).
_Avoid_: skin, modo, dark mode / light mode (o deck não tem modos — tem Themes, e todos são escuros)

**Token Primitivo**:
Uma cor nomeada pelo que ela é (`--violet`, `--void`). Os primitivos são o vocabulário do Theme
`ice` e não se repetem por Theme.
_Avoid_: cor bruta, hex

**Token Semântico**:
Uma cor nomeada pelo papel que ela cumpre (`--accent`, `--fg-muted`, `--bg-elevated`). É a única
camada que um Theme redefine, e a única que componentes têm permissão de nomear.
_Avoid_: alias, variável de tema

**Theme Contract**:
O conjunto de razões de contraste que um Theme precisa provar para poder existir. Um Theme que não
cumpre o contrato não é um Theme — é uma proposta reprovada (ADR 0024, que generaliza os pinos da
ADR 0009).
_Avoid_: auditoria, checagem de acessibilidade

## O roster

Nomes vêm do vocabulário *interno* das ficções, nunca do título delas — o deck fala a língua da
obra, não a cita. A regra também evita colisão: `matrix` e `neon` já são Color Modes do
ASCII//Convert.

**ice**:
O Theme original do deck, nomeado pela primeira vez na ADR 0024 — acento violeta, info ciano, danger
rosa, warning elétrico. É o padrão e o fallback de qualquer valor ausente ou desconhecido.

**construct**:
Fósforo verde. A tela de uma máquina que só sabia exibir uma cor.

**chiba**:
Cinza e âmbar de vapor de sódio. O céu lavado de Gibson, não o título do livro.

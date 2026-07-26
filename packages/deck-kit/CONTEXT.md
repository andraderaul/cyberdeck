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

**Phosphor**:
A voz da própria máquina — o que o programa em execução escreveu, não o que a ferramenta está
oferecendo. É um papel próprio, não "info": nomeá-lo é o que permite a um Theme deixar o Terminal
verde sem esverdear toda afordância informativa do deck (ADR 0024).
_Avoid_: info, texto do terminal

**Par de resultado (Hit / Miss)**:
As duas respostas de um classificador (ADR 0023), nomeadas juntas porque um Theme precisa escolher
as duas de uma vez. Um Miss não é a ferramenta avisando de nada — é a outra resposta. O contrato
exige apenas que não sejam a *mesma* cor: contraste de luminância é o instrumento errado para dois
primeiros planos, e o certo seria um motor de cor.
_Avoid_: warning, erro, cache miss como falha

## As guardas

Três, todas no comando de teste que a CI já roda. A metade pura das três é `src/theme/audit.ts` —
texto entra, achados saem, sem sistema de arquivos.

**Guarda de contraste**: resolve `tokens.css` e prova o Theme Contract para todo Theme declarado.
**Guarda de vocabulário**: prova que nenhuma fonte, em nenhum programa, voltou a nomear um matiz
literal — e falha dizendo a classe, o arquivo e a linha, porque a correção é mecânica.
**Guarda do roster**: o roster existe em três lugares que não podem se importar — o TypeScript
daqui, os blocos de Theme do `tokens.css`, e um script inline por programa. Esta as mantém juntas,
e é também o que mantém a exclusão do SPRAWL//Atlas de pé.

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

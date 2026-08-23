# GLITCH//Studio

Ferramenta client-side que aplica um pipeline de efeitos de glitch sobre uma imagem
estática ou uma webcam ao vivo, com preview em tempo real, presets curados e Export.
Voltada para o **criador casual** — o resultado bonito em um clique importa mais que o
controle fino. Programa do deck **CYBERDECK** (ver `CONTEXT-MAP.md`).

## Chain

Uma lista **ordenada e editável** de Links, cada um uma instância de Effect — função pura sobre um
**PixelBuffer**. A ordem em que os Presets são montados continua sendo a canônica — estruturais
(reorganizam pixels) antes de superfície (sobrepõem textura):

`Block Displacement → Pixel Sort → Wave → Channel Shift → Chromatic Aberration → Halftone →
Scanlines → Noise`

**Wave é o primeiro dos estruturais de imagem inteira**, logo depois do Pixel Sort e à frente dos
por-canal (Channel Shift e Chromatic Aberration). O grupo dos estruturais se divide em três: os
**discretos**, que recortam e movem pedaços (Block Displacement, Pixel Sort); os de **imagem
inteira**, que deslocam tudo junto ao longo de uma função contínua (Wave); e os **por canal**, que
movem cada canal por si (Channel Shift, Chromatic Aberration).

Wave vem depois dos discretos porque assim carrega junto na curva o que eles deixaram — os rasgos
do Block Displacement, os rastros do Pixel Sort — em vez de ter a curva achatada de volta na grade
do quadro por um sort que roda depois: o Pixel Sort percorre as linhas **do quadro**, não as linhas
entortadas. E vem antes dos por-canal para que a separação de canais ande sobre a imagem já
entortada: uma lente franja o que chegou até ela, e chegou torto.

**Halftone fica na emenda entre os dois grupos**, e não dentro de nenhum deles: ele não reorganiza
pixels nem sobrepõe textura — ele **re-quantiza**, jogando fora o detalhe de cada célula e
devolvendo o tom dela como a área de um ponto. Por isso vem depois dos estruturais (peneira o que
eles rearranjaram) e antes dos de superfície (que depositam sua textura sobre os pontos).

`applyChain` é uma função pura de **Chain** + **Seed** → saída. Não há nenhuma fonte de
aleatoriedade oculta: toda aleatoriedade deriva do Seed, passado ao lado da Chain. Cada Link
sorteia a partir da *ocorrência* do seu Effect na Chain, de modo que repetições recebem arranjos
distintos e mover um Link não re-sorteia o arranjo dele.

## Language

**PixelBuffer**:
A grade de pixels que atravessa a Chain — a moeda do núcleo puro, análoga ao AsciiCell
do ASCII//Convert. Uma forma estrutural simples, deliberadamente independente do DOM, para
que o núcleo seja testável sem canvas.
_Avoid_: ImageData (é o tipo do DOM que a casca embrulha/desembrulha), bitmap, frame

**Effect**:
Uma transformação nomeada e isolada do pipeline; função pura `PixelBuffer → PixelBuffer`
parametrizada pelos seus próprios params. Os oito Effects são Block Displacement,
Pixel Sort, Wave, Channel Shift, Chromatic Aberration, Halftone, Scanlines e Noise.
_Avoid_: filter, layer, camada

**Chain**:
A lista **ordenada** de **Links** aplicada para produzir a saída — **o look** (ADR 0017). A ordem
é significativa: o PixelBuffer flui de um Link para o próximo. Repetições são permitidas — o mesmo
Effect pode aparecer mais de uma vez. Não contém o Seed: o look e o arranjo são coisas distintas.
A ordem canônica (`Block Displacement → Pixel Sort → Wave → Channel Shift →
Chromatic Aberration → Halftone → Scanlines → Noise`) deixou de ser lei e passou a ser só como as
Chains dos Presets são montadas.
_Avoid_: stack (o modelo é uma **Chain**, não uma "stack" — ver ADR 0017); pipeline (a Pipeline
fixa era o caso particular que a Chain substituiu); options, config, filters

**Link**:
Uma instância de Effect dentro da Chain: `{ type, params }` mais um `id` que existe só para a UI
poder distinguir duas ocorrências do mesmo Effect. **Presença na Chain é o liga/desliga** — não há
flag `enabled` nem zero codificado; um Effect está ligado porque o Link está lá.
_Avoid_: step, node, camada

**Seed**:
O valor que semeia toda a pseudo-aleatoriedade da Chain — **o arranjo**, uma rolagem
específica de um look. Alimenta o Block Displacement (que sorteia seus blocos do stream do
Seed) e o Noise (cujo grão sai de um hash posicional que recebe o Seed), de modo que um
Re-roll move os dois. Vive ao lado da Chain, não dentro: é o que permite que o
Re-roll troque o arranjo sem alterar o look. Fixo por padrão tanto na imagem quanto na
webcam; **Re-roll** gera um novo Seed.
_Avoid_: random, rng

**Preset**:
Uma Chain nomeada — um **look** curado para render bonito num clique,
ex.: `VHS`, `CORRUPTED`, `VAPORWAVE`, `SIGNAL LOSS`. Não carrega Seed: aplicar um Preset
gera um Seed novo, de modo que cada usuário recebe um arranjo próprio daquele look. É a
porta de entrada do app; os sliders ficam no modo avançado.
A lista é ordenada **do mais suave ao mais destrutivo** — um look novo é *inserido* na altura em que
cai, não acrescentado no fim.
Curar é a **única alavanca estrutural** do app: o Randomize carrega a estrutura da base intacta, então
só um Preset consegue pôr um Effect novo na mão de quem usa a porta da frente. Halftone e Wave
nasceram registrados, executáveis e inalcançáveis dali; `PHOSPHOR`, `DEGAUSS`, `BILLBOARD` e
`CROSSTALK` são o que os alcança.
_Avoid_: filtro, look (como termo de domínio — "look" descreve o que um Preset é, mas o
termo canônico é Preset)

**Chain JSON**:
A Chain escrita como arquivo — **o look saindo do app e voltando**, o "Preset do usuário".
Carrega **só a Chain**: nada de Seed (importar sorteia um arranjo novo, exatamente como aplicar um
Preset) e nada de `id` (encanamento de UI, que o `chainMatch` já ignora pelo mesmo motivo).
Importar **apaga a procedência** — é um look que o usuário trouxe, não um Preset editado. É o
único caminho pelo qual **variedade estrutural** (quais Links, quantos, em que ordem) entra no app
vinda de fora, já que o Randomize nunca inventa estrutura e só os Presets curados podiam
carregá-la. O arquivo não é confiável: Effect desconhecido, param fora da faixa, JSON quebrado ou
Chain acima do `MAX_CHAIN_LENGTH` são **recusados** — nunca clampados — com uma mensagem dizendo o
que está errado, num toast (ADR 0006).
_Avoid_: preset file, save, projeto, config

**Randomize**:
O ato de descobrir um look novo sorteando um Preset como base e perturbando seus params
dentro de faixas curadas ("preset + jitter"). Só os números mudam: a **estrutura da Chain**
(quais Links, quantos, em que ordem) passa intacta, porque estrutura ruim afunda um look mais
rápido que número ruim. Parte de um ponto conhecidamente bom, em vez de amostrar cada param
independentemente — é assim que o "sempre bonito" é garantido.
_Avoid_: shuffle, aleatorizar (mecanismo, não intenção)

**Editor**:
O estado que uma sessão de edição segura: o **look** (a Chain), o **arranjo** (o Seed) e a
**procedência** — de qual Preset o look partiu, se algum, e se já foi editado desde então
("modified"). As transições andam juntas e são a regra do produto: aplicar um Preset troca o
look e sorteia um arranjo novo; Randomize descobre um look e apaga a procedência; importar uma
**Chain JSON** traz um look de fora e apaga a procedência pelo mesmo motivo, sorteando um arranjo
novo como o Preset faz; Re-roll troca só o arranjo; editar a Chain preserva a procedência — o look
editado ainda pertence ao Preset de onde partiu, marcado modificado, nunca desmarcado.
_Avoid_: session, workspace, app state

## Effects

| Effect | O que faz |
|---|---|
| **Block Displacement** | Desloca blocos retangulares (semeados pelo Seed) horizontalmente — o sabor "corrupção de dados". Único Effect com aleatoriedade |
| **Pixel Sort** | Ordena faixas contíguas de pixels por luminância dentro de uma banda de threshold — o efeito "derretido" icônico |
| **Wave** | Desloca linhas ou colunas inteiras ao longo de uma senoide — o sinal **entortando** em vez de quebrar. É o eixo que faltava: **distorção geométrica da imagem inteira**, contínua, onde o Block Displacement move blocos **discretos** (e semeados) e o Chromatic Aberration move cada **canal** por si, radialmente. Amostragem bilinear, bordas em clamp; puramente geométrico (não usa Seed) |
| **Channel Shift** | Desloca os canais R/G/B por um vetor **uniforme** — o "RGB split". O deslocamento **constante** (o mesmo em toda a imagem) é o que o separa do Chromatic Aberration: são dois Effects distintos, não um com modos |
| **Chromatic Aberration** | Amplia cada canal em torno do centro por uma fração diferente (R para fora, B para dentro), de modo que o deslocamento **cresce com o raio** — centro nítido, franjas coloridas nas bordas: o sabor de **lente óptica**. Amostragem bilinear, bordas em clamp; puramente geométrico (não usa Seed) |
| **Halftone** | Redesenha a imagem como uma grade de pontos cuja **área** acompanha a luminância de cada célula — a retícula de impressão. Nem estrutural nem de superfície: **re-quantiza**, e por isso ocupa a emenda entre os dois grupos na ordem canônica. `color` dá ao ponto a cor média da célula, `mono` entinta de branco e deixa só a área carregando o tom. Puramente uma função dos pixels (não usa Seed) |
| **Scanlines** | Linhas escuras horizontais / raster de CRT |
| **Noise** | Granulado/estática sobreposto |

## Saída

O resultado sai do app por quatro caminhos, todos reuso dos padrões do ASCII//Convert:
**PNG Export** (imagem estática), **Capture** (um frame da webcam glitchada como PNG),
**Copy** (PNG para a área de transferência) e **Recording** (grava a webcam glitchada como
vídeo via `canvas.captureStream()` + `MediaRecorder`). Recording grava o canvas de saída —
**não é datamosh** (manipulação de codec/frames), que fica para o v2.

Esses quatro tiram **a imagem**. A **Chain JSON** é a quinta saída e a única que não é a imagem:
tira **o look**, para que uma Chain montada à mão possa ser guardada e compartilhada. Export mora
na aba OUT ao lado dos outros; import mora na aba PRESETS, porque um look trazido se aplica como
um Preset (ADR 0020).

## Escopo (v1)

- **Dentro:** imagem estática + Live Source (webcam) em tempo real; a Chain editável de
  Effects — 8 tipos, ordem, presença e repetição nas mãos do usuário (ADR 0017); presets-first
  (6 Presets, um já aplicado na abertura) + Randomize; Seed fixo com Re-roll; PNG Export +
  Capture + Copy + Recording; export/import da Chain como JSON (**Chain JSON**).
- **Fora (v2+):** datamosh real — **caminho de saída próprio**, só para Live Source, fora da Chain
  e fora do Recording (ADR 0026); glitch animado (Seed avançando por frame na webcam).

# GLITCH//Studio

Ferramenta client-side que aplica um pipeline de efeitos de glitch sobre uma imagem
estática ou uma webcam ao vivo, com preview em tempo real, presets curados e Export.
Voltada para o **criador casual** — o resultado bonito em um clique importa mais que o
controle fino. Programa do deck **CYBERDECK** (ver `CONTEXT-MAP.md`).

## Chain

Uma lista **ordenada e editável** de Links, cada um uma instância de Effect — função pura sobre um
**PixelBuffer**. A ordem em que os Presets são montados continua sendo a canônica — estruturais
(reorganizam pixels) antes de superfície (sobrepõem textura):

`Block Displacement → Pixel Sort → Channel Shift → Chromatic Aberration → Scanlines → Noise`

`applyChain` é uma função pura de **Chain** + **Seed** → saída. Não há nenhuma fonte de
aleatoriedade oculta: toda aleatoriedade deriva do Seed, passado ao lado da Chain. Cada Link
sorteia a partir da *ocorrência* do seu Effect na Chain, de modo que repetições recebem arranjos
distintos e mover um Link não re-sorteia o arranjo dele.

## Language

**PixelBuffer**:
A grade de pixels que atravessa o Pipeline — a moeda do núcleo puro, análoga ao AsciiCell
do ASCII//Convert. Uma forma estrutural simples, deliberadamente independente do DOM, para
que o núcleo seja testável sem canvas.
_Avoid_: ImageData (é o tipo do DOM que a casca embrulha/desembrulha), bitmap, frame

**Effect**:
Uma transformação nomeada e isolada do pipeline; função pura `PixelBuffer → PixelBuffer`
parametrizada pelos seus próprios params. Os seis Effects são Block Displacement,
Pixel Sort, Channel Shift, Chromatic Aberration, Scanlines e Noise.
_Avoid_: filter, layer, camada

**Chain**:
A lista **ordenada** de **Links** aplicada para produzir a saída — **o look** (ADR 0017). A ordem
é significativa: o PixelBuffer flui de um Link para o próximo. Repetições são permitidas — o mesmo
Effect pode aparecer mais de uma vez. Não contém o Seed: o look e o arranjo são coisas distintas.
A ordem canônica (`Block Displacement → Pixel Sort → Channel Shift → Chromatic Aberration →
Scanlines → Noise`) deixou de ser lei e passou a ser só como as Chains dos Presets são montadas.
_Avoid_: stack (o modelo é uma **Chain**, não uma "stack" — ver ADR 0017); pipeline (a Pipeline
fixa era o caso particular que a Chain substituiu); options, config, filters

**Link**:
Uma instância de Effect dentro da Chain: `{ type, params }` mais um `id` que existe só para a UI
poder distinguir duas ocorrências do mesmo Effect. **Presença na Chain é o liga/desliga** — não há
flag `enabled` nem zero codificado; um Effect está ligado porque o Link está lá.
_Avoid_: step, node, camada

**Seed**:
O valor que semeia toda a pseudo-aleatoriedade do Pipeline — **o arranjo**, uma rolagem
específica de um look. Alimenta o Block Displacement (que sorteia seus blocos do stream do
Seed) e o Noise (cujo grão sai de um hash posicional que recebe o Seed), de modo que um
Re-roll move os dois. Vive ao lado dos GlitchSettings, não dentro: é o que permite que o
Re-roll troque o arranjo sem alterar o look. Fixo por padrão tanto na imagem quanto na
webcam; **Re-roll** gera um novo Seed.
_Avoid_: random, rng

**Preset**:
Uma Chain nomeada — um **look** curado para render bonito num clique,
ex.: `VHS`, `CORRUPTED`, `VAPORWAVE`, `SIGNAL LOSS`. Não carrega Seed: aplicar um Preset
gera um Seed novo, de modo que cada usuário recebe um arranjo próprio daquele look. É a
porta de entrada do app; os sliders ficam no modo avançado.
_Avoid_: filtro, look (como termo de domínio — "look" descreve o que um Preset é, mas o
termo canônico é Preset)

**Randomize**:
O ato de descobrir um look novo sorteando um Preset como base e perturbando seus params
dentro de faixas curadas ("preset + jitter"). Só os números mudam: a **estrutura da Chain**
(quais Links, quantos, em que ordem) passa intacta, porque estrutura ruim afunda um look mais
rápido que número ruim. Parte de um ponto conhecidamente bom, em vez de amostrar cada param
independentemente — é assim que o "sempre bonito" é garantido.
_Avoid_: shuffle, aleatorizar (mecanismo, não intenção)

## Effects

| Effect | O que faz |
|---|---|
| **Block Displacement** | Desloca blocos retangulares (semeados pelo Seed) horizontalmente — o sabor "corrupção de dados". Único Effect com aleatoriedade |
| **Pixel Sort** | Ordena faixas contíguas de pixels por luminância dentro de uma banda de threshold — o efeito "derretido" icônico |
| **Channel Shift** | Desloca os canais R/G/B por um vetor **uniforme** — o "RGB split". O deslocamento **constante** (o mesmo em toda a imagem) é o que o separa do Chromatic Aberration: são dois Effects distintos, não um com modos |
| **Chromatic Aberration** | Amplia cada canal em torno do centro por uma fração diferente (R para fora, B para dentro), de modo que o deslocamento **cresce com o raio** — centro nítido, franjas coloridas nas bordas: o sabor de **lente óptica**. Amostragem bilinear, bordas em clamp; puramente geométrico (não usa Seed) |
| **Scanlines** | Linhas escuras horizontais / raster de CRT |
| **Noise** | Granulado/estática sobreposto |

## Saída

O resultado sai do app por quatro caminhos, todos reuso dos padrões do ASCII//Convert:
**PNG Export** (imagem estática), **Capture** (um frame da webcam glitchada como PNG),
**Copy** (PNG para a área de transferência) e **Recording** (grava a webcam glitchada como
vídeo via `canvas.captureStream()` + `MediaRecorder`). Recording grava o canvas de saída —
**não é datamosh** (manipulação de codec/frames), que fica para o v2.

## Escopo (v1)

- **Dentro:** imagem estática + Live Source (webcam) em tempo real; pipeline fixo de 6
  Effects; presets-first (6 Presets, um já aplicado na abertura) + Randomize; Seed fixo com
  Re-roll; PNG Export + Capture + Copy + Recording.
- **Fora (v2+):** datamosh real; glitch animado
  (Seed avançando por frame na webcam).

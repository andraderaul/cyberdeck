# GLITCH//Studio

Ferramenta client-side que aplica um pipeline de efeitos de glitch sobre uma imagem
estática ou uma webcam ao vivo, com preview em tempo real, presets curados e Export.
Voltada para o **criador casual** — o resultado bonito em um clique importa mais que o
controle fino. Programa do deck **CYBERDECK** (ver `CONTEXT-MAP.md`).

## Pipeline

Uma ordem **fixa** de Effects, cada um uma função pura `ImageData → ImageData`. A ordem é
canônica porque os Presets dependem dela — estruturais (reorganizam pixels) antes de
superfície (sobrepõem textura):

`Block Displacement → Pixel Sort → Channel Shift → Scanlines → Noise`

O Pipeline é uma função pura de **GlitchSettings** → saída. Não há nenhuma fonte de
aleatoriedade oculta: toda aleatoriedade deriva do **Seed**, que faz parte de
GlitchSettings.

## Language

**Effect**:
Uma transformação nomeada e isolada do pipeline; função pura `ImageData → ImageData`
parametrizada pelos seus próprios params. Os cinco Effects do v1 são Block Displacement,
Pixel Sort, Channel Shift, Scanlines e Noise.
_Avoid_: filter, layer, camada

**Pipeline**:
A sequência ordenada e **fixa** de Effects aplicada para produzir a saída. Fixa no v1; um
caso particular da futura pilha componível.
_Avoid_: stack, chain (reservados para o modelo componível futuro — não queimar agora)

**GlitchSettings**:
O objeto plano que guarda os params de todos os Effects mais o Seed. Paralelo direto ao
ConversionSettings do ASCII//Convert; determina inteiramente a saída.
_Avoid_: options, config, filters

**Seed**:
O valor que semeia toda a pseudo-aleatoriedade do Pipeline (hoje, o Block Displacement).
Faz parte de GlitchSettings, então a saída é determinística e reproduzível. Fixo por padrão
tanto na imagem quanto na webcam; **Re-roll** gera um novo Seed.
_Avoid_: random, rng

**Preset**:
Um snapshot nomeado de GlitchSettings (Seed incluso), curado para render bonito num clique
— ex.: `VHS`, `CORRUPTED`, `VAPORWAVE`, `SIGNAL LOSS`. É a porta de entrada do app; os
sliders ficam no modo avançado.
_Avoid_: filtro, look (como termo de domínio)

**Randomize**:
O ato de gerar um novo GlitchSettings amostrando params e Seed dentro de faixas curadas
como "sempre bonitas". Atalho de descoberta para o criador casual.
_Avoid_: shuffle, aleatorizar (mecanismo, não intenção)

## Effects

| Effect | O que faz |
|---|---|
| **Block Displacement** | Desloca blocos retangulares (semeados pelo Seed) horizontalmente — o sabor "corrupção de dados". Único Effect com aleatoriedade |
| **Pixel Sort** | Ordena faixas contíguas de pixels por luminância dentro de uma banda de threshold — o efeito "derretido" icônico |
| **Channel Shift** | Desloca os canais R/G/B espacialmente (o "RGB split" uniforme). Não confundir com chromatic aberration (deslocamento radial, ótico) — fora do v1 |
| **Scanlines** | Linhas escuras horizontais / raster de CRT |
| **Noise** | Granulado/estática sobreposto |

## Saída

O resultado sai do app por quatro caminhos, todos reuso dos padrões do ASCII//Convert:
**PNG Export** (imagem estática), **Capture** (um frame da webcam glitchada como PNG),
**Copy** (PNG para a área de transferência) e **Recording** (grava a webcam glitchada como
vídeo via `canvas.captureStream()` + `MediaRecorder`). Recording grava o canvas de saída —
**não é datamosh** (manipulação de codec/frames), que fica para o v2.

## Escopo (v1)

- **Dentro:** imagem estática + Live Source (webcam) em tempo real; pipeline fixo de 5
  Effects; presets-first + Randomize; Seed fixo; PNG Export + Capture + Copy + Recording.
- **Fora (v2+):** datamosh real; pilha de Effects componível/reordenável; glitch animado
  (Seed avançando por frame na webcam); chromatic aberration.

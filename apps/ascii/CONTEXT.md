# ASCII Art Converter

Ferramenta client-side que converte uma imagem estática num canvas de arte ASCII interativa, com preview em tempo real e download do resultado.

## Pipeline

1. **Convert** — `convertImage()`: lê os pixels da imagem e produz uma grade de **AsciiCell**
2. **Orchestrate** — `renderFrame()`: calcula `cols × rows`, chama Convert, Compute e Paint em sequência; retorna `false` se o canvas for pequeno demais para caber um caractere
3. **Compute** — `computeFrame()`: percorre a grade de **AsciiCell** e produz instruções de renderização com posição e cor — puro, sem DOM
4. **Paint** — `paintFrame()`: único ponto de escrita no canvas visível

## Language

**Charset**:
O conjunto de símbolos disponíveis para mapear luminosidade de pixel em caractere ASCII. Cada charset tem uma densidade expressiva diferente.
_Avoid_: Density, density map, symbol set

**Source Image**:
A imagem estática trazida pelo usuário como entrada da conversão. Imutável durante a sessão — o conversor a lê a cada re-render mas nunca a modifica.
_Avoid_: uploadedImage, imagem carregada, input image

**Export**:
O ato de levar o resultado para fora do app. Dois formatos: **PNG Export** (snapshot visual do canvas com cores) e **TXT Export** (string ASCII pura, sem cor, assume monospace no destino).
_Avoid_: download (descreve o mecanismo do browser, não a intenção)

**ConversionSettings**:
O conjunto de parâmetros que governa como a imagem é convertida em ASCII — charset, color mode, resolution, brightness e contrast.
_Avoid_: AsciiOptions, options, settings (genérico)

**AsciiCell**:
A unidade atômica do canvas ASCII — um caractere mapeado de um pixel, com sua cor de origem preservada para o renderizador.
_Avoid_: ProcessedPixel, pixel processado

**Color Mode**:
O esquema de colorização aplicado ao canvas. Paletas temáticas (`matrix`, `bw`, `retro`, `sepia`, `neon`) pintam todos os caracteres com uma cor fixa. O modo `original` usa o RGB de cada pixel da imagem original.
_Avoid_: colorMode (como termo de domínio), color (como valor — ambíguo)

**Resolution**:
Quantos caracteres cabem no canvas — controlado pelo tamanho do caractere. Resolução alta = caracteres pequenos = mais detalhe. Resolução baixa = caracteres grandes = resultado mais grosseiro.
_Avoid_: fontSize, granularity, granularidade, tamanho de fonte

## Relationships

- Uma **Source Image** é convertida por `convertImage()` em uma grade de **AsciiCell** usando os **ConversionSettings** ativos
- Cada **AsciiCell** carrega um caractere (determinado pelo **Charset**) e o RGB original do pixel
- O **AsciiCanvas** renderiza a grade de **AsciiCell** aplicando o **Color Mode**
- O resultado pode ser exportado como **PNG Export** (canvas com cores) ou **TXT Export** (string ASCII pura)

## Example dialogue

> **Dev:** "Quando o usuário muda o **Charset**, a **Source Image** é recarregada?"
> **Domain expert:** "Não — a **Source Image** é imutável. O que muda são os **ConversionSettings**. Isso dispara um novo `convertImage()` que relê os pixels e produz uma nova grade de **AsciiCell** com caracteres diferentes."

> **Dev:** "O **PNG Export** e o **TXT Export** usam a mesma fonte?"
> **Domain expert:** "O **PNG Export** usa a fonte do canvas. O **TXT Export** é texto puro — assume que quem receber vai renderizar em monospace, mas o app não garante isso."

**Live Source**:
A webcam stream ativa como entrada da conversão, em oposição à Source Image estática. Quando o Live Source está ativo, o AsciiCanvas roda um loop contínuo de renderização — nenhum frame é armazenado.
_Avoid_: stream, câmera, video source

**Capture**:
O ato de exportar um frame do Live Source como PNG em um instante determinado pelo usuário. Não interrompe o Live Source — o loop continua rodando após o Capture. Disponível inclusive durante um Recording ativo.
_Avoid_: snapshot, screenshot, foto, tirar foto

**Record** (verb) / **Recording** (noun):
O ato de gravar o canvas ASCII em vídeo enquanto o Live Source está ativo. Iniciado e interrompido pelo usuário; ao parar, dispara um Video Export automático. Um contador de tempo visível ("● 0:42") informa a duração sem impor limite. Disponível apenas onde `MediaRecorder` + `canvas.captureStream()` forem suportados — em browsers não suportados o controle não é exibido (progressive enhancement).
_Avoid_: gravar, filmagem, screen record

**Video Export**:
O arquivo de vídeo produzido ao término de um Recording. Formato determinado em runtime por `MediaRecorder.isTypeSupported()` — preferência por `video/webm`, fallback para `video/mp4`. Export automático ao parar o Recording, consistente com o comportamento do Capture e do PNG Export.
_Avoid_: download de vídeo, salvar vídeo

**Analyze**:
O ato de enviar o canvas ASCII renderizado a um AI Provider externo e receber uma **Analysis** em resposta. Disponível apenas quando uma AI Config está presente.
_Avoid_: scan, scan & analyze (UI copy apenas, não termo de domínio)

**Analysis**:
O resultado de um **Analyze** — contém uma descrição narrativa, um Threat Level e tags identificadoras. Produzido pelo AI Provider e normalizado pelo adapter correspondente.
_Avoid_: AnalysisResult (nome de tipo interno), response, resultado

**AI Config**:
A configuração que habilita o **Analyze** — inclui o AI Provider escolhido e a API key fornecida pelo usuário. Persiste em `localStorage`. Ausência de AI Config torna o **Analyze** invisível na UI.
_Avoid_: key, api key, credentials

**AI Provider**:
O serviço externo de IA que executa o **Analyze** (ex: Anthropic, OpenAI, Gemini). Cada AI Provider tem um adapter dedicado que implementa o contrato `AIProvider`.
_Avoid_: provider (genérico), model, LLM

## Charsets

Cada Charset é uma string de caracteres ordenados do mais escuro (menor luminosidade → `' '`) ao mais claro. O conversor divide 0–255 em `map.length - 1` buckets e indexa a string. A ordem define o gradiente expressivo; o comprimento define a granularidade.

**Gradiente ASCII** — mesma técnica (luminosidade → char imprimível), diferem no contraste e granularidade:

| Charset | Origem / contexto |
|---|---|
| **classic** | Gradiente manual canônico da era BBS — 10 níveis, legível em qualquer terminal |
| **sharp** | Variante com pontuação mais agressiva (`^!*<&%$`) — output de contraste alto |
| **detailed** | Escala Paul Bourke (1997), referência histórica — 70+ caracteres, máxima granularidade |
| **ascii** | Gradiente somente ASCII 7-bit — sem Unicode. Máxima compatibilidade (impressoras, terminais legados) |

**Blocos Unicode** — gradiente por preenchimento de célula:

| Charset | Origem / contexto |
|---|---|
| **blocks** | IBM CP437 (DOS). Gradiente de blocos Unicode (`░▒▓█`) |
| **halfblock** | Técnica half-block da demoscene — `▄▀█` subdividem cada célula em dois pixels verticais, dobrando a resolução percebida |

**Sistemas de escrita** — ordenação por peso visual aproximado, não luminância exata:

| Charset | Origem / contexto |
|---|---|
| **braille** | Popularizado por viewers de terminal como `chafa`. Cada char representa 2×4 pontos; ordenado por popcount de 0 a 8 dots (`⠀→⣿`). Maior densidade visual percebida sem mudar cols/rows |
| **katakana** | Estética Shift-JIS art japonesa (1980s–2000s). Usa formas halfwidth (U+FF65–U+FF9F) para compatibilidade monospace. O Matrix usou katakana espelhado horizontalmente — não reproduzível via charset string sem alterar a pipeline de renderização |

**Formas geométricas** — símbolos Unicode ordenados por área preenchida:

| Charset | Origem / contexto |
|---|---|
| **geometric** | Símbolos geométricos variados (círculos, quadrados, triângulos, estrelas) — uso estético |
| **circles** | Progressão de círculos do vazio ao cheio (`·∘○◎●`) — cinco níveis, saída minimalista |

**Especializados**:

| Charset | Origem / contexto |
|---|---|
| **box** | Arte TUI/terminal desde o DOS. Caracteres box-drawing Unicode (─│┼╬) ordenados por densidade de linhas |
| **binary** | Minimalista — dois estados (`0` e `1`). Produz saída de código/glitch |

## Flagged ambiguities

- `color` (valor de ColorMode) era ambíguo — poderia significar "tem cor" ou "usa as cores originais". Resolvido: o valor se chama `original`.
- `fontSize` no código representava resolução do output, não tamanho tipográfico. Resolvido: renomear para `resolution`.
- `density` / `charset` coexistiam para o mesmo conceito. Resolvido: `Charset` é o termo canônico.
- `download` era usado para descrever a saída. Resolvido: `Export` descreve a intenção; "download" é apenas o mecanismo do browser.


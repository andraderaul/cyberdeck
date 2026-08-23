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

**Edge Glyph**:
O caractere direcional (`|` `/` `-` `\`) que uma **AsciiCell** assume quando o gradiente local é forte o bastante para valer como contorno. É o segundo eixo do conversor: o **Charset** mapeia luminosidade, o Edge Glyph mapeia *forma* — a orientação da borda, medida por Sobel sobre a grade já amostrada, escolhe o traço. Abaixo do limiar de magnitude nada muda e a célula fica com o glifo de luminosidade, então o eixo é opt-in e desligado por padrão. É a mesma porta que o katakana espelhado do Matrix não atravessa: o que falta a uma charset string é poder dizer forma.
_Avoid_: edge detection (é o mecanismo, não o termo), borda, sobel char, ASCII edges

**Dithering**:
A troca de uma fronteira dura de bucket por um padrão, feita sobre a grade amostrada *antes* de o **Charset** escolher o caractere. Um Charset curto divide 0–255 em pouquíssimos níveis e a diferença que não cabe entre eles vira banda; o Dithering gasta essa diferença espalhando-a entre células vizinhas, de modo que a média do que foi desenhado volte ao nível que a **Source Image** realmente tinha. Três valores: `none` (a conversão que existia antes do passe, caractere por caractere), `bayer` (matriz ordenada 4x4 — cada célula do tile atravessa a fronteira num nível diferente, padrão fixo e sem memória) e `floyd` (Floyd–Steinberg — cada célula entrega o resto da própria quantização às vizinhas que ainda não foram visitadas, então o passe é dependente de ordem por construção, ainda que puro sobre a grade). Roda *antes* do **Edge Glyph**, e o **Edge Glyph** nunca o lê: Sobel procura vizinhas que diferem muito e o Dithering existe justamente para fazer vizinhas diferirem. O quanto isso custa depende do algoritmo, e a resposta honesta não é a mesma para os dois — medido, o `bayer` só chega a ~71 do 255 que o limiar exige, então hoje ele não teria como inventar contorno em Charset nenhum; já o `floyd`, cujo erro corre pela linha e acumula, transforma um campo *chapado* em duas dezenas de contornos que não existem na **Source Image**. A ordem é a regra para ambos porque o limiar é uma constante ajustável e essa folga do `bayer` não é promessa de ninguém.
_Avoid_: ruído, noise, halftone, error diffusion (é o mecanismo do `floyd`, não o termo), anti-aliasing

**Source Image**:
A imagem estática trazida pelo usuário como entrada da conversão. Imutável durante a sessão — o conversor a lê a cada re-render mas nunca a modifica.
_Avoid_: uploadedImage, imagem carregada, input image

**Export**:
O ato de levar o resultado para fora do app. Três formatos: **PNG Export** (snapshot visual do canvas com cores), **TXT Export** (string ASCII pura, sem cor, assume monospace no destino) e **HTML Export** (documento com os caracteres *e* as cores, como texto selecionável).
_Avoid_: download (descreve o mecanismo do browser, não a intenção)

**HTML Export**:
O documento HTML autocontido que leva o resultado inteiro para fora: cada **AsciiCell** vira texto de verdade, dentro de um `<pre>`, pintado com a cor que o **Color Mode** deu a ela. É o formato que não descarta metade da grade — o **PNG Export** guarda a cor e destrói o texto, o **TXT Export** guarda o texto e larga a cor. O documento embute a própria font stack (terminada em `monospace`) e não busca nenhum asset externo, então quem abrir offline vê o que o preview mostrava; e como é texto, seleciona, copia e escala sem perder nitidez. Recortado à fit region como o **TXT Export**, sem as bandas de letterbox (ADR 0010). HTML e não SVG: só o `<pre>` garante que a arte volte da seleção com as quebras de linha e o alinhamento das colunas intactos.
_Avoid_: SVG Export, web export, exportar a página, HTML5

**ConversionSettings**:
O conjunto de parâmetros que governa como a imagem é convertida em ASCII — charset, edge glyphs, dithering, color mode, resolution, brightness e contrast.
_Avoid_: AsciiOptions, options, settings (genérico)

**AsciiCell**:
A unidade atômica do canvas ASCII — um caractere mapeado de um pixel, com sua cor de origem preservada para o renderizador.
_Avoid_: ProcessedPixel, pixel processado

**Color Mode**:
O esquema de colorização aplicado ao canvas. Paletas temáticas (`matrix`, `bw`, `retro`, `sepia`, `neon`) pintam todos os caracteres com uma cor fixa. O modo `original` usa o RGB de cada pixel da imagem original.
_Avoid_: colorMode (como termo de domínio), color (como valor — ambíguo), Theme (é a arte do usuário, não a casca do deck — ver Flagged ambiguities)

**Resolution**:
Quantos caracteres cabem no canvas — controlado pelo tamanho do caractere. Resolução alta = caracteres pequenos = mais detalhe. Resolução baixa = caracteres grandes = resultado mais grosseiro.
_Avoid_: fontSize, granularity, granularidade, tamanho de fonte

## Relationships

- Uma **Source Image** é convertida por `convertImage()` em uma grade de **AsciiCell** usando os **ConversionSettings** ativos
- Cada **AsciiCell** carrega um caractere (determinado pelo **Charset**) e o RGB original do pixel
- Sob um **Dithering**, o caractere que uma **AsciiCell** recebe do **Charset** pode subir um bucket para que a média da vizinhança feche no nível da **Source Image** — nunca mais que um, então o passe reordena a própria rampa em vez de acrescentar ruído
- Uma **AsciiCell** cujo gradiente ultrapassa o limiar troca o caractere do **Charset** por um **Edge Glyph** — a troca acontece na grade, não na pintura, então **PNG Export**, **TXT Export** e **HTML Export** carregam a forma junto com o preview. O mesmo vale para o **Dithering**, e é por isso que os dois moram em `convertImage()` e não em `paintFrame()`
- O **AsciiCanvas** renderiza a grade de **AsciiCell** aplicando o **Color Mode**
- O resultado pode ser exportado como **PNG Export** (canvas com cores), **TXT Export** (string ASCII pura) ou **HTML Export** (texto selecionável com cores)
- Uma **Analysis** carrega uma **Suggestion** quando há uma legível: **ConversionSettings** propostos que só substituem os ativos quando o usuário aplica, e que voltam atrás por um controle enquanto ele não editar por conta própria

## Example dialogue

> **Dev:** "Quando o usuário muda o **Charset**, a **Source Image** é recarregada?"
> **Domain expert:** "Não — a **Source Image** é imutável. O que muda são os **ConversionSettings**. Isso dispara um novo `convertImage()` que relê os pixels e produz uma nova grade de **AsciiCell** com caracteres diferentes."

> **Dev:** "O **PNG Export** e o **TXT Export** usam a mesma fonte?"
> **Domain expert:** "O **PNG Export** usa a fonte do canvas. O **TXT Export** é texto puro — assume que quem receber vai renderizar em monospace, mas o app não garante isso."

> **Dev:** "E o **HTML Export**, garante?"
> **Domain expert:** "Garante o que dá para garantir sem baixar nada: o documento carrega a própria font stack e termina em `monospace`, então a grade se mantém mesmo em uma máquina que não tem as fontes do deck. O que ele nunca faz é abrir mão do texto — é por isso que existe."

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
O resultado de um **Analyze** — uma descrição narrativa, um Threat Level, tags identificadoras e, quando o provider entrega uma que se possa ler, uma **Suggestion**. As partes vêm de uma única ida ao AI Provider: quem paga a chamada é o usuário, com a própria chave, então descrever e sugerir são um ato só e não dois (#308). Validada num ponto só, antes de virar valor de domínio: prosa malformada vira `ParseError` e a Analysis inteira cai (ADR 0003, ADR 0006); uma **Suggestion** que o leitor recusa cai sozinha, porque a descrição pela qual o usuário já pagou não vale ser jogada fora por um número fora de faixa.
_Avoid_: AnalysisResult (nome de tipo interno), response, resultado

**Suggestion**:
Os **ConversionSettings** que a **Analysis** propõe para o que ela acabou de descrever — os seis eixos de uma vez, não um conselho em prosa. Chega junto da descrição mas não age: nenhum controle se move sozinho. O usuário lê a proposta no modal e aplica num clique; os ConversionSettings que ela deslocou ficam guardados atrás de um controle `revert` na aba PRESETS, sem precisar recarregar a **Source Image**, e a oferta expira na primeira edição do próprio usuário — depois dela, restaurar o snapshot jogaria fora trabalho que veio *depois* da sugestão. Vocabulário desconhecido é recusado, nunca aproximado: um Charset que não existe derruba a Suggestion inteira em vez de virar o Charset mais parecido — e derruba só ela: o painel some, a descrição fica.
_Avoid_: recommendation, auto-settings, AI preset (a sugestão não tem nome nem lugar fixo na fileira de presets)

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
- **Color Mode × Theme** colidem em português e em inglês — os dois são "o esquema de cores". São coisas distintas e este é o único programa onde os dois controles ficam à vista: **Color Mode pinta a arte do usuário; Theme pinta a casca do deck** (ADR 0024, que reusa a fronteira da ADR 0013). Resolvido também no nome: nenhum dos sete Themes se chama `matrix` ou `neon` justamente porque esses dois já são Color Modes daqui.


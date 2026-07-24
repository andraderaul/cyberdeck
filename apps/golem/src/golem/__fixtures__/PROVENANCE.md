# Proveniência dos fixtures

Os programas herdados aqui são **material de referência da disciplina de Arquitetura de
Computadores (UFS, 2017)** — exemplos do professor, publicados no site da disciplina. Não são
autoria nossa e não foram reescritos: um fixture só vale como oráculo se for exatamente o
artefato original. É a diferença deliberada em relação ao `ISA.md`, que **é** reescrito com
nossas palavras, porque especificação se restata e fixture não.

Por que o ISA é herdado, e o que mais fica de fora do repo: [ADR 0019](../../../../docs/adr/0019-golem-isa-inherited-from-poxim.md).

## O que está aqui

| programa | cobre |
|---|---|
| `1_fibonacci` | laço, `stw` em vetor, `call`/`ret` |
| `1_factorial` | laço com acumulador |
| `1_recursive_factorial` | recursão, `push`/`pop` |
| `1_recursive_fibonacci` | recursão em árvore — o trace mais longo |
| `1_limits` | overflow e divisão por zero (`OV`, `ZD`) |

E os quatro da **unidade 2**, vendorizados em #204 sob o mesmo estatuto:

| programa | cobre |
|---|---|
| `2_hello_world` | readback do Terminal — escreve e relê o byte no endereço mapeado; vetores são `nop`, não toca em interrupção |
| `2_interruption` | `enai`, `isr`/`reti`, `int N` como chamada de sistema, divisão por zero e instrução inválida |
| `2_watchdog` | arma o Watchdog e perde um laço infinito para a contagem regressiva (interrupção de hardware 1) |
| `2_fpu` | dirige a FPU por registradores mapeados, gasta ciclos, e é liberado pela interrupção de hardware 2 |

Cada um em três formas, que dão **dois oráculos independentes**:

| extensão | é | oráculo de |
|---|---|---|
| `.s` | fonte assembly com labels | entrada do assembler |
| `.hex` | palavras montadas | **saída esperada do assembler** |
| `.out` | trace de execução | **saída esperada da máquina** |

## Fixtures gerados aqui

Os acima são **herdados**. Os dois abaixo foram **fabricados neste repo** (#135), para
cobrir branches que nenhum programa de referência executa.

Eles se chamavam `2_blt` e `2_bnz`, onde o `2_` queria dizer "gerado com o `poxim2`". Com os
programas reais da unidade 2 entrando em #204 o prefixo passou a mentir, e foram renomeados para
`gen_`. O emulador que os gerou continua sendo o `poxim2` — só o nome deixou de sugerir unidade.

| programa | cobre | gerado com |
|---|---|---|
| `gen_blt` | `blt` nas duas direções (LT desvia, GT não) | `poxim2` |
| `gen_bnz` | `bnz` nas duas direções (ZD limpo desvia, ZD posto não) | `poxim2` |

**O `.hex` deles não é oráculo do assembler.** Nos herdados o `.hex` veio do assembler do
professor, independente do nosso. Nos gerados fomos nós que codificamos as palavras à mão, então
um `.s`/`.hex` verde só prova consistência conosco mesmos.

O `.out`, esse sim, é oráculo de verdade — e valida o `.hex` de tabela: o trace desmonta cada
instrução executada, então um encoding errado apareceria como mnemônico ou operando errado no
próprio trace. Foi assim que conferimos as duas palavras a palavra.

**Por que `poxim2` e não `poxim1`:** o emulador da unidade 1 não implementa `bnz` (`0x22`) nem
`bni` (`0x24`) — caem no `default`. O da unidade 2 implementa, e produz trace **byte a byte
idêntico** ao do `poxim1` nos programas herdados (conferido em `1_fibonacci` e `1_factorial`).
Usá-lo como gerador não importa nada da unidade 2 para cá.

**`bni` não tem oráculo e não vai ter.** Pôr `IV` exige uma instrução inválida, e uma instrução
inválida joga o emulador de referência num laço que não termina, em vez de levantar a flag. Fica
com teste escrito à mão, como o `ble`.

## Duas revisões do emulador, e qual vale

O emulador público hoje **não é a revisão que gerou estes traces**. Em `1_limits` as duas
divergem, sempre no bit `OV` (`0x10`), a partir do `divi r4, r1, 0`:

| | `divi` com `r1 = 0xFFFFFFFF` |
|---|---|
| `.out` commitado | `FR = 0x00000018` — `OV` preservado, `ZD` posto |
| emulador público hoje | `FR = 0x00000008` — `OV` limpo, `ZD` posto |

A causa está no `setarFR`: a cláusula de `div` testa `if (x < 0 \|\| y < 0)` com `x` e `y`
`uint32_t`, comparação que **nunca é verdadeira**. A revisão pública sempre cai no `else` e limpa
`OV`. A revisão que gerou o trace commitado evidentemente tinha os operandos com sinal, onde
`0xFFFFFFFF` é `-1` e a condição vale — o que explica o `OV` posto exatamente ali.

Nenhuma das duas é defensável como semântica: "dividir com operando negativo é overflow" não está
no ISA. Qual delas o GOLEM implementa está decidido em [`../../docs/ISA.md`](../../../docs/ISA.md),
na seção de divergências deliberadas — não aqui.

Os outros quatro programas herdados batem byte a byte com o emulador público, tirando uma linha
em branco final que três deles têm e o emulador não gera. Os arquivos ficam como estão: fixture
não se reformata.

## Cobertura, e onde ela não alcança

Os cinco herdados exercitam 7 dos 11 branches. Com `gen_blt` e `gen_bnz` são 9. `ble` e `bni` seguem
sem oráculo — um diff verde não significa emulador correto, e o `ble` quebrado da referência é a
prova de que isso acontece na prática. Tabela completa em
[`../../docs/ISA.md`](../../../docs/ISA.md).

## A unidade 3, estacionada sem consumidor

Os arquivos `3_*_cache.out` e o programa `3_memory_access` (`.s`/`.hex`/`.out`) **não têm
consumidor neste repo**, e isso é o ponto. O oráculo é perecível: os emuladores de referência são
C de 2017, e cada ano que passa torna "pôr esse programa para compilar" menos provável. A v3 vai
precisar deles e a v3 ainda não tem PRD — então ficam guardados agora, enquanto a janela está
aberta.

Os `_cache.out` são os programas das unidades 1 e 2 **reexecutados pelo emulador da unidade 3**,
que anota acerto e erro de cache por acesso. O `3_memory_access` é o programa novo da unidade 3,
escrito para bater na hierarquia de memória de propósito.

Nada aqui é lido por teste nenhum hoje. Um fixture sem teste normalmente é lixo — este é uma
aposta deliberada e datada, e é por isso que está escrita.

## Regenerando um trace

O emulador de referência é trabalho próprio da disciplina e vive em
[andraderaul/projeto-de-arquitetura-de-computadores](https://github.com/andraderaul/projeto-de-arquitetura-de-computadores)
(`poxim1` é o da unidade 1). Ele ignora `argv` e lê `input.hex` fixo, do diretório corrente:

```bash
git clone https://github.com/andraderaul/projeto-de-arquitetura-de-computadores ref
cc -w -o poxim1 ref/rauloliveiradeandrade_201500307353_poxim1.c -lm
cp 1_fibonacci.hex input.hex && ./poxim1   # escreve output.txt
```

O `poxim1` **ignora `argv`** e lê `input.hex` fixo do diretório corrente. O `poxim2` não — esse
recebe entrada e saída como argumentos, e é o que dá para usar em programa com `bnz`/`bni`:

```bash
cc -w -o poxim2 ref/rauloliveiradeandrade_201500307353_poxim2.c -lm
./poxim2 gen_blt.hex gen_blt.out
```

Rode programa novo **com limite de tempo**. Instrução inválida põe o `poxim2` num laço que não
termina, cuspindo `nop` em `stdout` sem parar — foi assim que a tentativa de fabricar oráculo de
`bni` encheu o disco antes de ser morta.

O `poxim3`, da unidade 3, é o que anota cache. Os `_cache.out` já vinham gerados junto do material
de referência, com a mesma data dos demais (2017-05-05), e foram **copiados como estão** — nenhum
byte destes arquivos passou por ferramenta nossa, e é assim que devem ficar (fixture não se
regenera com a ferramenta que ele testa).

**A janela está aberta, e isso foi verificado, não assumido (2026-07-20).** O
`rauloliveiradeandrade_201500307353_poxim3.c` compila limpo hoje (`clang -O2 -lm`, um único warning
inócuo de `abs` sobre `uint32_t`), e o caminho de fabricação foi exercido ponta a ponta:
`3_memory_access.hex` reexecutado pelo binário reproduz o `3_memory_access_cache.out` commitado
**byte a byte**, exceto pela linha em branco final que o emulador não emite — a mesma divergência
já documentada nos herdados. A aposta da seção acima deixa de ser aposta: quando a v3 precisar de
trace de cache novo, o oráculo responde.

Enquanto esse binário compilar, dá para **fabricar oráculo novo**: escrever um programa que
exercite um branch sem cobertura, rodar por ele e guardar o `.out`. Os pares `.s`/`.hex`, não —
o `.hex` veio do assembler do professor, e regenerá-lo exigiria montar com o nosso, que é o que
o fixture testa.

# Proveniência dos fixtures

Os cinco programas aqui são **material de referência da disciplina de Arquitetura de
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

Cada um em três formas, que dão **dois oráculos independentes**:

| extensão | é | oráculo de |
|---|---|---|
| `.s` | fonte assembly com labels | entrada do assembler |
| `.hex` | palavras montadas | **saída esperada do assembler** |
| `.out` | trace de execução | **saída esperada da máquina** |

## Cobertura, e onde ela não alcança

Estes cinco exercitam 7 dos 11 branches. `blt`, `ble`, `bnz` e `bni` **não são executados por
nenhum deles** — um diff verde contra estes traces não significa emulador correto, e o `ble`
quebrado da referência é a prova de que isso acontece na prática. Tabela completa em
[`../../docs/ISA.md`](../../../docs/ISA.md).

## Regenerando um trace

O emulador de referência é trabalho próprio da disciplina e vive em
[andraderaul/projeto-de-arquitetura-de-computadores](https://github.com/andraderaul/projeto-de-arquitetura-de-computadores)
(`poxim1` é o da unidade 1). Ele ignora `argv` e lê `input.hex` fixo, do diretório corrente:

```bash
git clone https://github.com/andraderaul/projeto-de-arquitetura-de-computadores ref
cc -w -o poxim1 ref/rauloliveiradeandrade_201500307353_poxim1.c -lm
cp 1_fibonacci.hex input.hex && ./poxim1   # escreve output.txt
```

Enquanto esse binário compilar, dá para **fabricar oráculo novo**: escrever um programa que
exercite um branch sem cobertura, rodar por ele e guardar o `.out`. Os pares `.s`/`.hex`, não —
o `.hex` veio do assembler do professor, e regenerá-lo exigiria montar com o nosso, que é o que
o fixture testa.

# GOLEM — Instruction Set Architecture

Especificação da máquina de 32 bits do GOLEM//Console: encoding, registradores, as 42 instruções
e a sintaxe do assembler. É a fonte da verdade do assembler e dos testes.

O ISA é herdado bit a bit do **Poxim**, arquitetura didática da disciplina de Arquitetura de
Computadores (UFS, 2017) — ver [ADR 0019](../../../docs/adr/0019-golem-isa-inherited-from-poxim.md)
para o porquê. Este documento foi reescrito a partir do material de referência, não copiado dele.

> **Estado:** derivado do emulador de referência e das fixtures `.s`/`.hex`/`.out`, com os pontos
> ambíguos verificados por execução. Os itens marcados **⚠ a confirmar** ainda não foram checados
> contra os slides.

---

## Modelo de máquina

**Palavra:** 32 bits. **Endereçamento:** byte, mas as instruções e `ldw`/`stw` operam em palavras —
o endereço de palavra é deslocado com `<< 2` para virar endereço de byte. Essa distinção é a
principal fonte de confusão do ISA e aparece em quase toda instrução de memória.

**Registradores de uso geral:** `R0`–`R31`. **`R0` é forçado a zero a cada ciclo** — escritas nele
são silenciosamente descartadas. (Não é um bug: é o mesmo contrato de MIPS.)

**Registradores especiais**, endereçados pelos índices 32+ nos mesmos campos de registrador:

| índice | nome | papel |
|---|---|---|
| 32 | `PC` | program counter, em endereço de byte |
| 33 | `IR` | instruction register — a palavra em execução |
| 34 | `ER` | extension register — parte alta de `mul`, resto de `div`, overflow de shift |
| 35 | `FR` | flags |
| 36 | `CR` | cause register — motivo da interrupção |
| 37 | `IPC` | PC salvo no atendimento da interrupção |

**Flags (`FR`):**

| bit | nome | posto por |
|---|---|---|
| `0x01` | `EQ` | `cmp`/`cmpi`, quando iguais |
| `0x02` | `LT` | `cmp`/`cmpi`, quando menor |
| `0x04` | `GT` | `cmp`/`cmpi`, quando maior |
| `0x08` | `ZD` | divisão por zero |
| `0x10` | `OV` | overflow aritmético |
| `0x20` | `IV` | instrução inválida |

`cmp`/`cmpi` limpam os três bits de comparação antes de escrever (`FR &= ~0x07`).

**Terminal:** dispositivo de saída mapeado no endereço de **byte** `0x0000888B`. Escrever nele com
`stb` emite um caractere. É a única saída da máquina na unidade 1.

---

## Encoding

Todas as instruções têm 32 bits, com o opcode nos 6 bits altos. Três formatos:

```
        31    26 25                                            0
       ┌────────┬───────────────────────────────────────────────┐
tipo U │ opcode │  …  │ z (14–10) │ x (9–5) │ y (4–0)           │   registrador ⊕ registrador
       ├────────┼───────────────────────────────────────────────┤
tipo F │ opcode │      im16 (25–10)        │ x (9–5) │ y (4–0)  │   registrador ⊕ imediato
       ├────────┼───────────────────────────────────────────────┤
tipo S │ opcode │              im26 (25–0)                      │   salto / interrupção
       └────────┴───────────────────────────────────────────────┘
```

| campo | bits | largura |
|---|---|---|
| `opcode` | 31–26 | 6 |
| `im26` | 25–0 | 26 |
| `im16` | 25–10 | 16 |
| `z` | 14–10 | 5 |
| `x` | 9–5 | 5 |
| `y` | 4–0 | 5 |

`z` e `im16` se sobrepõem: `z` só é lido no tipo U, `im16` só no tipo F. No tipo U os bits 25–15
não são usados.

> **⚠ Armadilha de ordem dos operandos.** No tipo U, **`z` é o destino** — `add rz, rx, ry`. Não é
> a ordem dos campos no encoding, e não é a ordem que o nome das funções do emulador de referência
> sugere. Errar isso produz um programa que monta sem erro e roda errado.

---

## Instruções

`Rz`, `Rx`, `Ry` denotam o registrador de cada campo — inclusive os especiais, quando o índice é
≥ 32. `N` é um imediato.

### Aritméticas

| op | mnemônico | alias | forma | semântica |
|---|---|---|---|---|
| `0x00` | `add` | — | U | `Rz = Rx + Ry`; afeta `OV` |
| `0x01` | `addi` | — | F | `Rx = Ry + N`; afeta `OV` |
| `0x02` | `sub` | — | U | `Rz = Rx − Ry`; afeta `OV` |
| `0x03` | `subi` | — | F | `Rx = Ry − N`; afeta `OV` |
| `0x04` | `mul` | — | U | `Rz = Rx × Ry`, parte alta em `ER`; afeta `OV` |
| `0x05` | `muli` | — | F | `Rx = Ry × N`, parte alta em `ER`; afeta `OV` |
| `0x06` | `div` | — | U | `Rz = Rx ÷ Ry`, resto em `ER`; afeta `ZD` — ver "Divergências" |
| `0x07` | `divi` | — | F | `Rx = Ry ÷ N`, resto em `ER`; afeta `ZD` — ver "Divergências" |
| `0x08` | `cmp` | — | U | compara `Rx` e `Ry`; só escreve `FR` |
| `0x09` | `cmpi` | — | F | compara `Rx` e `N`; só escreve `FR` |

`add` com todos os campos zero (a palavra `0x00000000`) é **`nop`**.

### Lógicas e deslocamentos

| op | mnemônico | alias | forma | semântica |
|---|---|---|---|---|
| `0x0A` | `shl` | `lsl` | U | `Rz = Rx << (N+1)`, bits que saem em `ER` |
| `0x0B` | `shr` | `lsr` | U | `Rz = (ER:Rx) >> (N+1)` |
| `0x0C` | `and` | — | U | `Rz = Rx & Ry` |
| `0x0D` | `andi` | — | F | `Rx = Ry & N` |
| `0x0E` | `not` | — | U | `Rx = ~Ry` |
| `0x0F` | `noti` | — | F | `Rx = ~N` |
| `0x10` | `or` | — | U | `Rz = Rx \| Ry` |
| `0x11` | `ori` | — | F | `Rx = Ry \| N` |
| `0x12` | `xor` | — | U | `Rz = Rx ^ Ry` |
| `0x13` | `xori` | — | F | `Rx = Ry ^ N` |

> **⚠ O deslocamento é `N+1`, não `N`.** `shl rz, rx, 0` desloca **uma** posição. Não existe
> deslocamento de zero. O assembler codifica o literal escrito; quem soma 1 é a execução.

### Memória

| op | mnemônico | alias | forma | semântica |
|---|---|---|---|---|
| `0x14` | `ldw` | `load` | F | `Rx = MEM[(Ry + N) << 2]` — palavra |
| `0x15` | `ldb` | `loadb` | F | `Rx = MEM[Ry + N]` — byte |
| `0x16` | `stw` | `store` | F | `MEM[(Rx + N) << 2] = Ry` — palavra |
| `0x17` | `stb` | `storeb` | F | `MEM[Rx + N] = Ry` — byte |
| `0x18` | `push` | — | U | `MEM[Rx--] = Ry` |
| `0x19` | `pop` | — | U | `Rx = MEM[++Ry]` |

Note a **assimetria de operandos**: em `ldw`/`ldb` o destino vem primeiro (`ldw rx, ry, N`), em
`stw`/`stb` o imediato fica no meio (`stw rx, N, ry`). É herdado, e é fácil de trocar por engano.

### Controle de fluxo

Todos os saltos são tipo S e recebem um endereço de **palavra** em `im26`; o `PC` recebe
`im26 << 2`.

| op | mnemônico | alias | condição |
|---|---|---|---|
| `0x1A` | `bun` | `jmp` | incondicional |
| `0x1B` | `beq` | `jeq` | `EQ` |
| `0x1C` | `blt` | `jlt` | `LT` |
| `0x1D` | `bgt` | `jgt` | `GT` |
| `0x1E` | `bne` | `jne` | `~EQ` |
| `0x1F` | `ble` | `jle` | `LT ∨ EQ` — ver "Divergências deliberadas" |
| `0x20` | `bge` | `jge` | `GT ∨ EQ` |
| `0x21` | `bzd` | `jzd` | `ZD` |
| `0x22` | `bnz` | `jnz` | `~ZD` |
| `0x23` | `biv` | `jiv` | `IV` |
| `0x24` | `bni` | `jni` | `~IV` |

| op | mnemônico | alias | forma | semântica |
|---|---|---|---|---|
| `0x25` | `call` | — | F | `Rx = (PC + 4) >> 2`; `PC = (Ry + N) << 2` |
| `0x26` | `ret` | — | F | `PC = Rx << 2` |
| `0x27` | `isr` | — | F | `Rx = IPC >> 2`; `Ry = CR` |
| `0x28` | `reti` | — | F | `PC = Rx << 2` |
| `0x3F` | `int` | `halt` | S | interrupção de software; `int 0` encerra a simulação |

`call` guarda o endereço de retorno como **índice de palavra**, e é por isso que `ret` faz `<< 2`.

---

## Layout de memória e vetor de interrupção

As quatro primeiras palavras são um vetor posicional. Todo programa começa com elas, mesmo na
unidade 1, onde só a primeira faz algo:

| palavra | endereço | papel |
|---|---|---|
| 0 | `0x00` | entrada — tipicamente `call r0, r0, main` |
| 1 | `0x04` | handler de interrupção de hardware 1 |
| 2 | `0x08` | handler de interrupção de hardware 2 |
| 3 | `0x0C` | handler de interrupção de software |

Nas unidades 1 os três handlers são `nop`.

---

## Sintaxe do assembler

A sintaxe vem das fixtures `.s` de referência — não é invenção nossa.

```asm
// comentário até o fim da linha
init:
	call r0, r0, main
hw1:
	nop
hw2:
	nop
sw:
	nop

main:
	// labels aninhados são labels normais; a indentação é estética
	loop_condition:
		cmpi r1, 64
		bge loop_end
	loop_statements:
		addi r1, r1, 1
		bun loop_condition
	loop_end:
	int 0

// dados: uma palavra por linha, decimal, hex ou string
size:
	10
terminal:
	0x0000888B
message:
	"Hello from GOLEM\n"
```

**Regras:**

- **Comentários** com `//`, até o fim da linha.
- **Labels** terminam em `:`, sozinhos na linha ou não. A indentação não tem significado.
- **Um label vale o índice de palavra** onde ele aparece — não o endereço de byte. Por isso o
  idioma `addi r3, r0, message` seguido de `shl r3, r3, 2` para obter o endereço de byte.
- **Dados** são escritos nus, uma palavra por linha: decimal (`10`), hex (`0x0000888B`) ou string
  entre aspas. Strings são empacotadas em bytes, aceitam escapes (`\n`) e são terminadas em `NUL`.
- **`nop`** é pseudo-instrução para a palavra `0x00000000`.
- **Aliases** (coluna *alias* acima) são aceitos em qualquer lugar do mnemônico canônico. As
  fixtures usam os canônicos e devem continuar montando sem alteração.

---

## Divergências deliberadas da referência

O emulador em C é o oráculo de teste, mas não é infalível. Onde ele está errado, o GOLEM diverge —
e a divergência fica registrada aqui.

### `ble` — o GOLEM implementa a versão correta

A referência testa `(FR & 0x02) == 0x20`, condição que nunca é verdadeira. Na prática o `ble` dela
só desvia em `EQ`, nunca em `LT`. Não é uma peculiaridade da arquitetura: é um typo (`0x20` no
lugar de `0x02`), e o comentário na própria linha declara a intenção certa, `//LT v EQ`.

**O GOLEM implementa `ble` como `LT ∨ EQ`.** Replicar o bug envenenaria todo programa novo escrito
na máquina — um `ble` que não desvia em "menor" é uma armadilha, não um contrato.

**Nenhuma fixture é afetada:** `ble` não aparece em nenhum `.s`, `.asm` ou `.out` de referência.
Divergir aqui não custa cobertura de oráculo alguma. Essa ausência é também a causa do bug — o
`ble` nunca foi exercitado, então nada o pegou.

### `div`/`divi` — o GOLEM não mexe em `OV`

As duas revisões do emulador de referência discordam aqui, e a divergência é visível em
`1_limits`: o `.out` commitado preserva `OV` através do `divi` (`FR = 0x18`), o emulador público
de hoje limpa (`FR = 0x08`).

A causa é uma cláusula morta no `setarFR`: `if (x < 0 || y < 0)` com `x` e `y` `uint32_t` nunca é
verdadeira, então a revisão pública sempre cai no `else` e limpa `OV`. A revisão que gerou o trace
commitado tinha operandos com sinal, onde `0xFFFFFFFF` é `-1` e a condição vale.

**O GOLEM implementa `div`/`divi` como: põe `ZD` na divisão por zero, e não toca em `OV`.** Bate
com o `.out` commitado — que é o oráculo que este repo versiona — sem importar a regra que estaria
por trás dele. "Dividir com operando negativo é overflow" não está no ISA, não é semântica que
alguém escrevendo programa aqui deva aprender, e replicá-la seria o mesmo erro que replicar o
`ble` quebrado.

Os outros quatro programas herdados batem com as duas revisões: nenhum deles tem `OV` posto na
hora de dividir. Detalhes em `src/golem/__fixtures__/PROVENANCE.md`.

### Outros achados, sem impacto

- **`bge` está certo por acidente**, escrito com um literal octal (`00000004`) que calha de valer 4.
  Funciona; não imite a grafia.
- **`bne` está certo, mas invertido** — desvia no `else` de um teste de `EQ`. Semântica correta.
- **`poxim1` ignora `argv`** e lê `input.hex` fixo. Afeta como rodar o oráculo, não a semântica.

---

## Onde o oráculo não protege

As fixtures herdadas exercitam 7 dos 11 branches. `2_blt` e `2_bnz`, fabricados em #135 enquanto o
emulador de referência ainda compila, levam a 9:

| branch | cobertura |
|---|---|
| `ble`, `bni` | **nenhuma** — só teste escrito à mão |
| `blt`, `bnz` | fixture gerada (`2_blt`, `2_bnz`), as duas direções |
| `bzd`, `biv` | 1 uso cada |
| `beq`, `bgt` | 3 usos cada |
| `bge` | 4 usos |
| `bne` | 7 usos |
| `bun` | 21 usos |

Sobram dois sem oráculo, cada um por um motivo diferente:

- **`ble`** — o emulador de referência está errado ali (typo `0x20`/`0x02`) e o GOLEM diverge de
  propósito, então não existe oráculo a favor da versão certa.
- **`bni`** — pôr `IV` exige instrução inválida, e instrução inválida joga o emulador de
  referência num laço que não termina em vez de levantar a flag. Não dá para fabricar.

Esses dois precisam de **teste escrito à mão**, e o `ble` quebrado é a prova de que fazem falta:
ele sobreviveu justamente porque nada o exercitava. Leitura não é teste.

A mesma lógica vale além dos branches: qualquer instrução ausente das fixtures está fora do
alcance do oráculo, e vale conferir a cobertura antes de confiar num diff verde.

---

## Fixtures

Em `Arquitetura de Computadores/Exemplo de Projeto/` (local, nunca versionado — ver ADR 0019).
Cada programa vem em quatro formas, o que dá dois oráculos:

| arquivo | é |
|---|---|
| `.s` | fonte assembly com labels — entrada do **assembler** |
| `.hex` | palavras montadas — saída esperada do assembler, entrada do emulador |
| `.asm` | listing com endereços resolvidos |
| `.out` | trace de execução — saída esperada do **emulador** |

Cobertura relevante para a unidade 1: `1_fibonacci`, `1_factorial`, `1_recursive_factorial`,
`1_recursive_fibonacci`, `1_limits`.

Para regerar um trace de referência:

```bash
cc -w -o poxim1 rauloliveiradeandrade_201500307353_poxim1.c -lm
cp 1_fibonacci.hex input.hex && ./poxim1   # escreve output.txt
```

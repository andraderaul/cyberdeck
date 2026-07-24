# GOLEM//Console

Um *fantasy computer* client-side: uma máquina hipotética de 32 bits que roda no browser,
operada por linha de comando, com o estado interno — registradores, memória, Terminal —
visível ao vivo enquanto executa. Voltada para quem quer **ver a máquina pensar**: o valor
está em assistir o PC descer pelo código, não em obter o resultado. Programa do deck
**CYBERDECK** (ver `CONTEXT-MAP.md`).

O ISA deriva do **Poxim**, arquitetura didática da disciplina de Arquitetura de Computadores
(UFS, 2017) — ver ADR 0019. O nome GOLEM descreve o modelo: a máquina executa a palavra
escrita nela, literalmente e sem julgamento, e não sabe parar sozinha.

## Os três estados

Um programa atravessa três formas, e confundi-las é a origem do bug mais fácil de cometer
aqui — um editor que diverge da máquina em execução:

`Source (texto) → [assembler] → Image (palavras) → [load] → Machine (estado vivo)`

O **Source** só é editável enquanto **não há Machine**. Assim que uma Image é carregada, o
editor trava; `reset` destrói a Machine e devolve a edição. A divergência é impossível por
construção, não por sincronização.

## Language

**Source**:
O texto assembly que o usuário escreve. Editável apenas quando não existe uma Machine.
_Avoid_: código, programa (ambíguo — pode ser qualquer um dos três estados), script

**Image**:
O `Uint32Array` que o assembler produziu a partir de um Source — imutável, e o que a Machine
realmente executa. Não guarda vínculo com o texto que a originou.
_Avoid_: binário, build, bytecode, .hex (é o *formato de arquivo* de uma Image exportada)

**Machine**:
O estado vivo de uma execução: registradores, memória, PC, flags e o conteúdo do Terminal.
Só existe depois que uma Image é carregada; `reset` a destrói.
_Avoid_: VM, emulador (é o *código* que roda a Machine, não o estado), CPU, runtime

**Terminal**:
O dispositivo de saída *dentro* da máquina, mapeado em memória em `0x0000888B` — o que o
programa escreve, um byte por vez, com `stb`. Diegético: existe no mundo simulado.
_Avoid_: output, console (é o oposto — o Console está fora da máquina), stdout

**Console**:
A linha de comando *fora* da máquina, de onde o operador a dirige (`run`, `break`, `reg`).
É a única gramática de controle do programa (ADR 0018). Não-diegético.
_Avoid_: shell (já significa a camada impura do código no vocabulário do deck), REPL
(não avalia expressões — emite comandos), prompt, terminal

**Step**:
O avanço de exatamente uma instrução: `step(machine) → machine`, função pura. Não conhece
tempo nem DOM — quem tem tempo é o Console, que chama `step` N vezes por frame. O Step é a
unidade de tempo da máquina: os dispositivos (watchdog, FPU) avançam um tick por Step, em
lockstep com a execução — herdado do laço do emulador de referência.
_Avoid_: tick, cycle (um ciclo de clock não é uma instrução; uma operação de FPU custa N ciclos,
todos consumidos um por Step), instruction

**Device**:
Hardware mapeado em memória, fora da CPU mas dentro da máquina: Terminal, Watchdog, FPU.
Um Device avança um tick por Step, em lockstep com a execução, e o programa fala com ele
por loads/stores em endereços fixos — nunca pelo Console.
_Avoid_: periférico (sugere algo plugável; estes são parte da máquina), I/O

**Watchdog**:
O Device que decrementa um contador a cada Step e dispara a interrupção de hardware 1 ao
zerar. O programa o arma escrevendo contagem + bit de enable no registrador mapeado. Na
ficção do GOLEM: a inscrição que desliga o golem que não sabe parar sozinho.
_Avoid_: timer (genérico — este existe para matar, não para medir)

**FPU**:
O Device de ponto flutuante: registradores mapeados x, y, z e control. Uma operação custa
N ciclos (consumidos um por Step) e sinaliza conclusão pela interrupção de hardware 2 — o
programa espera, não bloqueia. Quirk didático herdado do Poxim (ADR 0019).
_Avoid_: coprocessador (correto mas não usado), float unit

**Interrupção**:
O desvio de controle que a máquina toma sozinha: o PC salta para o vetor (`0x04`–`0x0C`),
`CR` recebe a causa e `IPC` guarda o PC interrompido. Três origens: hardware 1 (Watchdog),
hardware 2 (FPU), software (`int N`, divisão por zero, instrução inválida — exige IE ligado
no `FR`). O Console narra cada despacho; o despacho em si é da Machine.
_Avoid_: exceção, trap, IRQ (jargão de outras arquiteturas)

**ISR**:
A rotina *do programa* que atende uma interrupção — código do usuário nos vetores, não da
máquina. `isr` lê `IPC`/`CR` e salta; `reti` retorna. Uma ISR é linha como outra qualquer:
breakpoint funciona nela sem gramática nova.
_Avoid_: handler (aceitável em prosa, mas ISR é o termo do material de referência)

**Clock**:
A taxa em que o Console dirige `step` durante um `run` — `clock 4` para assistir, `clock max`
para velocidade. É propriedade da apresentação, não da Machine.
_Avoid_: speed, fps, frequência

**Alias**:
Um mnemônico alternativo aceito pelo assembler para uma instrução (`jmp` para `bun`). Os
mnemônicos herdados do Poxim continuam canônicos; os aliases existem para legibilidade sem
quebrar as fixtures de referência (ADR 0019).
_Avoid_: sinônimo, macro (é outra coisa — ver Macro; um alias é 1:1)

**Macro**:
Um mnemônico que o assembler expande para mais de uma instrução, herdado do material de
referência: `enai rX` vira duas palavras (carrega máscara no scratch `rX`, liga o bit IE no
`FR`). É a única macro; existe porque os Sources de referência a usam, não por conveniência.
_Avoid_: pseudo-instrução (mesmo conceito, nome mais longo), alias (1:1, não expande)

**Cache**:
A lente que classifica cada acesso à memória como Hit ou Miss e conta a razão entre eles —
herdada da unidade 3 do Poxim (ADR 0023). *Não é um Device*: o programa não a endereça, não
fala com ela, e ela **nunca serve valor** — o valor vem sempre da memória, que é sempre a
verdade; a Cache só rotula o acesso. Harvard: uma para instrução (o fetch), uma para dado
(`ldw`/`stw`/`ldb`/`stb`). 8 Lines × 2 Sets, bloco de 4 words, substituição LRU. Só existe com
o modo ligado (`cache on`), fixado na criação da Machine — nunca no meio de um `run`.
_Avoid_: memória rápida (não serve dado — mente sobre o que ela é), buffer, Device (o programa não a toca)

**Line / Set**:
O índice derivado do endereço (8 Lines) e as duas vias associativas dentro de uma Line (2 Sets).
Um acesso mapeia para uma Line; o classificador procura o bloco nos dois Sets dela e, no Miss,
despeja o Set mais velho.
_Avoid_: via/way (Set é o termo do material), linha de cache (ambíguo com linha de código-fonte)

**Hit / Miss**:
O veredito do classificador num acesso: Hit se o bloco está num Set da Line, Miss caso contrário.
O par é a unidade de observação da v3; o boletim narrado no fim do `run` conta os dois por Cache.
_Avoid_: acerto/erro isolados (o par é o termo), falta (ambíguo)

**AGE / Tag**:
Os dois campos que o classificador guarda por Set. **Tag** é o identificador de bloco comparado
no teste de Hit — e, quirk herdado, o teste compara *também o dado*, então uma escrita que muda
a memória sem atualizar o Set faz a próxima leitura virar Miss (ADR 0023). **AGE** é o contador
LRU: zera quando o Set é referenciado, incrementa nos válidos a cada acesso; o mais velho é a
vítima do despejo. O AGE é o que o trace imprime e o que o holofote do painel anima.
_Avoid_: id (Tag é o nome do material), LRU (é a *política*; AGE é o *mecanismo* visível)

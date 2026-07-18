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
tempo nem DOM — quem tem tempo é o Console, que chama `step` N vezes por frame.
_Avoid_: tick, cycle (um ciclo de clock não é uma instrução), instruction

**Clock**:
A taxa em que o Console dirige `step` durante um `run` — `clock 4` para assistir, `clock max`
para velocidade. É propriedade da apresentação, não da Machine.
_Avoid_: speed, fps, frequência

**Alias**:
Um mnemônico alternativo aceito pelo assembler para uma instrução (`jmp` para `bun`). Os
mnemônicos herdados do Poxim continuam canônicos; os aliases existem para legibilidade sem
quebrar as fixtures de referência (ADR 0019).
_Avoid_: sinônimo, macro (uma macro expandiria para várias instruções — um alias é 1:1)

// Startup
init:
	call r0, r0, main
// HW1 ISR
hw1:
	nop
// HW2 ISR
hw2:
	nop
// Software ISR
sw:
	nop
// Terminal message procedure
terminal_message:
	// Setting terminal address
	ldw r2, r0, terminal
	// Outputting message
	addi r3, r0, message
	shl r3, r3, 2
	loop0_condition:
		ldb r4, r3, 0
		cmpi r4, 0
		beq loop0_end
	loop0_statements:
		stb r2, 0, r4
		addi r3, r3, 1
		bun loop0_condition
	loop0_end:
	// Output information
	addi r3, r0, information
	shl r3, r3, 2
	loop1_condition:
		ldb r4, r3, 0
		cmpi r4, 0
		beq loop1_end
	loop1_statements:
		stb r2, 0, r4
		addi r3, r3, 1
		bun loop1_condition
	loop1_end:
	// Outputting ASCII symbols
	loop2_init:
		addi r3, r0, 33
	loop2_condition:
		cmpi r3, 127
		bge loop2_end
	loop2_statements:
		stb r2, 0, r3
        ldb r4, r2, 0
        cmp r3, r4
        bne loop2_condition
        addi r3, r3, 1
		bun loop2_condition
	loop2_end:
		ret r1
// Main
main:
	call r1, r0, terminal_message
	int 0
// Terminal address
terminal:
	0x0000888B
// Hello world message
message:
	"Hello World from Poxim Processor!\n"
// Informative message
information:
	"Outputting ASCII symbols from 33 to 126:\n"


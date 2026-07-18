init:	
	call r0, r0, main
	nop
	nop
	nop
fibonacci:
	addi r4, r0, 0
	addi r5, r0, 0
	addi r6, r0, 1
	loop_init:
		addi r4, r0, 1
	loop_condition:
		cmp r4, r2
		bge loop_end
	loop_statements:
		add r7, r1, r4
		add r8, r5, r6
		addi r6, r5, 0
		addi r5, r8, 0
		stw r7, 0, r8
		addi r4, r4, 1
		bun loop_condition
	loop_end:
		ret r3
main:
	addi r1, r0, vector
	ldw r2, r0, size
	call r3, r0, fibonacci
	int 0
size:
	10
vector:
	0
	0
	0
	0
	0
	0
	0
	0
	0
	0


init:	
	call r0, r0, main
	nop
	nop
	nop
fibonacci:
	base_case:
		cmpi r2, 1
		add r4, r1, r2
		bgt recursion
		stw r4, 0, r2
		add r3, r2, r0
		bun return
	recursion:
		ldw r5, r4, 0
		cmpi r5, 0
		bne return
		push r31, r30
		push r31, r2
		subi r2, r2, 2
		call r30, r0, fibonacci
		pop r2, r31
		push r31, r2
		subi r2, r2, 1
		call r30, r0, fibonacci
		pop r2, r31
		pop r30, r31
		add r4, r1, r2
		subi r4, r4, 2
		ldw r5, r4, 0
		addi r4, r4, 1
		ldw r6, r4, 0
		add r3, r5, r6
		addi r4, r4, 1
		stw r4, 0, r3
	return:
		ret r30
main:
	addi r1, r0, V
	addi r2, r0, 11
	ldw r3, r0, r
	addi r31, r0, stack
	addi r31, r31, 19
	call r30, r0, fibonacci
	stw r0, r, r3
	int 0
r:
	0
V:
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
	0
	0
stack:
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


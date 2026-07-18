init:	
	call r0, r0, main
	nop
	nop
	nop
factorial:
	base_case:
		cmpi r1, 0
		bne recursion
		addi r2, r0, 1
		bun return
	recursion:
		push r3, r4
		push r3, r1
		subi r1, r1, 1
		call r4, r0, factorial
		pop r1, r3
		mul r2, r2, r1
		pop r4, r3
	return:
		ret r4
main:
	addi r1, r0, 10
	ldw r2, r0, r
	addi r3, r0, stack
	addi r3, r3, 20
	call r4, r0, factorial
	stw r0, r, r2
	int 0
r:
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
	0

init:	
	bun main
	nop
	nop
	nop
main:
	ldw r1, r0, r
	ldw r2, r0, n
	loop_init:
		addi r3, r0, 1
	loop_condition:
		cmp r3, r2
		bgt loop_end
	loop_statements:
		mul r1, r1, r3
		addi r3, r3, 1
		bun loop_condition
	loop_end:
		stw r0, r, r1
	int 0
r:
	1
n:
	10

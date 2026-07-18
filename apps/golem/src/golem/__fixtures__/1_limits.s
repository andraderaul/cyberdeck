init:	
	bun main
	nop
	nop
	nop
main:
	ldw r1, r0, n
	ldw r2, r0, A
	ldw r3, r0, B
	addi r4, r1, 2
	divi r4, r1, 0
    cmp pc, pc
	cmpi r4, 0
	cmpi r4, 1
	cmpi r4, 2
	shl r0, r1, 48
	shl r2, r2, 16
    shl r3, r3, 8
	shr r3, r3, 24
	addi r5, r0, C
	shl r5, r5, 2
	ldb r6, r5, 0
	ldb r7, r5, 2
	stb r5, 0, r7
	stb r5, 2, r6
	muli r10, r1, 11
    add r31, r0, fr
	int 0
n:
	0xFFFFFFFF
A:
	0x0000AAAA
B:
	0xBBBB0000
C:
	0x41424300
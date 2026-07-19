// Generated fixture — exercises blt in both directions, which no inherited program does.
// r11 and r12 are reached only if blt branches and falls through correctly; r10 and r13 stay
// zero unless a branch goes the wrong way. See PROVENANCE.md.
init:
	bun main
	nop
	nop
	nop
main:
	addi r1, r0, 1
	addi r2, r0, 2
	cmp r1, r2
	blt taken
	addi r10, r0, 99
taken:
	addi r11, r0, 1
	cmp r2, r1
	blt not_taken
	addi r12, r0, 1
	bun done
not_taken:
	addi r13, r0, 99
done:
	int 0

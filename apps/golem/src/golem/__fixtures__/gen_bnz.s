// Generated fixture — exercises bnz in both directions, which no inherited program does.
// Nothing overflows before the divides, so the two reference revisions that disagree about
// div's effect on OV produce an identical trace here. See PROVENANCE.md.
init:
	bun main
	nop
	nop
	nop
main:
	addi r1, r0, 10
	divi r3, r1, 2
	bnz ok
	addi r10, r0, 99
ok:
	addi r11, r0, 1
	divi r4, r1, 0
	bnz bad
	addi r12, r0, 1
	bun done
bad:
	addi r13, r0, 99
done:
	int 0

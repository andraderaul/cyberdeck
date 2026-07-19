init:	
	call r0, r0, main
hw1:
	int 0
hw2:
	int 0
sw:
	isr r31, r30, isr_sw
isr_sw:
	if_condition:
        bzd zero_division
        biv invalid_instruction
        bun system_call
        zero_division:
            addi r21, r0, 0xFFFF
            shl r21, r21, 16
            addi r21, r21, 0xFFF7
            and fr, fr, r21
            push r29, r31
            int 1
            pop r31, r29
            bun return
        invalid_instruction:
            addi r21, r0, 0xFFFF
            shl r21, r21, 16
            addi r21, r21, 0xFF5F
            and fr, fr, r21
            push r29, r31
            int 3
            pop r31, r29
            bun return
        system_call:
            case_1:
                cmpi r30, 1
                bne case_2
                addi r2, r2, 1
                bun return
            case_2:
                cmpi r30, 2
                bne case_3
                addi r2, r2, 2
                bun return
            case_3:
                cmpi r30, 3
                bne return
                addi r2, r2, 4
	return:
		ret r31
main:
    addi r29, r0, stack
    addi r29, r29, 1
    enai r1
    addi r1, r0, 32
    div r1, r1, r0
    int 2
    0xBADA55E5
    int 0
stack:
    0
    0


// Startup
init:
	call r0, r0, main
// HW1 ISR
hw1:
    int 0
// HW2 ISR
hw2:
	isr r31, r30, fpu_isr
// Software ISR
sw:
	int 0
// FPU ISR
fpu_isr:
    cmp r30, r0
    ldw r9, r4, 0
    andi r9, r9, 0x0020
    cmp r9, r0
    ldw r8, r3, 0
    addi r10, r0, 1
    reti r31
// FPU wait
wait:
    waiting:
        cmpi r10, 0
        beq waiting
    addi r10, r0, 0
    ret r29
main:
    // Enable interruption
    enai r1
    // Setting pointers
    ldw r1, r0, x
    ldw r2, r0, y
    ldw r3, r0, z
    ldw r4, r0, control
    // Undefined operation (control = 15)
    addi r7, r0, 15
    stw r4, 0, r7
    call r29, r0, wait
    // x = 74, y = 8, z = x / y (control = 4)
    addi r5, r0, 74
    stw r1, 0, r5
    addi r6, r0, 8
    stw r2, 0, r6
    addi r7, r0, 4
    stw r4, 0, r7
    call r29, r0, wait
    // x = 74, y = 8, x = z (control = 5)
    addi r7, r0, 5
    stw r4, 0, r7
    call r29, r0, wait
    // x = 9.25
    ldw r8, r1, 0
    // x = 9.25, y = 2, z = x * y (control = 3)
    addi r6, r0, 2
    stw r2, 0, r6
    addi r7, r0, 3
    stw r4, 0, r7
    call r29, r0, wait
    // z = 18.5, z = ||z|| (control = 9)
    addi r7, r0, 9
    stw r4, 0, r7
    call r29, r0, wait
    // Software interruption
    int 44739242
x:
	0x00002200
y:
	0x00002201
z:
	0x00002202
control:
	0x00002203


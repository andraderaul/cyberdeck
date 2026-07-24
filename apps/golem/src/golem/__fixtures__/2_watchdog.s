// Startup
init:
	call r0, r0, main
// HW1 ISR
hw1:
	isr r31, r30, watchdog
// HW2 ISR
hw2:
	int 0
// Software ISR
sw:
	int 0
// Watchdog ISR
watchdog:
	int 100
// Main
main:
	enai r1
    ldw r1, r0, control
    addi r1, r0, 100
    addi r2, r0, 1
    shl r2, r2, 31
    or r1, r1, r2
    ldw r2, r0, control
    stw r2, 0, r1
    forever_loop:
        bun forever_loop
	int 0
control:
    0x00002020


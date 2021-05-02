#define NOP     0x00

#define LDA_Z   0x10
#define LDA_I   0x11
#define LDA     0x12

#define STA_Z   0x20
#define STA     0x22

#define ADD     0x30
#define SUB     0x31

#define JMZ     0x40
#define JMP     0x41
#define JSR     0x42
#define RET     0x43

#define FETCH (heap[state->pc++])
#define STORE(v, addr) heap[addr] = v

#define STATE_START 1  // compiler doesn't like writes to address zero
#define STACK_START 1024 // *relative* to HEAP_START
#define HEAP_START 1024

#define GET_STATE state_t *state = (state_t *)STATE_START
#define GET_HEAP u8 *heap = (u8 *)HEAP_START

#define u8 unsigned char
#define u32 unsigned int

typedef struct {
  u32 pc;
  u32 stack;
  u8 acc;
  u8 flags;
} state_t;

#define EXPORT __attribute__((visibility("default")))

EXPORT
int heap_start() {
  return HEAP_START;
}

EXPORT
u32 pc() {
  GET_STATE;
  return state->pc;
}


EXPORT
void init() {
  GET_STATE;
  state->stack = STACK_START;
  state->flags = 0;
  state->acc = 0;
  state->pc = 0;
}

EXPORT
void steps(u32 n) {
  GET_STATE;
  GET_HEAP;
  for (u32 i = 0; i < n; i++) {
	 switch (FETCH) {
	 case LDA_Z: state->acc = heap[FETCH]; break;
	 case LDA_I: state->acc = FETCH; break;
	 case LDA: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		state->acc = heap[(addr_H << 8) + addr_L];
		break;
	 }
	 case STA_Z: STORE(state->acc, FETCH); break;
	 case STA: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		STORE(state->acc, (addr_H << 8) + addr_L);
		break;
	 }
	 case JMP: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		state->pc = (addr_H << 8) + addr_L;
	 }
	 default: break;
	 }
  }
}

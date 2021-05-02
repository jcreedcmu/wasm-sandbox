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

#define FETCH (state->heap[state->pc++])

#define STATE_START 1  // compiler doesn't like writes to address zero
#define STACK_START 2048
#define HEAP_START 1024

#define GET_STATE state_t *state = (state_t *)STATE_START

#define u8 unsigned char
#define u32 unsigned int

typedef struct {
  u32 pc;
  u8 *heap;
  u8 *stack;
  u8 acc;
  u8 flags;
} state_t;

#define EXPORT __attribute__((visibility("default")))

EXPORT
int stack_start() {
  return STACK_START;
}

EXPORT
int heap_start() {
  return HEAP_START;
}

EXPORT
void init() {
  GET_STATE;
  state->heap = (u8 *)HEAP_START;
  state->stack = (u8 *)STACK_START;
  state->flags = 0;
  state->acc = 0;
  state->pc = 0;
}

EXPORT
void steps(u32 n) {
  GET_STATE;
  for (u32 i = 0; i < n; i++) {
	 switch (FETCH) {
	 case LDA_Z: state->acc = state->heap[FETCH]; break;
	 case LDA_I: state->acc = FETCH; break;
	 case LDA: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		state->acc = state->heap[(addr_H << 8) + addr_L];
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

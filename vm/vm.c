#define NOP     0x00

#define LDA_Z   0x10
#define LDA_I   0x11
#define LDA     0x12

#define STA_Z   0x20
#define STA     0x22

#define ADD     0x30
#define SUB     0x31
#define ADD_I   0x32

#define JMZ     0x40
#define JMP     0x41
#define JSR     0x42
#define RET     0x43
#define JMN     0x44

#define FETCH (heap[state->pc++])
#define STORE(v, addr) heap[addr] = v

#define STATE_START 1  // compiler doesn't like writes to address zero
#define STACK_START 1024 // *relative* to HEAP_START
#define HEAP_START 1024

#define GET_STATE state_t *state = (state_t *)STATE_START
#define GET_HEAP u8 *heap = (u8 *)HEAP_START

#define u8 unsigned char
#define u32 unsigned int

#define FLAG_CARRY 1
#define FLAG_ZERO  2
#define FLAG_NEG   4

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

inline void set_flags(state_t *state) {
}

EXPORT
void steps(u32 n) {
  GET_STATE;
  GET_HEAP;
  for (u32 i = 0; i < n; i++) {
	 u8 set_carry = state->flags & FLAG_CARRY;

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
	 case ADD: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		u32 sum = state->acc + heap[(addr_H << 8) + addr_L] + (state->flags & FLAG_CARRY);
		state->acc = sum & 0xff;
		set_carry = !!(sum & 0x100);
		break;
	 }
	 case SUB: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		u32 sum = state->acc - heap[(addr_H << 8) + addr_L] - (state->flags & FLAG_CARRY);
		state->acc = sum & 0xff; // XXX not sure this carry computation is right?
		set_carry = !!(sum & 0x100);
		break;
	 }
	 case ADD_I: {
		u32 sum = state->acc + FETCH + (state->flags & FLAG_CARRY);
		state->acc = sum & 0xff;
		set_carry = !!(sum & 0x100);
		break;
	 }
	 case JMZ: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		if (state->flags & FLAG_ZERO)
		  state->pc = (addr_H << 8) + addr_L;
		break;
	 }
	 case JMP: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		state->pc = (addr_H << 8) + addr_L;
		break;
	 }
	 case JSR: {
		break;
	 }
	 case RET: {
		break;
	 }
	 case JMN: {
		u8 addr_L = FETCH;
		u8 addr_H = FETCH;
		if (state->flags & FLAG_NEG)
		  state->pc = (addr_H << 8) + addr_L;
		break;
	 }
	 default: break;
	 }

	 state->flags =
		(state->acc == 0 ? FLAG_ZERO : 0) |
		(state->acc >= 128 ? FLAG_NEG : 0) |
		(set_carry ? FLAG_CARRY : 0);
  }
}

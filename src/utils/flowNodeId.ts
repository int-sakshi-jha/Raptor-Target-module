/** Stable-enough client ids for React Flow when `crypto.randomUUID` is unavailable. */
let _seq = 0;
export function newFlowNodeId(): string {
  _seq += 1;
  return `n-${Date.now()}-${_seq}`;
}

export type MoveDirection = -1 | 1;

export function moveItem<T>(
  items: readonly T[],
  index: number,
  direction: MoveDirection,
): T[] {
  const target = index + direction;
  const next = [...items];
  if (
    index < 0 ||
    index >= next.length ||
    target < 0 ||
    target >= next.length
  ) {
    return next;
  }
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

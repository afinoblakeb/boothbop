export function mediaRenderKey(
  revision: number,
  kind: string,
  choices: unknown,
  extra = "",
): string {
  return JSON.stringify([revision, kind, choices, extra]);
}

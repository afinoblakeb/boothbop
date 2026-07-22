export function onceAfterSuccess(
  task: () => Promise<void>,
): () => Promise<void> {
  let completed = false;
  let pending: Promise<void> | undefined;

  return () => {
    if (completed) return Promise.resolve();
    if (pending) return pending;

    pending = task()
      .then(() => {
        completed = true;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

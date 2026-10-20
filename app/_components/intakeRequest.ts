/** Request lifetime only: no case state, persistence, or completion decisions. */
export class IntakeRequest {
  private active: AbortController | null = null;

  get pending() { return this.active !== null; }

  cancel() {
    this.active?.abort();
    this.active = null;
  }

  async run<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs = 290_000): Promise<T | undefined> {
    if (this.active) return undefined;
    const controller = new AbortController();
    this.active = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error("The request was interrupted. Your answers are still here; please try again."));
      controller.signal.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(() => controller.abort(), timeoutMs);
    });
    try {
      return await Promise.race([work(controller.signal), interrupted]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", onAbort);
      if (this.active === controller) this.active = null;
    }
  }
}

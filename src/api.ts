// Bridge tipado para llamar a los handlers IPC desde React

declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

export async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return window.api.invoke(channel, ...args) as Promise<T>
}

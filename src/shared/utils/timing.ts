type VoidFn = () => void

export function debounce(fn: VoidFn, wait: number) {
  let timer: number | null = null

  return () => {
    if (timer !== null)
      window.clearTimeout(timer)

    timer = window.setTimeout(() => {
      timer = null
      fn()
    }, wait)
  }
}

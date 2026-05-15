function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

//function waitRandom(min: number, max: number): Promise<void> {
//  return wait(min + Math.round(Math.random() * Math.max(0, max - min)))
//}

/**
 * This error is thrown if the function is cancelled before completing
 */
export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
  }
}

/**
 * Throw this error if the function should retry
 */
export class RetryableError extends Error {}

/**
 * Retries the function that returns the promise until the promise successfully resolves up to n retries
 * @param fn function to retry
 * @param n how many times to retry
 * @param minWait min wait between retries in ms
 * @param maxWait max wait between retries in ms
 */
export function retry<T>(
  fn: () => Promise<T>,
  {
    n,
    minWait,
    maxWait,
    exponentialBackoff = false
  }: {
    n: number
    minWait: number
    maxWait: number
    exponentialBackoff?: boolean
  }
): { promise: Promise<T>; cancel: () => void } {
  let completed = false
  let rejectCancelled: (error: Error) => void
  const promise = new Promise<T>(async (resolve, reject) => {
    rejectCancelled = reject
    let attempt = 0
    let delay = minWait

    while (attempt < n && !completed) {
      try {
        const result = await fn()
        if (!completed) {
          resolve(result)
          completed = true
        }
      } catch (error) {
        if (completed) break
        if (!(error instanceof RetryableError)) {
          reject(error)
          completed = true
          break
        }

        // Exponential backoff logic (optional)
        if (exponentialBackoff) {
          delay = Math.min(maxWait, delay * 2) // Double the delay but cap at maxWait
        } else {
          delay = Math.min(maxWait, delay + Math.random() * (maxWait - minWait))
        }

        attempt++
        if (attempt >= n) {
          reject(error)
          completed = true
          break
        }

        await wait(delay)
      }
    }
  })

  return {
    promise,
    cancel: () => {
      if (completed) return
      completed = true
      rejectCancelled(new CancelledError())
    }
  }
}

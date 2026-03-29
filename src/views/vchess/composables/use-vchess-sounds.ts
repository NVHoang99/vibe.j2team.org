import { useEventListener } from '@vueuse/core'
import captureUrl from '../assets/sounds/capture.wav'
import moveUrl from '../assets/sounds/move.wav'

/**
 * Âm nước đi: Web Audio API (buffer + AudioContext).
 * `HTMLAudioElement.play()` sau `await` dài (AI suy nghĩ) thường bị autoplay chặn
 * vì user activation hết — cách này vẫn phát được sau worker trả nước.
 */
export function useVchessSounds() {
  let ctx: AudioContext | null = null
  let moveBuffer: AudioBuffer | null = null
  let captureBuffer: AudioBuffer | null = null
  let decodeOnce: Promise<void> | null = null

  function getContext(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext()
    }
    return ctx
  }

  async function ensureDecoded(): Promise<void> {
    if (moveBuffer && captureBuffer) return
    if (!decodeOnce) {
      decodeOnce = (async () => {
        const c = getContext()
        const [mr, cr] = await Promise.all([fetch(moveUrl), fetch(captureUrl)])
        const [mab, cab] = await Promise.all([mr.arrayBuffer(), cr.arrayBuffer()])
        moveBuffer = await c.decodeAudioData(mab.slice(0))
        captureBuffer = await c.decodeAudioData(cab.slice(0))
      })()
    }
    await decodeOnce
  }

  if (typeof window !== 'undefined') {
    useEventListener(
      window,
      'pointerdown',
      () => {
        void ensureDecoded().then(() => {
          void getContext().resume()
        })
      },
      { passive: true, once: true },
    )
  }

  function playForMoveType(type: 'move' | 'capture' | 'flip') {
    void (async () => {
      try {
        await ensureDecoded()
        const c = getContext()
        const buffer = type === 'capture' ? captureBuffer : moveBuffer
        if (!buffer) return
        await c.resume()
        const src = c.createBufferSource()
        src.buffer = buffer
        src.connect(c.destination)
        src.start()
      } catch {
        /* decode / autoplay */
      }
    })()
  }

  return { playForMoveType }
}

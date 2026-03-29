import {
  BOARD_COLS,
  BOARD_ROWS,
  cloneState,
  getAllLegalMoves,
  getGameStatus,
  getLegalCaptures,
  isInCheck,
  movesEqual,
  popMove,
  tryPushMove,
  type Move,
  type Piece,
  type VChessState,
} from './vchess-engine'
import { positionalDifferenceRedMinusBlack } from './vchess-pst'
import { computeHash } from './vchess-zobrist'

/** Theo `rules.md` — tốt = 100; vua không tính vật chất. */
export function getMaterialValue(piece: Piece): number {
  switch (piece.kind) {
    case 'rook':
      return 600
    case 'assassin':
      return 450
    case 'elephant':
      return 340
    case 'knight':
      return 320
    case 'gunner':
      return 230
    case 'pawn':
      return 100
    case 'eagle':
      return 100
    case 'king':
      return 0
  }
}

/** Chênh lệch vật chất: dương = Đỏ hơn (theo điểm tĩnh). */
export function materialDifferenceRedMinusBlack(state: VChessState): number {
  let sum = 0
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = state.board[row]?.[col]
      if (!piece || piece.kind === 'king') continue
      const v = getMaterialValue(piece)
      sum += piece.side === 'red' ? v : -v
    }
  }
  return sum
}

function evaluateForSideToMove(state: VChessState): number {
  const diff = materialDifferenceRedMinusBlack(state) + positionalDifferenceRedMinusBlack(state)
  return state.turn === 'red' ? diff : -diff
}

const MATE_SCORE = 50_000

export const AI_MAX_PLY = 8

export const AI_SEARCH_MS_MIN = 8_000
export const AI_MAX_SEARCH_MS = 15_000

export function randomAiSearchBudgetMs(): number {
  const span = AI_MAX_SEARCH_MS - AI_SEARCH_MS_MIN + 1
  return AI_SEARCH_MS_MIN + Math.floor(Math.random() * span)
}

const TIME_CHECK_INTERVAL = 2047

const SQ = BOARD_ROWS * BOARD_COLS

interface SearchContext {
  deadline: number
  nodes: number
}

function isOutOfTime(ctx: SearchContext): boolean {
  ctx.nodes++
  if ((ctx.nodes & TIME_CHECK_INTERVAL) !== 0) return false
  return Date.now() >= ctx.deadline
}

/** --- Transposition table --- */
const TT_SIZE = 1 << 16
const ttHash = new BigUint64Array(TT_SIZE)
const ttDepth = new Int16Array(TT_SIZE)
const ttScore = new Int32Array(TT_SIZE)
/** 1 = exact, 2 = lower bound, 3 = upper bound */
const ttFlag = new Uint8Array(TT_SIZE)
const ttBestFromR = new Int8Array(TT_SIZE)
const ttBestFromC = new Int8Array(TT_SIZE)
const ttBestToR = new Int8Array(TT_SIZE)
const ttBestToC = new Int8Array(TT_SIZE)
const ttBestType = new Uint8Array(TT_SIZE)
const ttCapR = new Int8Array(TT_SIZE)
const ttCapC = new Int8Array(TT_SIZE)

function ttClear(): void {
  ttDepth.fill(-1)
}

function encodeMoveToTT(m: Move, idx: number): void {
  ttBestFromR[idx] = m.from.row
  ttBestFromC[idx] = m.from.col
  ttBestToR[idx] = m.to.row
  ttBestToC[idx] = m.to.col
  ttBestType[idx] = m.type === 'capture' ? 1 : m.type === 'flip' ? 2 : 0
  if (m.type === 'capture' && m.captureSquare) {
    ttCapR[idx] = m.captureSquare.row
    ttCapC[idx] = m.captureSquare.col
  } else {
    ttCapR[idx] = -1
    ttCapC[idx] = -1
  }
}

function decodeMoveFromTT(idx: number): Move | null {
  if (ttDepth[idx]! < 0) return null
  const tr = ttBestType[idx]!
  const type: Move['type'] = tr === 1 ? 'capture' : tr === 2 ? 'flip' : 'move'
  const from = { row: ttBestFromR[idx]!, col: ttBestFromC[idx]! }
  const to = { row: ttBestToR[idx]!, col: ttBestToC[idx]! }
  if (type === 'capture' && ttCapR[idx]! >= 0) {
    return { from, to, type, captureSquare: { row: ttCapR[idx]!, col: ttCapC[idx]! } }
  }
  return { from, to, type }
}

function ttReadIndex(hash: bigint): number {
  return Number(hash % BigInt(TT_SIZE))
}

function ttProbe(
  hash: bigint,
  depth: number,
  alpha: number,
  beta: number,
): { score: number; move: Move | null } | null {
  const idx = ttReadIndex(hash)
  if (ttDepth[idx]! < 0 || ttHash[idx] !== hash) return null
  if (ttDepth[idx]! < depth) return null

  const score = ttScore[idx]!
  const flag = ttFlag[idx]!
  const move = decodeMoveFromTT(idx)

  if (flag === 1) return { score, move }
  if (flag === 2 && score >= beta) return { score, move }
  if (flag === 3 && score <= alpha) return { score, move }
  return null
}

function ttGetBestMove(hash: bigint): Move | null {
  const idx = ttReadIndex(hash)
  if (ttDepth[idx]! < 0 || ttHash[idx] !== hash) return null
  return decodeMoveFromTT(idx)
}

function ttStore(
  hash: bigint,
  depth: number,
  score: number,
  flag: 1 | 2 | 3,
  best: Move | null,
): void {
  const idx = ttReadIndex(hash)
  const oldD = ttDepth[idx]!
  if (oldD >= 0 && ttHash[idx] === hash && oldD > depth) return

  ttHash[idx] = hash
  ttDepth[idx] = depth
  ttScore[idx] = score
  ttFlag[idx] = flag
  if (best) encodeMoveToTT(best, idx)
}

/** --- Killers & history --- */
const MAX_PLY_ARR = 64
const killers: [Move | null, Move | null][] = Array.from({ length: MAX_PLY_ARR }, () => [
  null,
  null,
])
const history = new Uint32Array(SQ * SQ)

function squareIndex(row: number, col: number): number {
  return row * BOARD_COLS + col
}

function histIdx(from: { row: number; col: number }, to: { row: number; col: number }): number {
  return squareIndex(from.row, from.col) * SQ + squareIndex(to.row, to.col)
}

function clearKillersAndHistory(): void {
  for (let i = 0; i < MAX_PLY_ARR; i++) {
    killers[i]![0] = null
    killers[i]![1] = null
  }
  history.fill(0)
}

function mvvLva(state: VChessState, move: Move): number {
  if (move.type !== 'capture' || !move.captureSquare) return 0
  const victim = state.board[move.captureSquare.row]?.[move.captureSquare.col]
  const attacker = state.board[move.from.row]?.[move.from.col]
  if (!victim || !attacker) return 0
  return 1000 * getMaterialValue(victim) - getMaterialValue(attacker)
}

function scoreMove(
  state: VChessState,
  move: Move,
  ttMove: Move | null,
  pvMove: Move | null,
  k0: Move | null,
  k1: Move | null,
): number {
  if (ttMove && movesEqual(move, ttMove)) return 10_000_000
  if (pvMove && movesEqual(move, pvMove)) return 5_000_000
  if (move.type === 'capture') return 2_000_000 + mvvLva(state, move)
  if (k0 && movesEqual(move, k0)) return 1_500_000
  if (k1 && movesEqual(move, k1)) return 1_400_000
  return history[histIdx(move.from, move.to)]!
}

function sortMoves(
  state: VChessState,
  moves: Move[],
  ttMove: Move | null,
  pvMove: Move | null,
  ply: number,
): Move[] {
  const k = killers[ply]!
  return [...moves].sort(
    (a, b) =>
      scoreMove(state, b, ttMove, pvMove, k[0], k[1]) -
      scoreMove(state, a, ttMove, pvMove, k[0], k[1]),
  )
}

const NULL_MIN_DEPTH = 3
const NULL_R = 2
const MAX_Q_PLY = 12

function pushNullMove(state: VChessState): void {
  state.turn = state.turn === 'red' ? 'black' : 'red'
}

function popNullMove(state: VChessState): void {
  state.turn = state.turn === 'red' ? 'black' : 'red'
}

function quiescence(
  state: VChessState,
  alpha: number,
  beta: number,
  ply: number,
  ctx: SearchContext,
): number | null {
  if (isOutOfTime(ctx)) return null
  if (ply > MAX_Q_PLY) return evaluateForSideToMove(state)

  const inCheck = isInCheck(state, state.turn)

  if (!inCheck) {
    const standPat = evaluateForSideToMove(state)
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  }

  const status = getGameStatus(state)
  if (status === 'checkmate') return -MATE_SCORE + ply
  if (status === 'stalemate') return 0

  const moves = inCheck ? getAllLegalMoves(state) : getLegalCaptures(state)
  if (moves.length === 0) return alpha

  const ordered = sortMoves(state, moves, null, null, ply)

  for (const move of ordered) {
    if (!tryPushMove(state, move)) continue
    const child = quiescence(state, -beta, -alpha, ply + 1, ctx)
    popMove(state)
    if (child === null) return null
    const score = -child
    if (score >= beta) return beta
    if (score > alpha) alpha = score
  }
  return alpha
}

function negamax(
  state: VChessState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: SearchContext,
  allowNull: boolean,
): number | null {
  if (isOutOfTime(ctx)) return null

  const hash = computeHash(state)

  const ttHit = ttProbe(hash, depth, alpha, beta)
  if (ttHit) {
    return ttHit.score
  }

  const ttMove = ttGetBestMove(hash)

  const status = getGameStatus(state)
  if (status === 'checkmate') return -MATE_SCORE + ply
  if (status === 'stalemate') return 0

  const inCheck = isInCheck(state, state.turn)
  let eDepth = depth
  if (inCheck) eDepth += 1

  if (eDepth <= 0) {
    return quiescence(state, alpha, beta, ply, ctx)
  }

  if (allowNull && !inCheck && depth >= NULL_MIN_DEPTH && eDepth > NULL_R + 1) {
    pushNullMove(state)
    const nullChild = negamax(state, eDepth - 1 - NULL_R, -beta, -alpha, ply + 1, ctx, false)
    popNullMove(state)
    if (nullChild === null) return null
    if (-nullChild >= beta) return beta
  }

  const moves = getAllLegalMoves(state)
  if (moves.length === 0) return -MATE_SCORE + ply

  const ordered = sortMoves(state, moves, ttMove, null, ply)

  let best: Move | null = null
  let bestScore = -Number.MAX_SAFE_INTEGER
  const oldAlpha = alpha

  for (let i = 0; i < ordered.length; i++) {
    const move = ordered[i]!
    if (!tryPushMove(state, move)) continue

    const oppInCheck = isInCheck(state, state.turn)
    let reduction = 0
    if (i > 3 && eDepth > 2 && move.type !== 'capture' && !inCheck && !oppInCheck) {
      reduction = 1
    }

    let childScore: number | null
    if (i === 0) {
      childScore = negamax(state, eDepth - 1 - reduction, -beta, -alpha, ply + 1, ctx, true)
    } else {
      childScore = negamax(state, eDepth - 1 - reduction, -alpha - 1, -alpha, ply + 1, ctx, true)
      if (childScore !== null) {
        const sc = -childScore
        if (sc > alpha && sc < beta) {
          childScore = negamax(state, eDepth - 1, -beta, -alpha, ply + 1, ctx, true)
        }
      }
    }

    popMove(state)
    if (childScore === null) return null

    const s = -childScore
    if (s > bestScore) {
      bestScore = s
      best = move
    }
    if (s > alpha) alpha = s
    if (alpha >= beta) {
      if (move.type !== 'capture') {
        const ks = killers[ply]!
        ks[1] = ks[0]
        ks[0] = move
        const hi = histIdx(move.from, move.to)
        history[hi] = Math.min(history[hi]! + depth * depth, 1_000_000_000)
      }
      ttStore(hash, depth, beta, 2, move)
      return beta
    }
  }

  let flag: 1 | 2 | 3 = 1
  if (bestScore <= oldAlpha) flag = 3
  else if (bestScore >= beta) flag = 2

  ttStore(hash, depth, bestScore, flag, best)
  return bestScore
}

export interface SearchResult {
  move: Move
  score: number
  depthCompleted: number
}

export function findBestMoveSync(state: VChessState, budgetMs: number): SearchResult | null {
  const root = cloneState(state)
  const moves = getAllLegalMoves(root)
  if (moves.length === 0) return null

  const start = Date.now()
  const deadline = start + Math.max(1, Math.floor(budgetMs))
  let bestSoFar: SearchResult | null = null
  let pvMove: Move | null = null

  ttClear()
  clearKillersAndHistory()

  for (let depth = 1; depth <= AI_MAX_PLY; depth++) {
    if (Date.now() >= deadline) break

    let bestMove: Move | null = null
    let bestScore = -Number.MAX_SAFE_INTEGER
    let alpha = -Number.MAX_SAFE_INTEGER
    const beta = Number.MAX_SAFE_INTEGER

    const ctx: SearchContext = { deadline, nodes: 0 }

    const ordered = sortMoves(root, moves, null, pvMove, 0)

    for (const move of ordered) {
      if (Date.now() >= deadline) {
        bestMove = null
        break
      }

      if (!tryPushMove(root, move)) continue
      const child = negamax(root, depth - 1, -beta, -alpha, 1, ctx, true)
      popMove(root)
      if (child === null) {
        bestMove = null
        break
      }
      const score = -child
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
      alpha = Math.max(alpha, score)
    }

    if (bestMove !== null) {
      pvMove = bestMove
      bestSoFar = { move: bestMove, score: bestScore, depthCompleted: depth }
    } else {
      break
    }
  }

  return bestSoFar
}

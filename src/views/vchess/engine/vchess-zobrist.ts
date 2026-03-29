/**
 * Zobrist hashing cho vChess — dùng transposition table.
 */

import { BOARD_COLS, BOARD_ROWS, type Piece, type VChessState } from './vchess-engine'

const SQ = BOARD_ROWS * BOARD_COLS

/** Mã hóa loại quân (kèm phe) để tra bảng ngẫu nhiên — tối đa ~20 biến thể. */
function pieceVariantIndex(p: Piece): number {
  const sideOff = p.side === 'red' ? 0 : 9
  switch (p.kind) {
    case 'rook':
      return sideOff + 0
    case 'knight':
      return sideOff + 1
    case 'elephant':
      return sideOff + 2
    case 'gunner':
      return sideOff + 3
    case 'king':
      return sideOff + 4
    case 'pawn':
      return sideOff + 5
    case 'assassin':
      return sideOff + 6
    case 'eagle':
      return sideOff + 7 + (p.eagleMode === 'flying' ? 1 : 0)
  }
}

const NUM_PIECE_KEYS = 20

function splitmix64(x: bigint): bigint {
  let z = (x + 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n)
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & ((1n << 64n) - 1n)
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & ((1n << 64n) - 1n)
  return z ^ (z >> 31n)
}

function makeSeeded(seed: bigint): () => bigint {
  let s = seed
  return () => {
    s = splitmix64(s)
    return s
  }
}

/** Bảng khóa (64-bit) — khởi tạo một lần. */
const rnd = makeSeeded(0x564348455353n)

const zobristPiece: bigint[][] = Array.from({ length: SQ }, () =>
  Array.from({ length: NUM_PIECE_KEYS }, () => rnd()),
)

const zobristSideToMove: bigint = rnd()
const zobristKingTwoRed: bigint = rnd()
const zobristKingTwoBlack: bigint = rnd()

function squareIndex(row: number, col: number): number {
  return row * BOARD_COLS + col
}

/** Hash 64-bit đầy đủ cho vị trí (dùng cho TT). */
export function computeHash(state: VChessState): bigint {
  let h = 0n
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = state.board[row]?.[col]
      if (!piece) continue
      const si = squareIndex(row, col)
      const pi = pieceVariantIndex(piece)
      const rowKeys = zobristPiece[si]
      if (rowKeys) {
        const k = rowKeys[pi]
        if (k !== undefined) h ^= k
      }
    }
  }
  if (state.turn === 'red') h ^= zobristSideToMove
  if (state.kingTwoStepAvailable.red) h ^= zobristKingTwoRed
  if (state.kingTwoStepAvailable.black) h ^= zobristKingTwoBlack
  return h
}

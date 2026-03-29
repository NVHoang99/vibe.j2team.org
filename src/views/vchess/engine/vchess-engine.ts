export const BOARD_ROWS = 11
export const BOARD_COLS = 9

export type Side = 'red' | 'black'
export type PieceKind =
  | 'rook'
  | 'knight'
  | 'elephant'
  | 'gunner'
  | 'king'
  | 'pawn'
  | 'assassin'
  | 'eagle'
export type EagleMode = 'ground' | 'flying'

export interface Piece {
  side: Side
  kind: PieceKind
  eagleMode?: EagleMode
}

export interface Position {
  row: number
  col: number
}

export interface Move {
  from: Position
  to: Position
  type: 'move' | 'capture' | 'flip'
  captureSquare?: Position
}

export interface MoveRecord {
  move: Move
  movedPiece: Piece
  capturedPiece: Piece | null
  /** Snapshot trước khi đi nước — cần để `popMove` khôi phục chính xác (vua hai ô). */
  kingTwoStepAvailableBefore: Record<Side, boolean>
}

export interface VChessState {
  board: (Piece | null)[][]
  turn: Side
  kingTwoStepAvailable: Record<Side, boolean>
  history: MoveRecord[]
}

const FILES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const RANKS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const

const ORTHOGONAL_DIRECTIONS: Position[] = [
  { row: 1, col: 0 },
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: -1 },
]

const KING_DIRECTIONS: Position[] = [
  { row: 1, col: 0 },
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: -1 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
  { row: -1, col: 1 },
  { row: -1, col: -1 },
]

const KNIGHT_RULES = [
  {
    leg: { row: 1, col: 0 },
    targets: [
      { row: 2, col: 1 },
      { row: 2, col: -1 },
    ],
  },
  {
    leg: { row: -1, col: 0 },
    targets: [
      { row: -2, col: 1 },
      { row: -2, col: -1 },
    ],
  },
  {
    leg: { row: 0, col: 1 },
    targets: [
      { row: 1, col: 2 },
      { row: -1, col: 2 },
    ],
  },
  {
    leg: { row: 0, col: -1 },
    targets: [
      { row: 1, col: -2 },
      { row: -1, col: -2 },
    ],
  },
]

const EMPTY_BOARD = () =>
  Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null as Piece | null),
  )

function clonePiece(piece: Piece): Piece {
  return piece.eagleMode ? { ...piece, eagleMode: piece.eagleMode } : { ...piece }
}

function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((piece) => (piece ? clonePiece(piece) : null)))
}

function clonePosition(position: Position): Position {
  return { row: position.row, col: position.col }
}

function createMajorRow(side: Side): Piece[] {
  return [
    { side, kind: 'rook' },
    { side, kind: 'knight' },
    { side, kind: 'elephant' },
    { side, kind: 'eagle', eagleMode: 'ground' },
    { side, kind: 'king' },
    { side, kind: 'eagle', eagleMode: 'ground' },
    { side, kind: 'elephant' },
    { side, kind: 'knight' },
    { side, kind: 'rook' },
  ]
}

export function createInitialState(): VChessState {
  const board = EMPTY_BOARD()
  const redMajor = createMajorRow('red')
  for (let col = 0; col < BOARD_COLS; col++) {
    const piece = redMajor[col]
    if (piece) setPiece(board, { row: 0, col }, piece)
  }

  setPiece(board, { row: 1, col: 2 }, { side: 'red', kind: 'assassin' })
  setPiece(board, { row: 1, col: 6 }, { side: 'red', kind: 'assassin' })
  setPiece(board, { row: 2, col: 1 }, { side: 'red', kind: 'gunner' })
  setPiece(board, { row: 2, col: 7 }, { side: 'red', kind: 'gunner' })
  setPiece(board, { row: 3, col: 0 }, { side: 'red', kind: 'pawn' })
  setPiece(board, { row: 3, col: 2 }, { side: 'red', kind: 'pawn' })
  setPiece(board, { row: 3, col: 4 }, { side: 'red', kind: 'pawn' })
  setPiece(board, { row: 3, col: 6 }, { side: 'red', kind: 'pawn' })
  setPiece(board, { row: 3, col: 8 }, { side: 'red', kind: 'pawn' })

  const blackMajor = createMajorRow('black')
  for (let col = 0; col < BOARD_COLS; col++) {
    const piece = blackMajor[col]
    if (piece) setPiece(board, { row: 10, col }, piece)
  }

  setPiece(board, { row: 9, col: 2 }, { side: 'black', kind: 'assassin' })
  setPiece(board, { row: 9, col: 6 }, { side: 'black', kind: 'assassin' })
  setPiece(board, { row: 8, col: 1 }, { side: 'black', kind: 'gunner' })
  setPiece(board, { row: 8, col: 7 }, { side: 'black', kind: 'gunner' })
  setPiece(board, { row: 7, col: 0 }, { side: 'black', kind: 'pawn' })
  setPiece(board, { row: 7, col: 2 }, { side: 'black', kind: 'pawn' })
  setPiece(board, { row: 7, col: 4 }, { side: 'black', kind: 'pawn' })
  setPiece(board, { row: 7, col: 6 }, { side: 'black', kind: 'pawn' })
  setPiece(board, { row: 7, col: 8 }, { side: 'black', kind: 'pawn' })

  return {
    board,
    turn: 'red',
    kingTwoStepAvailable: {
      red: true,
      black: true,
    },
    history: [],
  }
}

export function cloneState(state: VChessState): VChessState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    kingTwoStepAvailable: {
      red: state.kingTwoStepAvailable.red,
      black: state.kingTwoStepAvailable.black,
    },
    history: state.history.map((record) => ({
      move: {
        from: clonePosition(record.move.from),
        to: clonePosition(record.move.to),
        type: record.move.type,
        captureSquare: record.move.captureSquare
          ? clonePosition(record.move.captureSquare)
          : undefined,
      },
      movedPiece: clonePiece(record.movedPiece),
      capturedPiece: record.capturedPiece ? clonePiece(record.capturedPiece) : null,
      kingTwoStepAvailableBefore: {
        red: record.kingTwoStepAvailableBefore.red,
        black: record.kingTwoStepAvailableBefore.black,
      },
    })),
  }
}

export function positionToCoordinate(position: Position): string {
  const rank = RANKS[position.row] ?? '?'
  const file = FILES[position.col] ?? '?'
  return `${rank}${file}`
}

/** Ngược `positionToCoordinate` — `a1` … `k9`; không hợp lệ trả `null`. */
export function coordinateToPosition(coord: string): Position | null {
  const c = coord.trim().toLowerCase()
  if (c.length < 2) return null
  const rankChar = c[0]
  const filePart = c.slice(1)
  const row = RANKS.indexOf(rankChar as (typeof RANKS)[number])
  const col = FILES.indexOf(filePart as (typeof FILES)[number])
  if (row < 0 || col < 0) return null
  return { row, col }
}

export function isInsideBoard(position: Position): boolean {
  return (
    position.row >= 0 && position.row < BOARD_ROWS && position.col >= 0 && position.col < BOARD_COLS
  )
}

function getPiece(board: (Piece | null)[][], position: Position): Piece | null {
  if (!isInsideBoard(position)) return null
  const row = board[position.row]
  if (!row) return null
  return row[position.col] ?? null
}

function setPiece(board: (Piece | null)[][], position: Position, piece: Piece | null): void {
  const row = board[position.row]
  if (!row) return
  row[position.col] = piece
}

function forwardDelta(side: Side): number {
  return side === 'red' ? 1 : -1
}

function isAlly(piece: Piece | null, side: Side): boolean {
  return piece !== null && piece.side === side
}

function pushMoveIfValid(
  board: (Piece | null)[][],
  side: Side,
  from: Position,
  to: Position,
  moves: Move[],
): void {
  if (!isInsideBoard(to)) return
  const target = getPiece(board, to)
  if (target === null) {
    moves.push({ from, to, type: 'move' })
    return
  }
  if (target.side !== side) {
    moves.push({ from, to, type: 'capture', captureSquare: clonePosition(to) })
  }
}

function generateRookMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const moves: Move[] = []
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    let step = 1
    while (true) {
      const to = { row: from.row + direction.row * step, col: from.col + direction.col * step }
      if (!isInsideBoard(to)) break
      const target = getPiece(board, to)
      if (target === null) {
        moves.push({ from, to, type: 'move' })
        step++
        continue
      }
      if (target.side !== piece.side) {
        moves.push({ from, to, type: 'capture', captureSquare: clonePosition(to) })
      }
      break
    }
  }
  return moves
}

function generateKnightMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const moves: Move[] = []
  for (const rule of KNIGHT_RULES) {
    const legSquare = { row: from.row + rule.leg.row, col: from.col + rule.leg.col }
    if (!isInsideBoard(legSquare) || getPiece(board, legSquare) !== null) continue
    for (const offset of rule.targets) {
      pushMoveIfValid(
        board,
        piece.side,
        from,
        { row: from.row + offset.row, col: from.col + offset.col },
        moves,
      )
    }
  }
  return moves
}

function getPawnTargets(piece: Piece, from: Position): Position[] {
  const dir = forwardDelta(piece.side)
  return [
    { row: from.row + dir, col: from.col },
    { row: from.row + dir, col: from.col - 1 },
    { row: from.row + dir, col: from.col + 1 },
  ]
}

function getGunnerTargets(piece: Piece, from: Position): Position[] {
  const dir = forwardDelta(piece.side)
  return [
    { row: from.row + dir * 2, col: from.col - 1 },
    { row: from.row + dir * 2, col: from.col },
    { row: from.row + dir * 2, col: from.col + 1 },
  ]
}

function generatePawnMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const moves: Move[] = []
  for (const target of getPawnTargets(piece, from)) {
    pushMoveIfValid(board, piece.side, from, target, moves)
  }
  return moves
}

function generateGunnerMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const front = { row: from.row + forwardDelta(piece.side), col: from.col }
  if (!isInsideBoard(front) || getPiece(board, front) !== null) return []
  const moves: Move[] = []
  for (const target of getGunnerTargets(piece, from)) {
    pushMoveIfValid(board, piece.side, from, target, moves)
  }
  return moves
}

function generateElephantMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const dir = forwardDelta(piece.side)
  const front = { row: from.row + dir, col: from.col }
  const frontPiece = getPiece(board, front)
  const moves: Move[] = []

  if (isAlly(frontPiece, piece.side)) {
    pushMoveIfValid(board, piece.side, from, { row: from.row + dir, col: from.col - 1 }, moves)
    pushMoveIfValid(board, piece.side, from, { row: from.row + dir, col: from.col + 1 }, moves)
    return moves
  }

  for (const target of getPawnTargets(piece, from)) {
    pushMoveIfValid(board, piece.side, from, target, moves)
  }

  if (frontPiece === null) {
    for (const target of getGunnerTargets(piece, from)) {
      pushMoveIfValid(board, piece.side, from, target, moves)
    }
  }

  return moves
}

function generateKingMoves(state: VChessState, piece: Piece, from: Position): Move[] {
  const moves: Move[] = []
  for (const direction of KING_DIRECTIONS) {
    pushMoveIfValid(
      state.board,
      piece.side,
      from,
      { row: from.row + direction.row, col: from.col + direction.col },
      moves,
    )
  }

  if (state.kingTwoStepAvailable[piece.side]) {
    for (const direction of KING_DIRECTIONS) {
      const middle = { row: from.row + direction.row, col: from.col + direction.col }
      const destination = { row: from.row + direction.row * 2, col: from.col + direction.col * 2 }
      if (!isInsideBoard(middle) || !isInsideBoard(destination)) continue
      if (getPiece(state.board, middle) !== null) continue
      pushMoveIfValid(state.board, piece.side, from, destination, moves)
    }
  }

  return moves
}

function generateEagleMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  if (piece.eagleMode === 'flying') {
    const moves: Move[] = []
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (row === from.row && col === from.col) continue
        if (getPiece(board, { row, col }) === null) {
          moves.push({
            from,
            to: { row, col },
            type: 'move',
          })
        }
      }
    }
    return moves
  }

  const dir = forwardDelta(piece.side)
  const moves: Move[] = []
  pushMoveIfValid(board, piece.side, from, { row: from.row + dir, col: from.col - 1 }, moves)
  pushMoveIfValid(board, piece.side, from, { row: from.row + dir, col: from.col + 1 }, moves)
  moves.push({
    from,
    to: clonePosition(from),
    type: 'flip',
  })
  return moves
}

function generateAssassinMoves(board: (Piece | null)[][], piece: Piece, from: Position): Move[] {
  const moves: Move[] = []
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    let step = 1
    let firstOccupied: Position | null = null

    while (true) {
      const current = { row: from.row + direction.row * step, col: from.col + direction.col * step }
      if (!isInsideBoard(current)) break
      if (getPiece(board, current) !== null) {
        firstOccupied = current
        break
      }
      step++
    }

    if (!firstOccupied) continue

    const firstPiece = getPiece(board, firstOccupied)
    if (firstPiece && firstPiece.side === piece.side) {
      let tail = 1
      while (true) {
        const current = {
          row: firstOccupied.row + direction.row * tail,
          col: firstOccupied.col + direction.col * tail,
        }
        if (!isInsideBoard(current)) break
        const target = getPiece(board, current)
        if (target === null) {
          moves.push({ from, to: current, type: 'move' })
          tail++
          continue
        }
        break
      }
      continue
    }

    if (firstPiece && firstPiece.side !== piece.side) {
      const captureSquares: Position[] = []
      let tail = 1
      while (true) {
        const current = {
          row: firstOccupied.row + direction.row * tail,
          col: firstOccupied.col + direction.col * tail,
        }
        if (!isInsideBoard(current)) break
        const target = getPiece(board, current)
        if (target === null) {
          captureSquares.push(current)
          tail++
          continue
        }
        break
      }

      for (const landingSquare of captureSquares) {
        moves.push({
          from,
          to: landingSquare,
          type: 'capture',
          captureSquare: clonePosition(firstOccupied),
        })
      }
    }
  }
  return moves
}

function piecePseudoMoves(state: VChessState, from: Position): Move[] {
  const piece = getPiece(state.board, from)
  if (!piece) return []
  switch (piece.kind) {
    case 'rook':
      return generateRookMoves(state.board, piece, from)
    case 'knight':
      return generateKnightMoves(state.board, piece, from)
    case 'elephant':
      return generateElephantMoves(state.board, piece, from)
    case 'gunner':
      return generateGunnerMoves(state.board, piece, from)
    case 'king':
      return generateKingMoves(state, piece, from)
    case 'pawn':
      return generatePawnMoves(state.board, piece, from)
    case 'assassin':
      return generateAssassinMoves(state.board, piece, from)
    case 'eagle':
      return generateEagleMoves(state.board, piece, from)
    default:
      return []
  }
}

export function findKing(board: (Piece | null)[][], side: Side): Position | null {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = getPiece(board, { row, col })
      if (!piece) continue
      if (piece.kind === 'king' && piece.side === side) {
        return { row, col }
      }
    }
  }
  return null
}

function isRookAttacking(board: (Piece | null)[][], from: Position, to: Position): boolean {
  if (from.row !== to.row && from.col !== to.col) return false
  const rowStep = from.row === to.row ? 0 : from.row < to.row ? 1 : -1
  const colStep = from.col === to.col ? 0 : from.col < to.col ? 1 : -1
  let row = from.row + rowStep
  let col = from.col + colStep
  while (row !== to.row || col !== to.col) {
    if (getPiece(board, { row, col }) !== null) return false
    row += rowStep
    col += colStep
  }
  return true
}

function isKnightAttacking(board: (Piece | null)[][], from: Position, to: Position): boolean {
  for (const rule of KNIGHT_RULES) {
    const legSquare = { row: from.row + rule.leg.row, col: from.col + rule.leg.col }
    if (!isInsideBoard(legSquare) || getPiece(board, legSquare) !== null) continue
    for (const target of rule.targets) {
      if (from.row + target.row === to.row && from.col + target.col === to.col) {
        return true
      }
    }
  }
  return false
}

function isPawnAttacking(piece: Piece, from: Position, to: Position): boolean {
  return getPawnTargets(piece, from).some(
    (target) => target.row === to.row && target.col === to.col,
  )
}

function isGunnerAttacking(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position,
): boolean {
  const front = { row: from.row + forwardDelta(piece.side), col: from.col }
  if (!isInsideBoard(front) || getPiece(board, front) !== null) return false
  return getGunnerTargets(piece, from).some(
    (target) => target.row === to.row && target.col === to.col,
  )
}

function isElephantAttacking(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position,
): boolean {
  const dir = forwardDelta(piece.side)
  const front = { row: from.row + dir, col: from.col }
  const frontPiece = getPiece(board, front)

  if (isAlly(frontPiece, piece.side)) {
    return (
      (to.row === from.row + dir && to.col === from.col - 1) ||
      (to.row === from.row + dir && to.col === from.col + 1)
    )
  }

  if (isPawnAttacking(piece, from, to)) return true
  if (frontPiece === null && isGunnerAttacking(board, piece, from, to)) return true
  return false
}

function isKingAttacking(state: VChessState, piece: Piece, from: Position, to: Position): boolean {
  const rowDiff = Math.abs(from.row - to.row)
  const colDiff = Math.abs(from.col - to.col)
  if (rowDiff <= 1 && colDiff <= 1) return !(rowDiff === 0 && colDiff === 0)

  if (!state.kingTwoStepAvailable[piece.side]) return false
  if (rowDiff > 2 || colDiff > 2) return false
  if (!(rowDiff === 0 || colDiff === 0 || rowDiff === colDiff)) return false
  if (Math.max(rowDiff, colDiff) !== 2) return false

  const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0
  const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0
  const middle = { row: from.row + rowStep, col: from.col + colStep }
  return getPiece(state.board, middle) === null
}

function isEagleAttacking(piece: Piece, from: Position, to: Position): boolean {
  if (piece.eagleMode === 'flying') return false
  const dir = forwardDelta(piece.side)
  return (
    (to.row === from.row + dir && to.col === from.col - 1) ||
    (to.row === from.row + dir && to.col === from.col + 1)
  )
}

function isAssassinAttacking(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position,
): boolean {
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    let step = 1
    while (true) {
      const current = { row: from.row + direction.row * step, col: from.col + direction.col * step }
      if (!isInsideBoard(current)) break
      const blocker = getPiece(board, current)
      if (blocker === null) {
        step++
        continue
      }

      if (blocker.side === piece.side) break
      if (current.row !== to.row || current.col !== to.col) break

      const behind = { row: to.row + direction.row, col: to.col + direction.col }
      return isInsideBoard(behind) && getPiece(board, behind) === null
    }
  }
  return false
}

function isSquareAttacked(state: VChessState, square: Position, bySide: Side): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = getPiece(state.board, { row, col })
      if (!piece || piece.side !== bySide) continue
      const from = { row, col }
      const attacks =
        piece.kind === 'rook'
          ? isRookAttacking(state.board, from, square)
          : piece.kind === 'knight'
            ? isKnightAttacking(state.board, from, square)
            : piece.kind === 'elephant'
              ? isElephantAttacking(state.board, piece, from, square)
              : piece.kind === 'gunner'
                ? isGunnerAttacking(state.board, piece, from, square)
                : piece.kind === 'king'
                  ? isKingAttacking(state, piece, from, square)
                  : piece.kind === 'pawn'
                    ? isPawnAttacking(piece, from, square)
                    : piece.kind === 'assassin'
                      ? isAssassinAttacking(state.board, piece, from, square)
                      : isEagleAttacking(piece, from, square)
      if (attacks) return true
    }
  }
  return false
}

function applyMoveUnsafe(state: VChessState, move: Move): MoveRecord | null {
  const movingPiece = getPiece(state.board, move.from)
  if (!movingPiece) return null
  const movedPieceBefore = clonePiece(movingPiece)
  const kingTwoStepAvailableBefore: Record<Side, boolean> = {
    red: state.kingTwoStepAvailable.red,
    black: state.kingTwoStepAvailable.black,
  }

  let capturedPiece: Piece | null = null
  if (move.type === 'capture' && move.captureSquare) {
    capturedPiece = getPiece(state.board, move.captureSquare)
    setPiece(state.board, move.captureSquare, null)
  }

  if (move.type === 'flip') {
    if (movingPiece.kind !== 'eagle' || movingPiece.eagleMode === 'flying') return null
    movingPiece.eagleMode = 'flying'
  } else {
    setPiece(state.board, move.from, null)
    const pieceAfterMove = clonePiece(movingPiece)
    if (pieceAfterMove.kind === 'eagle' && pieceAfterMove.eagleMode === 'flying') {
      pieceAfterMove.eagleMode = 'ground'
    }
    setPiece(state.board, move.to, pieceAfterMove)
    if (movedPieceBefore.kind === 'king') {
      state.kingTwoStepAvailable[movedPieceBefore.side] = false
    }
  }

  return {
    move: {
      from: clonePosition(move.from),
      to: clonePosition(move.to),
      type: move.type,
      captureSquare: move.captureSquare ? clonePosition(move.captureSquare) : undefined,
    },
    movedPiece: movedPieceBefore,
    capturedPiece: capturedPiece ? clonePiece(capturedPiece) : null,
    kingTwoStepAvailableBefore,
  }
}

function unapplyMove(state: VChessState, record: MoveRecord): void {
  const { move, movedPiece, capturedPiece, kingTwoStepAvailableBefore } = record

  if (move.type === 'flip') {
    const p = getPiece(state.board, move.from)
    if (p?.kind === 'eagle') p.eagleMode = 'ground'
    state.kingTwoStepAvailable.red = kingTwoStepAvailableBefore.red
    state.kingTwoStepAvailable.black = kingTwoStepAvailableBefore.black
    state.turn = movedPiece.side
    return
  }

  setPiece(state.board, move.to, null)
  setPiece(state.board, move.from, clonePiece(movedPiece))
  if (move.type === 'capture' && capturedPiece && move.captureSquare) {
    setPiece(state.board, move.captureSquare, clonePiece(capturedPiece))
  }
  state.kingTwoStepAvailable.red = kingTwoStepAvailableBefore.red
  state.kingTwoStepAvailable.black = kingTwoStepAvailableBefore.black
  state.turn = movedPiece.side
}

function isMoveLegal(state: VChessState, move: Move): boolean {
  const simulation = cloneState(state)
  const record = applyMoveUnsafe(simulation, move)
  if (!record) return false

  const ownKing = findKing(simulation.board, state.turn)
  if (!ownKing) return false
  const enemy = state.turn === 'red' ? 'black' : 'red'
  return !isSquareAttacked(simulation, ownKing, enemy)
}

export function getLegalMovesForSquare(state: VChessState, from: Position): Move[] {
  const piece = getPiece(state.board, from)
  if (!piece || piece.side !== state.turn) return []
  return piecePseudoMoves(state, from).filter((move) => isMoveLegal(state, move))
}

export function getAllLegalMoves(state: VChessState): Move[] {
  const moves: Move[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = getPiece(state.board, { row, col })
      if (piece?.side !== state.turn) continue
      moves.push(...getLegalMovesForSquare(state, { row, col }))
    }
  }
  return moves
}

/** So sánh nước đi (dùng TT, killer, history). */
export function movesEqual(a: Move, b: Move): boolean {
  return (
    a.from.row === b.from.row &&
    a.from.col === b.from.col &&
    a.to.row === b.to.row &&
    a.to.col === b.to.col &&
    a.type === b.type &&
    (a.captureSquare?.row ?? -1) === (b.captureSquare?.row ?? -1) &&
    (a.captureSquare?.col ?? -1) === (b.captureSquare?.col ?? -1)
  )
}

/** Chỉ nước ăn quân — dùng cho quiescence. */
export function getLegalCaptures(state: VChessState): Move[] {
  return getAllLegalMoves(state).filter((m) => m.type === 'capture')
}

/**
 * Áp một nước hợp lệ trực tiếp lên `state` (mutate) — dùng cho AI search + `popMove`.
 * Trả `false` nếu nước không hợp lệ.
 */
export function tryPushMove(state: VChessState, move: Move): boolean {
  const legalMoves = getLegalMovesForSquare(state, move.from)
  const candidate = legalMoves.find((legalMove) => movesEqual(legalMove, move))
  if (!candidate) return false
  const record = applyMoveUnsafe(state, candidate)
  if (!record) return false
  state.history.push(record)
  state.turn = state.turn === 'red' ? 'black' : 'red'
  return true
}

/** Hoàn tác nước cuối từ `tryPushMove` / search — mutate `state`. */
export function popMove(state: VChessState): void {
  const record = state.history.pop()
  if (!record) throw new Error('popMove: empty history')
  unapplyMove(state, record)
}

export function makeMove(state: VChessState, move: Move): VChessState {
  const legalMoves = getLegalMovesForSquare(state, move.from)
  const candidate = legalMoves.find(
    (legalMove) =>
      legalMove.from.row === move.from.row &&
      legalMove.from.col === move.from.col &&
      legalMove.to.row === move.to.row &&
      legalMove.to.col === move.to.col &&
      legalMove.type === move.type &&
      (legalMove.captureSquare?.row ?? -1) === (move.captureSquare?.row ?? -1) &&
      (legalMove.captureSquare?.col ?? -1) === (move.captureSquare?.col ?? -1),
  )

  if (!candidate) return state

  const nextState = cloneState(state)
  const record = applyMoveUnsafe(nextState, candidate)
  if (!record) return state

  nextState.history.push(record)
  nextState.turn = state.turn === 'red' ? 'black' : 'red'
  return nextState
}

/**
 * Bỏ nước cuối — tái tạo bàn bằng cách chơi lại từ đầu (đảm bảo `kingTwoStepAvailable` đúng).
 * Trả `null` nếu không có lịch sử hoặc lịch sử không tái lập được.
 */
export function undoLastMove(state: VChessState): VChessState | null {
  if (state.history.length === 0) return null
  const trimmed = state.history.slice(0, -1)
  let s = createInitialState()
  for (const rec of trimmed) {
    const next = makeMove(s, rec.move)
    if (next === s) return null
    s = next
  }
  return s
}

export function isInCheck(state: VChessState, side: Side): boolean {
  const kingSquare = findKing(state.board, side)
  if (!kingSquare) return false
  const enemy = side === 'red' ? 'black' : 'red'
  return isSquareAttacked(state, kingSquare, enemy)
}

export type GameStatus = 'playing' | 'checkmate' | 'stalemate'

export function getGameStatus(state: VChessState): GameStatus {
  const hasMoves = getAllLegalMoves(state).length > 0
  if (hasMoves) return 'playing'
  return isInCheck(state, state.turn) ? 'checkmate' : 'stalemate'
}

export function pieceToGlyph(piece: Piece | null): string {
  if (!piece) return ''
  const symbolMap: Record<PieceKind, string> = {
    rook: 'R',
    knight: 'N',
    elephant: 'E',
    gunner: 'G',
    king: 'K',
    pawn: 'P',
    assassin: 'S',
    eagle: piece.eagleMode === 'flying' ? 'F' : 'H',
  }
  const symbol = symbolMap[piece.kind]
  return piece.side === 'red' ? symbol : symbol.toLowerCase()
}

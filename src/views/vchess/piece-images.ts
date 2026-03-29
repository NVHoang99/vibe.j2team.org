import type { Piece } from './engine/vchess-engine'
import assassinBlack from './assets/images/assassin_black.png'
import assassinRed from './assets/images/assassin_red.png'
import crownBlack from './assets/images/crown_black.png'
import crownRed from './assets/images/crown_red.png'
import elephantBlack from './assets/images/elephant_black.png'
import elephantRed from './assets/images/elephant_red.png'
import gunnerBlack from './assets/images/gunner_black.png'
import gunnerRed from './assets/images/gunner_red.png'
import eagleBlack from './assets/images/eagle_black.png'
import eagleFlyBlack from './assets/images/eagle_fly_black.png'
import eagleFlyRed from './assets/images/eagle_fly_red.png'
import eagleRed from './assets/images/eagle_red.png'
import knightBlack from './assets/images/knight_black.png'
import knightRed from './assets/images/knight_red.png'
import pawnBlack from './assets/images/pawn_black.png'
import pawnRed from './assets/images/pawn_red.png'
import rookBlack from './assets/images/rook_black.png'
import rookRed from './assets/images/rook_red.png'

export function getPieceImageSrc(piece: Piece): string {
  const red = piece.side === 'red'
  switch (piece.kind) {
    case 'rook':
      return red ? rookRed : rookBlack
    case 'knight':
      return red ? knightRed : knightBlack
    case 'elephant':
      return red ? elephantRed : elephantBlack
    case 'gunner':
      return red ? gunnerRed : gunnerBlack
    case 'king':
      return red ? crownRed : crownBlack
    case 'pawn':
      return red ? pawnRed : pawnBlack
    case 'assassin':
      return red ? assassinRed : assassinBlack
    case 'eagle':
      if (piece.eagleMode === 'flying') {
        return red ? eagleFlyRed : eagleFlyBlack
      }
      return red ? eagleRed : eagleBlack
  }
}

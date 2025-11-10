// ===================================
// FILE: src/app/services/chess.service.ts
// ===================================
import { Injectable } from '@angular/core';
import { Chess } from 'chess.js';

@Injectable({
  providedIn: 'root'
})
export class ChessService {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  reset(): void {
    this.chess.reset();
  }

  load(fen: string): void {
    this.chess.load(fen);
  }

  fen(): string {
    return this.chess.fen();
  }

  turn(): 'w' | 'b' {
    return this.chess.turn();
  }

  move(from: string, to: string, promotion: string = 'q'): any {
    try {
      return this.chess.move({ from, to, promotion });
    } catch (error) {
      return null;
    }
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  isInsufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  moves(options?: any): string[] {
    return this.chess.moves(options);
  }

  history(): any[] {
    return this.chess.history({ verbose: true });
  }
}
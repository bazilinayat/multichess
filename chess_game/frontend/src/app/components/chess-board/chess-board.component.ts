// ===================================
// FILE: src/app/components/chess-board/chess-board.component.ts
// ===================================
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChessgroundBoardComponent } from '../chessground-board/chessground-board.component';
import { SocketService, Move } from '../../services/socket.service';
import { ChessService } from '../../services/chess.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, ChessgroundBoardComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 md:p-8">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold">Multiplayer Chess</h1>
            <p class="text-slate-400 text-sm">Game ID: {{ gameId }}</p>
          </div>
          <div class="text-left md:text-right">
            <p class="text-xs md:text-sm text-slate-400">You are playing as</p>
            <p class="text-xl md:text-2xl font-bold capitalize">{{ playerColor }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <!-- Chessboard -->
          <div class="lg:col-span-2">
            <!-- Turn Indicator -->
            <div class="bg-slate-800 p-3 md:p-4 rounded-lg mb-4">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div [ngClass]="isMyTurn() ? 'px-4 py-2 rounded bg-green-600' : 'px-4 py-2 rounded bg-slate-700'">
                  {{ isMyTurn() ? '🟢 Your Turn' : '⏳ Opponent\'s Turn' }}
                </div>
                <div *ngIf="message" class="px-4 py-2 bg-blue-900 rounded text-sm">
                  {{ message }}
                </div>
              </div>
            </div>

            <!-- Board -->
            <div class="bg-slate-800 p-4 md:p-6 rounded-lg shadow-2xl">
              <app-chessground-board
                #board
                [fen]="fen"
                [orientation]="playerColor"
                (moveMade)="onMove($event)"
              ></app-chessground-board>
            </div>

            <!-- Controls -->
            <div class="grid grid-cols-3 gap-2 md:gap-4 mt-4">
              <button
                (click)="resign()"
                class="px-3 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition text-sm md:text-base"
              >
                Resign
              </button>
              <button
                (click)="offerDraw()"
                class="px-3 md:px-6 py-2 md:py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition text-sm md:text-base"
              >
                Offer Draw
              </button>
              <button
                (click)="exitGame()"
                class="px-3 md:px-6 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition text-sm md:text-base"
              >
                Exit
              </button>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-4">
            <!-- Move History -->
            <div class="bg-slate-800 p-4 rounded-lg">
              <h3 class="text-lg md:text-xl font-bold mb-3">Move History</h3>
              <div class="max-h-64 md:max-h-96 overflow-y-auto space-y-2">
                <p *ngIf="moveHistory.length === 0" class="text-slate-400 text-sm">No moves yet</p>
                <div
                  *ngFor="let move of moveHistory; let i = index"
                  class="flex items-center gap-2 text-xs md:text-sm bg-slate-700 p-2 rounded"
                >
                  <span class="font-mono text-slate-400">#{{ i + 1 }}</span>
                  <span class="font-semibold">{{ move.from }}</span>
                  <span>→</span>
                  <span class="font-semibold">{{ move.to }}</span>
                  <span class="ml-auto text-slate-400 uppercase">{{ move.piece }}</span>
                </div>
              </div>
            </div>

            <!-- Game Info -->
            <div class="bg-slate-800 p-4 rounded-lg">
              <h3 class="text-lg md:text-xl font-bold mb-3">Game Info</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-slate-400">Moves:</span>
                  <span class="font-semibold">{{ moveHistory.length }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Status:</span>
                  <span class="font-semibold" [ngClass]="getStatusClass()">
                    {{ getStatusText() }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChessBoardComponent implements OnInit, OnDestroy {
  @ViewChild('board') boardComponent!: ChessgroundBoardComponent;

  gameId: string = '';
  playerColor: 'white' | 'black' = 'white';
  fen: string = 'start';
  message = '';
  moveHistory: Move[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    public chessService: ChessService
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.gameId = params['id'];
        this.playerColor = params['color'];
      });

    // Listen for opponent moves
    this.socketService.onMoveMade()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.chessService.load(data.fen);
        this.fen = data.fen;
        this.moveHistory = data.game.moves;
        this.updateLegalMoves();
        
        if (this.chessService.isCheck()) {
          this.message = 'Check!';
        } else {
          this.message = `Opponent: ${data.move.from} → ${data.move.to}`;
        }
      });

    this.socketService.onGameStarted()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.message = 'Game started!';
        this.updateLegalMoves();
      });

    this.socketService.onGameEnded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.message = `Game Over! Winner: ${data.winner}`;
        setTimeout(() => alert(this.message), 100);
      });

    this.socketService.onDrawOffered()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (confirm('Opponent offers draw. Accept?')) {
          this.socketService.acceptDraw(this.gameId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMove(event: { from: string; to: string }): void {
    if (!this.isMyTurn()) {
      this.message = "Not your turn!";
      this.boardComponent.setFen(this.fen); // Reset board
      return;
    }

    const move = this.chessService.move(event.from, event.to);
    
    if (!move) {
      this.message = 'Invalid move!';
      this.boardComponent.setFen(this.fen); // Reset board
      return;
    }

    const newFen = this.chessService.fen();
    this.fen = newFen;

    this.socketService.makeMove(this.gameId, {
      from: event.from,
      to: event.to,
      fen: newFen,
      piece: move.piece,
      captured: move.captured
    });

    this.message = `You: ${event.from} → ${event.to}`;

    if (this.chessService.isCheckmate()) {
      this.message = 'Checkmate! You win!';
    } else if (this.chessService.isDraw()) {
      this.message = 'Draw!';
    } else if (this.chessService.isCheck()) {
      this.message = 'Check!';
    }

    this.updateLegalMoves();
  }

  private updateLegalMoves(): void {
    if (!this.boardComponent) return;

    const dests = new Map<string, string[]>();
    const squares = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of squares) {
      for (const rank of ranks) {
        const square = file + rank;
        const moves = this.chessService.moves({ square, verbose: true });
        if (moves.length > 0) {
          dests.set(square, moves.map((m: any) => m.to));
        }
      }
    }

    this.boardComponent.setDests(dests);
  }

  isMyTurn(): boolean {
    const turn = this.chessService.turn();
    return (turn === 'w' && this.playerColor === 'white') || 
           (turn === 'b' && this.playerColor === 'black');
  }

  getStatusText(): string {
    if (this.chessService.isCheckmate()) return 'Checkmate';
    if (this.chessService.isCheck()) return 'Check';
    if (this.chessService.isDraw()) return 'Draw';
    return this.isMyTurn() ? 'Your Turn' : 'Opponent Turn';
  }

  getStatusClass(): string {
    if (this.chessService.isCheckmate()) return 'text-red-400';
    if (this.chessService.isCheck()) return 'text-yellow-400';
    if (this.isMyTurn()) return 'text-green-400';
    return 'text-blue-400';
  }

  resign(): void {
    if (confirm('Resign?')) {
      this.socketService.resign(this.gameId);
    }
  }

  offerDraw(): void {
    this.socketService.offerDraw(this.gameId);
    this.message = 'Draw offered';
  }

  exitGame(): void {
    if (confirm('Exit game?')) {
      this.socketService.resign(this.gameId);
      this.router.navigate(['/']);
    }
  }
}
// ===================================
// FILE: src/app/components/game-lobby/game-lobby.component.ts
// ===================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService, WaitingGame } from '../../services/socket.service';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-game-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8">Chess Multiplayer Lobby</h1>

        <!-- Connection Status -->
        <div *ngIf="!connected" class="bg-red-900 p-4 rounded-lg mb-8 text-center">
          <p>Connecting to server...</p>
        </div>

        <!-- Player Name Input -->
        <div class="bg-slate-800 p-6 rounded-lg mb-8">
          <label class="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            [(ngModel)]="playerName"
            placeholder="Enter your name..."
            maxlength="20"
            class="w-full px-4 py-3 bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>

        <!-- Create Game -->
        <div class="bg-slate-800 p-6 rounded-lg mb-8">
          <h2 class="text-2xl font-bold mb-4">Create New Game</h2>
          <p class="text-slate-400 mb-4">
            Start a new game and wait for an opponent to join. You'll play as White.
          </p>
          <button
            (click)="createGame()"
            [disabled]="isCreating || !connected"
            class="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition text-lg"
          >
            {{ isCreating ? 'Creating Game...' : 'Create Game (Play as White)' }}
          </button>
        </div>

        <!-- Join Existing Game -->
        <div class="bg-slate-800 p-6 rounded-lg">
          <h2 class="text-2xl font-bold mb-4">Join Game</h2>
          <p class="text-slate-400 mb-4">
            Join an existing game and play as Black.
          </p>
          
          <div *ngIf="waitingGames.length === 0" class="text-center py-8 text-slate-400">
            <p>No games available</p>
            <p class="text-sm mt-2">Create a new game to get started!</p>
          </div>

          <div *ngIf="waitingGames.length > 0" class="space-y-3">
            <div
              *ngFor="let game of waitingGames"
              class="flex items-center justify-between bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition"
            >
              <div>
                <p class="font-semibold">{{ game.whiteName }}</p>
                <p class="text-sm text-slate-400">
                  Game ID: {{ game.id }} • {{ formatTime(game.createdAt) }}
                </p>
              </div>
              <button
                (click)="joinGame(game.id)"
                [disabled]="!connected"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <button
            (click)="goBack()"
            class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  `
})
export class GameLobbyComponent implements OnInit, OnDestroy {
  playerName = '';
  waitingGames: WaitingGame[] = [];
  isCreating = false;
  connected = false;
  private destroy$ = new Subject<void>();

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Monitor connection status
    this.socketService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.connected = connected;
        if (connected) {
          this.loadWaitingGames();
        }
      });

    // Listen for game creation
    this.socketService.onWaitingGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        this.waitingGames = games;
      });

    // Refresh games every 3 seconds
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.connected) {
          this.loadWaitingGames();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWaitingGames(): void {
    this.socketService.getWaitingGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        this.waitingGames = games;
      });
  }

  createGame(): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    this.isCreating = true;
    this.socketService.createGame(this.playerName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.router.navigate(['/game'], {
            queryParams: {
              id: data.gameId,
              color: data.color
            }
          });
        },
        error: (error) => {
          console.error('Error creating game:', error);
          this.isCreating = false;
          alert('Failed to create game');
        }
      });
  }

  joinGame(gameId: string): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    this.socketService.joinGame(gameId, this.playerName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.router.navigate(['/game'], {
            queryParams: {
              id: data.gameId,
              color: data.color
            }
          });
        },
        error: (error) => {
          alert(error.error || 'Failed to join game');
        }
      });
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
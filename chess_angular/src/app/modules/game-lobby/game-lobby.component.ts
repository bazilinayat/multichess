// ===================================
// FILE: src/app/components/game-lobby/game-lobby.component.ts
// ===================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MultiplayerService, WaitingGame } from '../multiplayer-mode/multiplayer.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-game-lobby',
  templateUrl: './game-lobby.component.html',
  styleUrls: ['./game-lobby.component.css']
})
export class GameLobbyComponent implements OnInit, OnDestroy {
  playerName: string = '';
  waitingGames: WaitingGame[] = [];
  isCreating: boolean = false;
  connected: boolean = false;
  private subscriptions$ = new Subscription();

  constructor(
    private multiplayerService: MultiplayerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Monitor connection
    const connectedSub = this.multiplayerService.connected$.subscribe(
      connected => this.connected = connected
    );

    // Refresh games every 3 seconds
    const refreshSub = interval(3000).subscribe(() => {
      if (this.connected) {
        this.loadWaitingGames();
      }
    });

    this.subscriptions$.add(connectedSub);
    this.subscriptions$.add(refreshSub);

    // Initial load
    if (this.connected) {
      this.loadWaitingGames();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
  }

  loadWaitingGames(): void {
    this.multiplayerService.getWaitingGames().subscribe({
      next: (games) => {
        this.waitingGames = games;
      },
      error: (err) => console.error('Error loading games:', err)
    });
  }

  createGame(): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    this.isCreating = true;
    this.multiplayerService.createGame(this.playerName).subscribe({
      next: ({ gameId, color }) => {
        this.router.navigate(['/multiplayer'], {
          queryParams: { id: gameId, color: color === 0 ? 'white' : 'black' }
        });
      },
      error: (err) => {
        console.error('Error creating game:', err);
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

    this.multiplayerService.joinGame(gameId, this.playerName).subscribe({
      next: ({ gameId, color }) => {
        this.router.navigate(['/multiplayer'], {
          queryParams: { id: gameId, color: color === 0 ? 'white' : 'black' }
        });
      },
      error: (err) => {
        alert(err.error || 'Failed to join game');
      }
    });
  }
}

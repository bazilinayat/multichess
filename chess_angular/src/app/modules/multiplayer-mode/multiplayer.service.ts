// ===================================
// FILE: src/app/moduels/multiplpayer-mode/multiplayer.service.ts
// ===================================
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { Color, FENChar } from '../../chess-logic/models';
import { environment } from 'src/environments/environment';

export interface MultiplayerMove {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotedPiece: FENChar | null;
  madeBy: string;
}

export interface GameInfo {
  id: string;
  white: { socketId: string; name: string; connected: boolean };
  black: { socketId: string; name: string; connected: boolean } | null;
  fen: string;
  status: 'waiting' | 'active' | 'finished';
}

export interface WaitingGame {
  id: string;
  whiteName: string;
  createdAt: number;
}

export interface MultiplayerConfiguration {
  gameId: string;
  playerColor: Color;
  opponentName: string;
}

@Injectable({
  providedIn: 'root'
})
export class MultiplayerService {
  private socket: Socket;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  public multiplayerConfiguration$ = new BehaviorSubject<MultiplayerConfiguration | null>(null);

  constructor() {
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      secure: true
    });

    this.setupConnectionListeners();
  }

  private setupConnectionListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to multiplayer server:', this.socket.id);
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from multiplayer server');
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  // Create a new game
  createGame(playerName: string): Observable<{ gameId: string; color: Color }> {
    return new Observable(observer => {
      this.socket.emit('create-game', { playerName });
      
      this.socket.once('game-created', (data) => {
        this.multiplayerConfiguration$.next({
          gameId: data.gameId,
          playerColor: Color.White,
          opponentName: 'Waiting...'
        });
        observer.next({ gameId: data.gameId, color: Color.White });
        observer.complete();
      });
    });
  }

  // Get waiting games
  getWaitingGames(): Observable<WaitingGame[]> {
    return new Observable(observer => {
      this.socket.emit('get-waiting-games');
      
      this.socket.once('waiting-games', (games: WaitingGame[]) => {
        observer.next(games);
        observer.complete();
      });
    });
  }

  // Join existing game
  joinGame(gameId: string, playerName: string): Observable<{ gameId: string; color: Color }> {
    return new Observable(observer => {
      this.socket.emit('join-game', { gameId, playerName });
      
      this.socket.once('game-joined', (data) => {
        observer.next({ gameId: data.gameId, color: Color.Black });
        observer.complete();
      });

      this.socket.once('join-error', (error) => {
        observer.error(error);
      });
    });
  }

  // Listen for game start
  onGameStarted(): Observable<GameInfo> {
    return new Observable(observer => {
      this.socket.on('game-started', (data) => {
        const config = this.multiplayerConfiguration$.value;
        if (config) {
          const opponentName = config.playerColor === Color.White 
            ? data.black.name 
            : data.white.name;
          this.multiplayerConfiguration$.next({
            ...config,
            opponentName
          });
        }
        observer.next(data.game);
      });
    });
  }

  // Send move to opponent
  sendMove(gameId: string, fen: string, move: MultiplayerMove): void {
    this.socket.emit('move', {
      gameId,
      moveData: {
        from: this.coordsToSquare(move.prevX, move.prevY),
        to: this.coordsToSquare(move.newX, move.newY),
        fen,
        prevX: move.prevX,
        prevY: move.prevY,
        newX: move.newX,
        newY: move.newY,
        promotedPiece: move.promotedPiece,
        madeBy: move.madeBy
      }
    });
  }

  // Listen for opponent moves
  onOpponentMove(): Observable<{ fen: string; move: MultiplayerMove }> {
    return new Observable(observer => {
      this.socket.on('move-made', (data) => {
        observer.next({
          fen: data.fen,
          move: {
            prevX: data.move.prevX,
            prevY: data.move.prevY,
            newX: data.move.newX,
            newY: data.move.newY,
            promotedPiece: data.move.promotedPiece,
            madeBy: data.move.madeBy
          }
        });
      });
    });
  }

  // Resign
  resign(gameId: string): void {
    this.socket.emit('resign', { gameId });
  }

  // Offer draw
  offerDraw(gameId: string): void {
    this.socket.emit('offer-draw', { gameId });
  }

  // Listen for draw offer
  onDrawOffered(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('draw-offered', () => {
        observer.next();
      });
    });
  }

  // Accept draw
  acceptDraw(gameId: string): void {
    this.socket.emit('accept-draw', { gameId });
  }

  // Listen for game ended
  onGameEnded(): Observable<{ winner: string; reason: string }> {
    return new Observable(observer => {
      this.socket.on('game-ended', (data) => {
        observer.next(data);
      });
    });
  }

  // Listen for opponent disconnect
  onOpponentDisconnected(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('opponent-disconnected', () => {
        observer.next();
      });
    });
  }

  // Helper to convert coords to square notation (e.g., e2)
  private coordsToSquare(x: number, y: number): string {
    const file = String.fromCharCode(97 + y); // 97 is 'a'
    const rank = (x + 1).toString();
    return file + rank;
  }

  // Disconnect
  disconnect(): void {
    this.socket.disconnect();
    this.multiplayerConfiguration$.next(null);
  }
}
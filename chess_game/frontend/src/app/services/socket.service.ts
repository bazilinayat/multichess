import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GameData {
  id: string;
  white: Player;
  black: Player | null;
  fen: string;
  status: 'waiting' | 'active' | 'finished';
  moves: Move[];
}

export interface Player {
  socketId: string;
  name: string;
  connected: boolean;
}

export interface Move {
  from: string;
  to: string;
  piece: string;
  timestamp: number;
  player: 'white' | 'black';
}

export interface WaitingGame {
  id: string;
  whiteName: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  constructor() {
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupConnectionListeners();
  }

  private setupConnectionListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  // Create a new game
  createGame(playerName: string): Observable<any> {
    return new Observable(observer => {
      this.socket.emit('create-game', { playerName });
      
      this.socket.once('game-created', (data) => {
        observer.next(data);
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

  // Listen for waiting games updates
  onWaitingGames(): Observable<WaitingGame[]> {
    return new Observable(observer => {
      this.socket.on('waiting-games', (games: WaitingGame[]) => {
        observer.next(games);
      });
    });
  }

  // Join existing game
  joinGame(gameId: string, playerName: string): Observable<any> {
    return new Observable(observer => {
      this.socket.emit('join-game', { gameId, playerName });
      
      this.socket.once('game-joined', (data) => {
        observer.next(data);
        observer.complete();
      });

      this.socket.once('join-error', (error) => {
        observer.error(error);
      });
    });
  }

  // Listen for game start
  onGameStarted(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('game-started', (data) => {
        observer.next(data);
      });
    });
  }

  // Make a move
  makeMove(gameId: string, moveData: any): void {
    this.socket.emit('move', { gameId, moveData });
  }

  // Listen for moves
  onMoveMade(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('move-made', (data) => {
        observer.next(data);
      });
    });
  }

  // Listen for game ended
  onGameEnded(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('game-ended', (data) => {
        observer.next(data);
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

  // Listen for opponent disconnect
  onOpponentDisconnected(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('opponent-disconnected', () => {
        observer.next();
      });
    });
  }

  // Disconnect
  disconnect(): void {
    this.socket.disconnect();
  }
}
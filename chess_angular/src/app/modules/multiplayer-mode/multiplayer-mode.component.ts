// ===================================
// FILE: src/app/modules/multiplayer-mode/multiplayer-mode.component.ts
// ===================================
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { MultiplayerService } from './multiplayer.service';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { Subscription } from 'rxjs';
import { Color, FENChar } from 'src/app/chess-logic/models';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-multiplayer-mode',
  templateUrl: '../chess-board/chess-board.component.html',
  styleUrls: ['../chess-board/chess-board.component.css']
})
export class MultiplayerModeComponent extends ChessBoardComponent implements OnInit, OnDestroy {
  private multiplayerSubscriptions$ = new Subscription();
  private gameId: string = '';
  private isMyTurn: boolean = true;

  constructor(
    private multiplayerService: MultiplayerService,
    private route: ActivatedRoute
  ) {
    super(inject(ChessBoardService));
  }

  public override ngOnInit(): void {
    super.ngOnInit();

    // Get game ID from route
    this.route.queryParams.subscribe(params => {
      this.gameId = params['id'];
      const color = params['color'];
      
      if (color === 'black') {
        this.flipBoard();
        this.isMyTurn = false; // Black moves second
      }
    });

    // Listen for multiplayer configuration
    const configSubscription$ = this.multiplayerService.multiplayerConfiguration$.subscribe({
      next: (config) => {
        if (config) {
          // Set initial turn state
          this.isMyTurn = config.playerColor === Color.White;
        }
      }
    });

    // Listen for game start
    const gameStartSubscription$ = this.multiplayerService.onGameStarted().subscribe({
      next: () => {
        console.log('Game started with opponent!');
      }
    });

    // Listen for opponent moves
    const opponentMoveSubscription$ = this.multiplayerService.onOpponentMove().subscribe({
      next: ({ move }) => {
        const { prevX, prevY, newX, newY, promotedPiece, madeBy } = move;
        if ((madeBy == 'white' && this.chessBoard.playerColor == Color.Black) ||
        (madeBy == 'black' && this.chessBoard.playerColor == Color.White)
        )
        {
          this.updateBoard(prevX, prevY, newX, newY, promotedPiece);
          this.isMyTurn = true; // Now it's my turn
        }
      }
    });

    // Listen for draw offers
    const drawOfferSubscription$ = this.multiplayerService.onDrawOffered().subscribe({
      next: () => {
        if (confirm('Opponent offers a draw. Accept?')) {
          this.multiplayerService.acceptDraw(this.gameId);
        }
      }
    });

    // Listen for game end
    const gameEndSubscription$ = this.multiplayerService.onGameEnded().subscribe({
      next: ({ winner, reason }) => {
        const message = `Game Over! Winner: ${winner} (${reason})`;
        alert(message);
      }
    });

    // Listen for opponent disconnect
    const disconnectSubscription$ = this.multiplayerService.onOpponentDisconnected().subscribe({
      next: () => {
        alert('Opponent disconnected. Waiting for reconnection...');
      }
    });

    this.multiplayerSubscriptions$.add(configSubscription$);
    this.multiplayerSubscriptions$.add(gameStartSubscription$);
    this.multiplayerSubscriptions$.add(opponentMoveSubscription$);
    this.multiplayerSubscriptions$.add(drawOfferSubscription$);
    this.multiplayerSubscriptions$.add(gameEndSubscription$);
    this.multiplayerSubscriptions$.add(disconnectSubscription$);
  }

  protected override updateBoard(
    prevX: number, 
    prevY: number, 
    newX: number, 
    newY: number, 
    promotedPiece: FENChar | null
  ): void {
    // Call parent to update the board
    super.updateBoard(prevX, prevY, newX, newY, promotedPiece);

    // If it was my turn, send the move to opponent
    if (this.isMyTurn) {
      let madeBy = 'white';
      if (this.chessBoard.playerColor == Color.Black)
        madeBy = 'black';

      this.multiplayerService.sendMove(this.gameId, this.chessBoard.boardAsFEN, {
        prevX,
        prevY,
        newX,
        newY,
        promotedPiece,
        madeBy
      });
      this.isMyTurn = false; // Now it's opponent's turn
    }
  }

  // Override move to prevent moving when it's not your turn
  public override move(x: number, y: number): void {
    if (!this.isMyTurn) {
      return; // Don't allow moves when it's not your turn
    }
    super.move(x, y);
  }

  public resignGame(): void {
    if (confirm('Are you sure you want to resign?')) {
      this.multiplayerService.resign(this.gameId);
    }
  }

  public offerDraw(): void {
    this.multiplayerService.offerDraw(this.gameId);
  }

  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.multiplayerSubscriptions$.unsubscribe();
  }
}
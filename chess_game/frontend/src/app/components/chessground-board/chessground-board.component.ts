// ===================================
// FILE: src/app/components/chessground-board/chessground-board.component.ts
// ===================================
import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  ViewChild,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';

@Component({
  selector: 'app-chessground-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="blue merida">
      <div #board class="cg-wrap"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .cg-wrap {
      width: 100%;
      height: 100%;
      position: relative;
    }
  `]
})
export class ChessgroundBoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('board', { static: false }) boardElement!: ElementRef;
  @Input() fen: string = 'start';
  @Input() orientation: 'white' | 'black' = 'white';
  @Output() moveMade = new EventEmitter<{ from: string; to: string }>();

  private board!: Api;

  ngAfterViewInit(): void {
    this.initBoard();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.board && changes['fen'] && !changes['fen'].firstChange) {
      this.board.set({ fen: this.fen });
    }
    if (this.board && changes['orientation']) {
      this.board.set({ orientation: this.orientation });
    }
  }

  ngOnDestroy(): void {
    if (this.board) {
      this.board.destroy();
    }
  }

  private initBoard(): void {
    const config: Config = {
      fen: this.fen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' : this.fen,
      orientation: this.orientation,
      movable: {
        free: false,
        color: 'both',
        dests: new Map(),
        events: {
          after: (orig, dest) => {
            this.moveMade.emit({ from: orig, to: dest });
          }
        }
      },
      draggable: {
        enabled: true,
        showGhost: true
      }
    };

    this.board = Chessground(this.boardElement.nativeElement, config);
  }

  public setFen(fen: string): void {
    if (this.board) {
      this.board.set({ fen });
    }
  }

  public setOrientation(orientation: 'white' | 'black'): void {
    if (this.board) {
      this.board.set({ orientation });
    }
  }

  public setDests(dests: Map<string, string[]>): void {
  if (this.board) {
    this.board.set({ 
      movable: { 
        dests: dests as any  // Type cast to fix compatibility
      } 
    });
  }
}
}
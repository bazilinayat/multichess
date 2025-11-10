// ===================================
// FILE: src/app/app.routes.ts
// ===================================
import { Routes } from '@angular/router';
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { GameLobbyComponent } from './components/game-lobby/game-lobby.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';

export const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'multiplayer', component: GameLobbyComponent },
  { path: 'game', component: ChessBoardComponent },
  { path: '**', redirectTo: '' }
];
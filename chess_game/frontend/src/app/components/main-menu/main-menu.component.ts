// ===================================
// FILE: src/app/components/main-menu/main-menu.component.ts
// ===================================
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div class="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
        <h1 class="text-4xl font-bold mb-8 text-center">Chess Game</h1>
        <div class="flex flex-col gap-4">
          <button
            (click)="playCpu()"
            class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold transition"
          >
            Play vs CPU
          </button>
          <button
            (click)="playMultiplayer()"
            class="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-semibold transition"
          >
            Play vs Human
          </button>
        </div>
      </div>
    </div>
  `
})
export class MainMenuComponent {
  constructor(private router: Router) {}

  playCpu(): void {
    this.router.navigate(['/cpu']);
  }

  playMultiplayer(): void {
    this.router.navigate(['/multiplayer']);
  }
}

import { Component } from '@angular/core';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button"
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { PlayAgainstComputerDialogComponent } from '../play-against-computer-dialog/play-against-computer-dialog.component';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.css'],
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, RouterModule, MatDialogModule]
})
export class NavMenuComponent {

  constructor(private dialog: MatDialog,
    private router: Router
  ) { }

  public playAgainstComputer(): void {
    this.dialog.open(PlayAgainstComputerDialogComponent);
  }

  public playAgainstRandom(): void {
    this.router.navigate(["against-someone"]);
  }
}

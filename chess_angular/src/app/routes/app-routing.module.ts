import { NgModule } from "@angular/core";
import { ChessBoardComponent } from "../modules/chess-board/chess-board.component";
import { ComputerModeComponent } from "../modules/computer-mode/computer-mode.component";
import { RouterModule, Routes } from "@angular/router";
import { GameLobbyComponent } from "../modules/game-lobby/game-lobby.component";
import { MultiplayerModeComponent } from "../modules/multiplayer-mode/multiplayer-mode.component";

const routes: Routes = [
    { path: "against-friend", component: ChessBoardComponent, title: "Play against friend" },
    { path: "against-computer", component: ComputerModeComponent, title: "Play against computer" },
    { path: "against-someone", component: GameLobbyComponent, title: "Play against someone" },
    { path: "multiplayer", component: MultiplayerModeComponent, title: "Multiplayer On" }

]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
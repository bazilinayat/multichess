# multichess - ChessGame

Just couldn't think of a better name for the repo

Images for pieces used from Lichess official repo: https://github.com/lichess-org

The tutorial followed to build this project - 
Tutorial can be found on FreeCodeCamp youtube channel: https://youtu.be/fJIsqZmQVZQ

The chess application consists of two modes from the tutorial: 
Playing against a friend in the same browser
Playing against the computer, which utilizes the Stockfish REST API from https://stockfish.online/

A third mode was added to give a function to play with any random person -
Where we have developed a basic node server, which deals everything in memory for now

Journey -
User1 (by default white) > Creates a game > waits for user 2 to join

User2 > Sees the list of games and joins one

This starts the game between the two users, the server passes the moves made from each user to other.
In this way users can play the game.

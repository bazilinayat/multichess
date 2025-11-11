// ===================================
// FILE: backend/server.js
// ===================================
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200', // Changed to Angular default port
    methods: ['GET', 'POST']
  }
});

// ===================================
// GAME STATE MANAGEMENT
// ===================================
class GameManager {
  constructor() {
    this.games = new Map(); // gameId -> game object
    this.waitingPlayers = []; // Players waiting for opponent
    this.playerSockets = new Map(); // socketId -> { playerId, currentGame }
  }

  createGame(socketId, playerName) {
    const gameId = this.generateGameId();
    const game = {
      id: gameId,
      white: {
        socketId,
        name: playerName || 'Player 1',
        connected: true
      },
      black: null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial position
      status: 'waiting', // waiting, active, finished
      moves: [],
      createdAt: Date.now(),
      lastMoveAt: null
    };

    this.games.set(gameId, game);
    this.playerSockets.set(socketId, { currentGame: gameId });
    
    return game;
  }

  joinGame(gameId, socketId, playerName) {
    const game = this.games.get(gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    if (game.black) {
      return { success: false, error: 'Game is full' };
    }

    game.black = {
      socketId,
      name: playerName || 'Player 2',
      connected: true
    };
    game.status = 'active';
    
    this.playerSockets.set(socketId, { currentGame: gameId });

    return { success: true, game };
  }

  getWaitingGames() {
    const waiting = [];
    this.games.forEach((game) => {
      if (game.status === 'waiting') {
        waiting.push({
          id: game.id,
          whiteName: game.white.name,
          createdAt: game.createdAt
        });
      }
    });
    return waiting.sort((a, b) => b.createdAt - a.createdAt);
  }

  makeMove(gameId, socketId, moveData) {
    const game = this.games.get(gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'active') {
      return { success: false, error: 'Game not active' };
    }

    // Verify it's the player's turn
    const isWhite = game.white.socketId === socketId;
    const isBlack = game.black?.socketId === socketId;

    if (!isWhite && !isBlack) {
      return { success: false, error: 'Not a player in this game' };
    }

    // Update game state
    console.log("Move sent by - socketid:", socketId);
    console.log("Move received - FEN:", moveData.fen);
    console.log("Move details:", {
      from: moveData.from,
      to: moveData.to,
      prevX: moveData.prevX,
      prevY: moveData.prevY,
      newX: moveData.newX,
      newY: moveData.newY,
      promotedPiece: moveData.promotedPiece,
      madeBy: moveData.madeBy
    });

    game.fen = moveData.fen;
    game.moves.push({
      fen: moveData.fen,
      from: moveData.from,
      to: moveData.to,
      prevX: moveData.prevX,
      prevY: moveData.prevY,
      newX: moveData.newX,
      newY: moveData.newY,
      promotedPiece: moveData.promotedPiece,
      timestamp: Date.now(),
      player: isWhite ? 'white' : 'black'
    });
    game.lastMoveAt = Date.now();

    return { success: true, game, moveData };
  }

  endGame(gameId, winner, reason) {
    const game = this.games.get(gameId);
    if (game) {
      game.status = 'finished';
      game.winner = winner;
      game.endReason = reason;
      game.finishedAt = Date.now();
    }
    return game;
  }

  handleDisconnect(socketId) {
    const playerData = this.playerSockets.get(socketId);
    
    if (playerData && playerData.currentGame) {
      const game = this.games.get(playerData.currentGame);
      
      if (game) {
        // Mark player as disconnected
        if (game.white?.socketId === socketId) {
          game.white.connected = false;
        }
        if (game.black?.socketId === socketId) {
          game.black.connected = false;
        }

        // If game is active, give them time to reconnect
        // Otherwise clean up
        if (game.status === 'waiting') {
          this.games.delete(game.id);
        }
      }
    }

    this.playerSockets.delete(socketId);
  }

  generateGameId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  getGameBySocketId(socketId) {
    const playerData = this.playerSockets.get(socketId);
    if (playerData?.currentGame) {
      return this.games.get(playerData.currentGame);
    }
    return null;
  }
}

const gameManager = new GameManager();

// ===================================
// SOCKET.IO EVENT HANDLERS
// ===================================
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create a new game
  socket.on('create-game', (data) => {
    const { playerName } = data;
    const game = gameManager.createGame(socket.id, playerName);
    
    socket.join(game.id);
    socket.emit('game-created', {
      gameId: game.id,
      color: 'white',
      game
    });

    console.log(`Game ${game.id} created by ${playerName}`);
  });

  // Get list of waiting games
  socket.on('get-waiting-games', () => {
    const waitingGames = gameManager.getWaitingGames();
    socket.emit('waiting-games', waitingGames);
  });

  // Join an existing game
  socket.on('join-game', (data) => {
    const { gameId, playerName } = data;
    const result = gameManager.joinGame(gameId, socket.id, playerName);

    if (!result.success) {
      socket.emit('join-error', { error: result.error });
      return;
    }

    socket.join(gameId);
    
    // Notify both players
    io.to(gameId).emit('game-started', {
      game: result.game,
      white: result.game.white,
      black: result.game.black
    });

    // Send color to joining player
    socket.emit('game-joined', {
      gameId,
      color: 'black',
      game: result.game
    });

    console.log(`${playerName} joined game ${gameId}`);
  });

  // Make a move - UPDATED to handle Angular's move format
  socket.on('move', (data) => {
    const { gameId, moveData } = data;
    const result = gameManager.makeMove(gameId, socket.id, moveData);

    if (!result.success) {
      socket.emit('move-error', { error: result.error });
      return;
    }

    // Broadcast move to all players in the game
    // Include the full moveData so Angular can reconstruct the move
    io.to(gameId).emit('move-made', {
      fen: moveData.fen,
      move: moveData, // This includes prevX, prevY, newX, newY, promotedPiece, madeBy
      game: result.game
    });

    console.log(`Move made in game ${gameId}: ${moveData.from} -> ${moveData.to}`);
  });

  // Send chat message
  socket.on('chat-message', (data) => {
    const { gameId, message } = data;
    const game = gameManager.getGame(gameId);
    
    if (game) {
      const isWhite = game.white.socketId === socket.id;
      const playerName = isWhite ? game.white.name : game.black?.name;
      
      io.to(gameId).emit('chat-message', {
        playerName,
        message,
        timestamp: Date.now()
      });
    }
  });

  // Resign
  socket.on('resign', (data) => {
    const { gameId } = data;
    const game = gameManager.getGame(gameId);
    
    if (game) {
      const isWhite = game.white.socketId === socket.id;
      const winner = isWhite ? 'black' : 'white';
      
      gameManager.endGame(gameId, winner, 'resignation');
      
      io.to(gameId).emit('game-ended', {
        winner,
        reason: 'resignation'
      });
      
      console.log(`Game ${gameId} ended: ${winner} wins by resignation`);
    }
  });

  // Offer draw
  socket.on('offer-draw', (data) => {
    const { gameId } = data;
    console.log(`Draw offered in game ${gameId}`);
    socket.to(gameId).emit('draw-offered');
  });

  // Accept draw
  socket.on('accept-draw', (data) => {
    const { gameId } = data;
    gameManager.endGame(gameId, 'draw', 'agreement');
    
    io.to(gameId).emit('game-ended', {
      winner: 'draw',
      reason: 'agreement'
    });
    
    console.log(`Game ${gameId} ended: Draw by agreement`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const game = gameManager.getGameBySocketId(socket.id);
    if (game && game.status === 'active') {
      // Notify opponent
      socket.to(game.id).emit('opponent-disconnected');
      
      // Give them 60 seconds to reconnect, then end game
      setTimeout(() => {
        const currentGame = gameManager.getGame(game.id);
        if (currentGame && currentGame.status === 'active') {
          const isWhite = currentGame.white?.socketId === socket.id;
          if ((isWhite && !currentGame.white.connected) || 
              (!isWhite && currentGame.black && !currentGame.black.connected)) {
            const winner = isWhite ? 'black' : 'white';
            gameManager.endGame(game.id, winner, 'abandonment');
            io.to(game.id).emit('game-ended', {
              winner,
              reason: 'abandonment'
            });
            console.log(`Game ${game.id} ended: ${winner} wins by abandonment`);
          }
        }
      }, 60000);
    }
    
    gameManager.handleDisconnect(socket.id);
  });
});

// ===================================
// REST API (optional, for debugging)
// ===================================
app.get('/api/games', (req, res) => {
  const games = Array.from(gameManager.games.values());
  res.json({ 
    games,
    totalGames: games.length,
    activeGames: games.filter(g => g.status === 'active').length,
    waitingGames: games.filter(g => g.status === 'waiting').length
  });
});

app.get('/api/games/:id', (req, res) => {
  const game = gameManager.getGame(req.params.id);
  if (game) {
    res.json({ game });
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ===================================
// START SERVER
// ===================================
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`✅ Chess WebSocket server running on port ${PORT}`);
  console.log(`🌐 Angular client should connect to: http://localhost:${PORT}`);
  console.log(`📊 API available at: http://localhost:${PORT}/api/games`);
});
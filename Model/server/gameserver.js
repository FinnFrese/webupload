const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: {
      origin: ["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:63342", "https://jolly-strudel-92337f.netlify.app/"],
      //methods: ["GET","HEAD","PUT","PATCH","POST","DELETE"],
      
      credentials: true
    }
  });
const { createGameState, gameLoop } = require('./gamest')
const cors = require("cors");
const { emit } = require("process");
console.log("Server running.");
const state = {};
const clientRooms = {};

io.on('connection', client => {
  client.on('PlInfo', handleInfo);
  client.on('createGame', handleNewGame);
  client.on('joinGame', joinGame);
  client.on('clearGame', clearGame);

  function handleInfo(playerinfo){
    //console.log(playerinfo);
    const roomName = clientRooms[client.id];
    if (!roomName) {
      return;
    }
    try{
      playerinfo = JSON.parse(playerinfo);
    }catch(e){
      console.error(e);
      return;
    }
    //console.log(playerinfo);
    if(playerinfo){
      try{
      state[roomName].players[client.number-1].lost = playerinfo["losing"]
      state[roomName].players[client.number-1].won = playerinfo["winning"]
      state[roomName].players[client.number-1].pWidth = playerinfo["pWidth"]
      state[roomName].players[client.number-1].pHeight = playerinfo["pHeight"]
      state[roomName].players[client.number-1].xCord = playerinfo["xCord"]
      state[roomName].players[client.number-1].yCord = playerinfo["yCord"]
      }catch{}
    }
  }

  function handleNewGame() {
    let roomName = makeid(7);
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);
    //console.log(clientRooms);
    state[roomName] = createGameState();
    client.join(roomName);
    client.number = 1;
    client.emit('init', 1);
  }

  function joinGame(gameCode) {
    var room;
    try{
    room = io.sockets.adapter.rooms.get(gameCode).size;
    }catch{ room=0}
    if(room===0){
      client.emit('No Room');
      return;
    }else if(room>1){
      client.emit('Room full');
      return;
    } 
    clientRooms[client.id] = gameCode;
    client.join(gameCode);
    client.number = 2;
    client.emit('init', 2);
    startGame(gameCode);
  }

  function clearGame(gameCode){
    try{
    clientRooms[client.id] = null;
    state[gameCode] = null;
    }catch{}
    client.leave(gameCode);
    }
})

function startGame(roomName) {
  const intervallId = setInterval(() => {
    const winner = gameLoop(state[roomName]);
    //console.log('Running')
    if (!winner){
      emitGameState(roomName, state[roomName]);
    }else{
      emitGameOver(roomName, winner);
      state[roomName]=null;
      clearInterval(intervallId);
    }
  }, 1000 / 60);
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function emitGameState(roomName, state){
io.sockets.in(roomName).emit('gameState', JSON.stringify(state))
}

function emitGameOver(roomName, winner) {
  io.sockets.in(roomName)
  .emit('gameOver', JSON.stringify({winner}))
}

io.listen(process.env.PORT ||8080);
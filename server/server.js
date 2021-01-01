/**
 * Created by jackilrajnicant on 07/01/2016.
 */

// Settings
var port = 8000;

// Server code
var Server = require('ws').Server;
var wss = new Server({ port: port });

var Player = require('./lobby').Player;
var Lobby = require('./lobby').GameRoom;
var game = new Lobby();

wss.on('message' , function(message){
    console.log(message);
});

wss.on('connection', function(socket) {

    var name = socket.upgradeReq.url.replace(/[^\w\s]/gi, '');

    var player = new Player(socket, name);

    game.addPlayer(player);

    console.log("A connection established: "+player.id);

});


wss.on('request', function(socket) {
    console.log("Player Request");

});


wss.on('message', function(socket) {
    console.log("Player message");
});


wss.on('close', function(socket) {
    console.log("Player Left");

});



console.log("WebSocket server is running.");
console.log("Listening to port " + port + ".");
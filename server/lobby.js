/**
 * Created by jackilrajnicant on 07/01/2016.
 */
module.exports = {
    Player: player,
    Lobby: Lobby,
    GameRoom: GameLobby
};


//Constants
var LINE = 0;
var CHAT = 1;
var LOGIC = 2;
var TIME_OUT = 3;
var USER_NAMES = 4;
//Constant for game logic
var WAITING_TO_BEGIN = 0;
var GAME_BEGIN = 1;
var GAME_END = 2;
var GAME_RELOAD = 3;
var GAME_RUNNING=4;
var GAME_FINISH = 5;
var GAME_RESET =6;

var gameScore=3;
var startTimeMS = 0;  // EPOCH Time of event count started
var finish = false;
var playerGo = -1;
var gameOverTimeout = 0;
var gameOverInterval = 0;
var drawer = "";
var wordOfLength = "";
var counter=0;
var user = "";

function player(socket, name) {
    this.socket = socket;
    this.id =name;
    this.score=0;
    this.guessed=false;
    this.check=false;
    this.draw=false;
}

function Lobby() {
    this.players = [];
}

Lobby.prototype.addPlayer = function(player){
    this.players.push(player);
    var lobby = this;

    // handle user closing
    this.handleOnPlayerMessage(player);
    player.socket.onclose = function(){
        console.log('A connection left.');
        lobby.removePlayer(player);
    }
};

Lobby.prototype.removePlayer = function(player) {

    var check = false;
    var lobby = this;
    // loop to find the user


    for (i=this.players.length; i >= 0; i--) {
        if (this.players[i] === player) {

            if(lobby.playerToDraw==i){
                check=true;
            }

            if(this.players[0]==player){
                playerGo++;
                lobby.playerToDraw++;
            }

            this.players.splice(i, 1);
        }
    }

    var name = [];
    var score = [];

    for(var i =0; i<lobby.players.length; i++){
        name[i]=lobby.players[i].id;
        score[i]=lobby.players[i].score;
    }

    var usersDisplay = {
        dataType: USER_NAMES,
        nameList:name,
        scoreList:score
    };
    lobby.sendToAllUsers(JSON.stringify(usersDisplay));



    if( lobby.players.length == 1) {
        //console.log("Player Left");

        for(var i =0; i<lobby.players.length; i++){
            name[i]=lobby.players[i].id;
            score[i]=0;
            lobby.players[i].score=0;
            lobby.players[i].guessed=false;
        }

        var usersDisplay = {
            dataType: USER_NAMES,
            nameList:name,
            scoreList:score
        }
        lobby.sendToAllUsers(JSON.stringify(usersDisplay));

        if (gameOverInterval != null){
            clearInterval(gameOverInterval);
            clearTimeout(gameOverTimeout);
        }

        var LogicData = {
            dataType: LOGIC,
            gameState: WAITING_TO_BEGIN
        };

        lobby.sendToAllUsers(JSON.stringify(LogicData));

        lobby.currentState = WAITING_TO_BEGIN;
        lobby.playerToDraw=0;
        gameScore=3;
    }else if(check){
        //console.log("Artist left");

        if (gameOverInterval != null){
            clearInterval(gameOverInterval);
            clearTimeout(gameOverTimeout);
        }
        var LogicData = {
            dataType: LOGIC,
            gameState: GAME_RESET
        };

        lobby.sendToAllUsers(JSON.stringify(LogicData));
        lobby.currentState = WAITING_TO_BEGIN;
        lobby.playerToDraw--;
        if(lobby.players.length == 1 || lobby.players.length == 0 || lobby.playerToDraw == -1){
            lobby.playerToDraw=0;
        }
    }
    console.log(lobby.playerToDraw);
};

Lobby.prototype.sendToAllUsers = function(message) {
    for (var i = 0, len = this.players.length; i < len; i++) {
        this.players[i].socket.send(message);
    }
};

Lobby.prototype.handleOnPlayerMessage = function(player) {
    var lobby = this;

    player.socket.on('message', function (data) {

        if(player.id===false) {

            if(data.toString().length==0){
                player.id="Guest" + Math.floor( Math.random() * 10000)
            }else{
                player.id=data;
            }

            var obj = {
                dataType: CHAT,
                sender: "Server",
                message: "Welcome " + player.id + " joining the party."
            };
            lobby.sendToAllUsers(JSON.stringify(obj));

        }else{

            var obj = JSON.parse(data);
            if (obj.dataType === CHAT) {
                // add the sender information into the message data object.
                obj.sender = player.id;
            }
            lobby.sendToAllUsers(JSON.stringify(obj));
        }
    });
};

function GameLobby() {
    this.playerToDraw = 0;
    this.listOfWords = ['apple','idea','angry','car','cat','water','airplane','bank','baseball','bed','bicycle','billboard',
                        'birthday','book','brain','candy','climb','clock','cookie','cube','dog','drawing','duck','earth',
                        'elephant','eye','fireworks','flag','fish','flower','guitar','happy','hat','heart','house',
                        'joker','necklace','numbers','pen','pie','plane','queen','reading','school','snowflake','stick',
                        'square','sun','telephone','toothbrush','train','window','tree','television','stomach','spider',
                        'bucket','brush','box','bone'];
    this.currentGuessWord = undefined;
    this.currentState = WAITING_TO_BEGIN;
    var LogicData = {
        dataType: LOGIC,
        gameState: WAITING_TO_BEGIN
    };
    this.sendToAllUsers(JSON.stringify(LogicData));
}
GameLobby.prototype = new Lobby();

GameLobby.prototype.addPlayer = function(player) {
    var lobby = this;
    if(this.players.length < 6){
        Lobby.prototype.addPlayer.call(this, player);
    }else{
        var obj = {
            dataType: CHAT,
            sender: "Game Lobby",
            message: "The game room is full."
        };
        player.socket.send(JSON.stringify(obj));
    }

    if (this.currentState === WAITING_TO_BEGIN && this.players.length >= 2) {
        this.startGame();
    }else if(this.currentState === WAITING_TO_BEGIN){
        var LogicData = {
            dataType: LOGIC,
            gameState: WAITING_TO_BEGIN
        };
        player.socket.send(JSON.stringify(LogicData));
    }else{
        var LogicDataLatePlayers = {
            dataType: LOGIC,
            gameState: GAME_BEGIN,
            artist: drawer.id,
            wlength: wordOfLength,
            isPlayerTurn: false
        };
        player.socket.send(JSON.stringify(LogicDataLatePlayers));
    }
};

GameLobby.prototype.handleOnPlayerMessage = function(player) {
    var lobby = this;
    player.socket.on("message", function(message){


        if(player.check===false) {

            player.check=true;

            var obj = {
                dataType: CHAT,
                sender: "Game Lobby",
                message: "Welcome " + player.id + " has joined the Game."
            }
            lobby.sendToAllUsers(JSON.stringify(obj));

            var name = [];
            var score = [];

            for(var i =0; i<lobby.players.length; i++){
                name[i]=lobby.players[i].id;
                score[i]=lobby.players[i].score;
            }

            var usersDisplay = {
                dataType: USER_NAMES,
                nameList:name,
                scoreList:score,
            };
            lobby.sendToAllUsers(JSON.stringify(usersDisplay));

        }

        else{
            var clientData = JSON.parse(message);

            if(clientData.dataType === LINE){
                lobby.sendToAllUsers(JSON.stringify(clientData));
            }


            if(finish && clientData.dataType!=CHAT){
                playerGo=-1;
                finish=false;

                var name = [];
                var score = [];

                for(var i =0; i<lobby.players.length; i++){
                    name[i]=lobby.players[i].id;
                    score[i]=lobby.players[i].score;
                }
                var gameFinish = {
                    dataType: LOGIC,
                    gameState: GAME_FINISH,
                    nameList:name,
                    scoreList:score
                };
                lobby.sendToAllUsers(JSON.stringify(gameFinish));
            }

            else if (clientData.dataType === CHAT) {

                if (lobby.currentState === GAME_RUNNING) {
                    //console.log("Got message: " + clientData.message + " (Answer: " + lobby.currentGuessWord + ")");
                }

                if (lobby.currentState === GAME_RUNNING && clientData.message.toLowerCase() === lobby.currentGuessWord){

                    if(player.guessed==false){

                        var gameLogicData = {
                            dataType: LOGIC,
                            gameState: GAME_RUNNING,
                            winner: player.id,
                            guess:true,
                            answer: lobby.currentGuessWord
                        };

                        lobby.sendToAllUsers(JSON.stringify(gameLogicData));

                        if(gameScore===3){
                            user.score+=2;
                            player.score+=gameScore;
                            gameScore=2;
                        }else if(gameScore===2){
                            player.score+=gameScore;
                            gameScore=1;
                        }else if(gameScore===1){
                            player.score+=gameScore;
                            gameScore=0;
                        }
                        player.guessed = true;


                        var name = [];
                        var score = [];

                        for(var i =0; i<lobby.players.length; i++){
                            name[i]=lobby.players[i].id;
                            score[i]=lobby.players[i].score;
                        }

                        var usersDisplay = {
                            dataType: USER_NAMES,
                            nameList:name,
                            scoreList:score
                        };
                        lobby.sendToAllUsers(JSON.stringify(usersDisplay));
                        player.guessed = true;
                    }else{
                        //console.log(player.id+" has guessed the word.");
                    }

                }

                else if (clientData.dataType === CHAT) {
                    clientData.sender = player.id;
                    lobby.sendToAllUsers(JSON.stringify(clientData));
                }

                if (lobby.currentState === GAME_BEGIN) {
                    lobby.currentState = WAITING_TO_BEGIN;
                    clearInterval(lobby.gameOverInterval);
                    clearTimeout(lobby.gameOverTimeout);
                }
            }

            else if (clientData.dataType === LOGIC && clientData.gameState === GAME_RELOAD) {

                if(clientData.reset==true){

                    var name = [];
                    var score = [];

                    for(var i =0; i<lobby.players.length; i++){
                        lobby.players[i].score=0;
                        lobby.players[i].guessed=false;
                        name[i]=lobby.players[i].id;
                        score[i]=lobby.players[i].score;
                    }

                    var usersDisplay = {
                        dataType: USER_NAMES,
                        nameList:name,
                        scoreList:score
                    };
                    lobby.sendToAllUsers(JSON.stringify(usersDisplay));

                }

                if(lobby.players.length==1 || lobby.players.length==0){
                    var LogicData = {
                        dataType: LOGIC,
                        gameState: WAITING_TO_BEGIN
                    };
                    //room.sendToAllUsers(JSON.stringify(LogicData));
                }else{
                    lobby.startGame();
                }
            }

            return;
        }
    });
};

GameLobby.prototype.startGame = function() {
    var lobby = this;

    this.playerToDraw = (this.playerToDraw+1) % this.players.length;
    playerGo=this.playerToDraw;

    console.log("Round Starts and player " + this.playerToDraw + "'s turn.");

    var wordToGuess = Math.floor(Math.random() * this.listOfWords.length);
    this.currentGuessWord = this.listOfWords[wordToGuess];

    user = this.players[this.playerToDraw];
    var wordlength = this.currentGuessWord.length;

    drawer = user;
    wordOfLength = wordlength;

    var LogicDataAllPlayers = {
        dataType: LOGIC,
        gameState: GAME_BEGIN,
        artist: user.id,
        wlength: wordlength,
        isPlayerTurn: false
    };
    this.sendToAllUsers(JSON.stringify(LogicDataAllPlayers));

    var LogicDataArtist = {
        dataType: LOGIC,
        gameState: GAME_BEGIN,
        artist: user.id,
        answer: this.currentGuessWord,
        isPlayerTurn: true
    };
    user.socket.send(JSON.stringify(LogicDataArtist));

    startTimeMS = (new Date()).getTime();
    gameOverTimeout = setTimeout(function(){
        console.log("Round Ends and player " + playerGo + "'s turn is over");
        if(playerGo==0){
            finish=true;
        }
        var LogicData = {
            dataType: LOGIC,
            gameState: GAME_END,
            winner: "No one",
            guess:false,
            answer: lobby.currentGuessWord
        };

        lobby.sendToAllUsers(JSON.stringify(LogicData));
        lobby.currentState = WAITING_TO_BEGIN;
        gameScore=3;
        for(var i =0; i<lobby.players.length; i++){
            lobby.players[i].guessed=false;
        }
    },60*1000);
    gameOverInterval = setInterval(function() {
        var timeObj = {
            dataType: TIME_OUT,
            timeLeft:getTimeLeft(gameOverTimeout),
        };
        lobby.sendToAllUsers(JSON.stringify(timeObj));
    }, 1000);
    lobby.currentState = GAME_RUNNING;
};

function getTimeLeft(timeout) {
    return Math.ceil((timeout._idleTimeout - ((new Date()).getTime() - startTimeMS))/1000)
}



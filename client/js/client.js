/**
 * Created by jackilrajnicant on 07/01/2016.
 */
//connectedSoc


var clientSocket = {
    isDrawing:false,
    X:0,
    Y:0,

    LINE : 0,
    CHAT : 1,
    LOGIC : 2,
    TIME_OUT :3,
    USER_NAMES:4,

    WAITING_TO_BEGIN : 0,
    GAME_BEGIN : 1,
    GAME_END : 2,
    GAME_RELOAD : 3,
    GAME_RUNNING:4,
    GAME_FINISH:5,
    GAME_RESET: 6,

    isTurnToDraw : false

};

// canvasBoard context
var canvasBoard = document.getElementById('draw-board');
var canvasCTX = canvasBoard.getContext('2d');
var line_thickness = 1;
var strokeStyle = "#000000";
var easeAll =false;
var elapsedTime =0;
var timerstop = true;
var users = [];
var username="";
var artist="";


$('#reload').click(function() {
    location.reload();

});

$(window).bind('beforeunload', function(){
    return 'Please, wait for game over!\n You will miss your turn and loose your score.';
});

function getUrlVars() {
    var username = "";
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        username = value;
    });
    return username;
}

function drawingPath(canvasCTX, x1, y1, x2, y2, thickness, color) {
    canvasCTX.beginPath();
    canvasCTX.moveTo(x1,y1);
    canvasCTX.lineTo(x2,y2);
    canvasCTX.lineWidth = thickness;
    canvasCTX.strokeStyle=color;
    canvasCTX.stroke();
}

function sendMsgToUsers() {
    var message = $("#input").val();

    var check = /^[a-z ]+$/i;
    if( !check.test( message ) ) {

    } else {
        var jsonDataServer = {};
        jsonDataServer.dataType = clientSocket.CHAT;
        jsonDataServer.message = message;
        clientSocket.socket.send(JSON.stringify(jsonDataServer));
        $("#input").val("");
    }


}

function update(picker) {
    console.log(picker.toHEXString());
    canvasCTX.strokeStyle = picker.toHEXString();
    strokeStyle = picker.toHEXString();
}

function addToChat(text){
    $("#chat").append("<li>"+text+"</li>");
    $('#chatDisplay').scrollTop($('#chatDisplay')[0].scrollHeight);
}

function restartGame(){
    canvasBoard.width = canvasBoard.width;
    $("#input").html("");
    var jsonDataServer = {};
    jsonDataServer.dataType = clientSocket.LOGIC;
    jsonDataServer.gameState = clientSocket.GAME_RELOAD;
    jsonDataServer.reset = true;
    clientSocket.socket.send(JSON.stringify(jsonDataServer));
    $("#popup").addClass("hide");
}

function resetGame(){
    canvasBoard.width = canvasBoard.width;
    $("#input").html("");
    var jsonDataServer = {};
    jsonDataServer.dataType = clientSocket.LOGIC;
    jsonDataServer.gameState = clientSocket.GAME_RESET;
    jsonDataServer.reset = true;
    clientSocket.socket.send(JSON.stringify(jsonDataServer));
    $("#popup").addClass("hide");
}


// init script when the DOM is ready.
$(function(){
    $("#tools").hide();
    $("#restart").hide();
    $("#reset").hide();
    var select = '';
    for (i=1;i<=100;i++){
        select += '<option val=' + i + '>' + i + '</option>';
    }
    $("#pen-size").html(select);
    username=getUrlVars();
    username=username+"_"+Math.floor( Math.random() * 1000);
    $("#player-Name").val(username);
    startGame();

});

function startGame() {



    if (window["WebSocket"]) {

        clientSocket.socket = new WebSocket("ws://localhost:8000/"+username);


        clientSocket.socket.onopen = function (e) {
            clientSocket.socket.send(username);
            console.log('WebSocket connection established.');
        };



        clientSocket.socket.onmessage = function (e) {

            var serverData = JSON.parse(e.data);

            if (serverData.dataType === clientSocket.CHAT) {
                //$("#time").html("00:00");
                addToChat(serverData.sender + " said: " + serverData.message + "<br>");

            }

            else if (serverData.dataType === clientSocket.USER_NAMES) {

                users = serverData.nameList;
                var name = serverData.nameList;
                var score = serverData.scoreList;

                $("#score-text").html("");
                for (var i = 0; i < name.length; i++) {
                    $("#score-text").append(name[i] + " : " + score[i] + "<br>");
                }


            }

            else if (serverData.dataType === clientSocket.TIME_OUT) {

                if (!(serverData.timeLeft < 0  )) {
                    if (serverData.timeLeft < 10){
                        serverData.timeLeft = "0" + serverData.timeLeft;
                        $("#time").html("<span style='color: #e70028'>00:"+serverData.timeLeft+"</span>");
                    }else{
                        $("#time").html("00:"+serverData.timeLeft);
                    }

                } else {
                    $("#time").html("00:00");
               }
            }

            else if (serverData.dataType === clientSocket.LINE) {

                if (serverData.easerAll) {
                    canvasCTX.clearRect(0, 0, canvasCTX.canvas.width, canvasCTX.canvas.height);
                } else {
                    drawingPath(canvasCTX, serverData.X, serverData.Y, serverData.endX, serverData.endY, serverData.lineThickness, serverData.color);
                }

            }

            else if (serverData.dataType === clientSocket.LOGIC) {

                if(serverData.gameState === clientSocket.WAITING_TO_BEGIN){
                    $("#reset").hide();
                    $("#restart").hide();
                    $("#statues").html("<span style='color: #e70028'>Waiting for players</span><br>");
                }

                if (serverData.gameState === clientSocket.GAME_RUNNING) {

                    addToChat("<span style='color: #00e711'>"+serverData.winner + " Guessed the word </span><br>");
                }

                if (serverData.gameState === clientSocket.GAME_END) {

                    if(clientSocket.isTurnToDraw){
                        addToChat("<span style='color: #e70028'>Click on 'Finish' to finish your turn. </span><br>");
                        $("#restart").show();
                    }

                    $("#tools").hide();
                    clientSocket.isTurnToDraw = false;
                    $("#title_word").html(serverData.answer);
                    addToChat("<span style='color: #001be7'>The answer is " + serverData.answer + "</span><br>");
                    $("#input").prop("disabled", false);
                    $("#send").prop("disabled", false);

                }

                if(serverData.gameState === clientSocket.GAME_RESET){
                    addToChat("<span style='color: #e70028'>The Artist has left. Click 'Reset' to continue. </span><br>");
                    $("#reset").show();

                }

                if (serverData.gameState === clientSocket.GAME_BEGIN) {

                    $("#statues").html("<span style='color: #0035e7'>"+serverData.artist+" is drawing</span><br>");
                    var wordline = "";
                    var wordlength = serverData.wlength;
                    for(var i = 0; i<wordlength;i++){
                        wordline = wordline + "_ "
                    }

                    canvasBoard.width = canvasBoard.width;
                    $("#popup").addClass("hide");
                    $("#reset").hide();
                    $("#restart").hide();
                    $("#chat").html("");
                    if (serverData.isPlayerTurn) {
                        $("#input").prop("disabled", true);
                        $("#send").prop("disabled", true);
                        $("#tools").show();
                        clientSocket.isTurnToDraw = true;
                        $("#title_word").html(serverData.answer);
                        addToChat("<span style='color: #E74C3C'>Your turn to draw. Please draw '" + serverData.answer + "'</span><br>");

                    } else {
                        $("#title_word").html(wordline);
                        $("#input").prop("disabled", false);
                        $("#send").prop("disabled", false);
                        $("#tools").hide();
                        clientSocket.isTurnToDraw = false;
                        addToChat("Game Started. Get Ready.You have one minute to guess<br>");
                    }

                }

                if(serverData.gameState === clientSocket.GAME_FINISH){
                    var name = serverData.nameList;
                    var score = serverData.scoreList;
                    var j = score.indexOf(Math.max.apply(Math, score));
                    var results = [];
                    var ind;

                    // the while loop stops when there are no more found
                    for ( i=0; i < score.length; i++ ){
                        if ( score[i] == Math.max.apply(Math, score)){
                            results.push( i );
                        }
                    }

                    $("#restartBtn").hide();

                    if(results.length>1){
                        $("#popup").removeClass("hide");
                        $("#winner").html("Draw");
                        $("#score").html(score[j]);
                    }else{
                        $("#popup").removeClass("hide");
                        $("#winner").html(name[j] + " Won!");
                        $("#score").html(score[j]);
                    }

                    setTimeout(function(){
                        if(name[0]==username){
                            restartGame();
                        }
                    }, 5000);


                }

            }
        };

        // on close event
        clientSocket.socket.onclose = function (e) {
            $("#chat").append("Everyone please leave the game, come back in 30 minutes!");
        };

        clientSocket.socket.onerror = function (e) {
            $("#chat").append("Everyone please leave the game, come back in 30 minutes!");
            localStorage.clear();
        };
    }else{
        alert("WebSockets not supported! Test this application in other browsers, like Chrome, Firefox, Safari!");
        return;
    }

    $("#send").click(sendMsgToUsers);
    $("#input").keypress(function (event) {
        if (event.keyCode === 13) {
            sendMsgToUsers();
        }
    });

    $("#restart").hide();
    $("#restart").click(function () {
        canvasBoard.width = canvasBoard.width;
        $("#input").html("");
        var jsonDataServer = {};
        jsonDataServer.dataType = clientSocket.LOGIC;
        jsonDataServer.gameState = clientSocket.GAME_RELOAD;
        clientSocket.socket.send(JSON.stringify(jsonDataServer));
        $("#restart").hide();
    });

    $("#restartBtn").click(function () {
        canvasBoard.width = canvasBoard.width;
        $("#input").html("");
        //addToChat("Restarting Game<br>");
        // pack the restart message into an object.
        var jsonDataServer = {};
        jsonDataServer.dataType = clientSocket.LOGIC;
        jsonDataServer.gameState = clientSocket.GAME_RELOAD;
        jsonDataServer.reset = true;
        clientSocket.socket.send(JSON.stringify(jsonDataServer));
        $("#popup").addClass("hide");

    });

    $("#reset").hide();
    $("#reset").click(function () {
        canvasBoard.width = canvasBoard.width;
        $("#input").html("");
        var jsonDataServer = {};
        jsonDataServer.dataType = clientSocket.LOGIC;
        jsonDataServer.gameState = clientSocket.GAME_RELOAD;
        clientSocket.socket.send(JSON.stringify(jsonDataServer));
        $("#reset").hide();
    });

    $("#draw-board").bind("mousedown touchstart",function (e) {
        //Two events binded

        if(clientSocket.isDrawing){
            //console.log("player drawing");
        }
        e.preventDefault();
        var ctxPosition = $(this).offset();
        //Touch Events Obtained
        var Input = e.originalEvent.touches && e.originalEvent.touches[0]; //Touch Events Obtained


        var pagePositionX =  (Input || e).pageX;
        var pagePositionY =  (Input || e).pageY;

        var mousePosX = pagePositionX - ctxPosition.left;
        var mousePosY = pagePositionY - ctxPosition.top;

        clientSocket.X = mousePosX;
        clientSocket.Y = mousePosY;

        clientSocket.isDrawing = true;
    });


    $("#draw-board").bind("mousemove touchmove", function(e) {
        if (clientSocket.isTurnToDraw && clientSocket.isDrawing) {

            e.preventDefault();
            var ctxPosition = $(this).offset();
            //Touch Events Obtained
            var Input = e.originalEvent.touches && e.originalEvent.touches[0];

            var pagePositionX =  (Input || e).pageX;
            var pagePositionY =  (Input || e).pageY;

            var mousePosX = pagePositionX - ctxPosition.left;
            var mousePosY = pagePositionY - ctxPosition.top;

            var pointerX = mousePosX;
            var pointerY = mousePosY;

            if (!(pointerX == clientSocket.X && pointerY == clientSocket.Y)) {
                drawingPath(canvasCTX, clientSocket.X, clientSocket.Y, pointerX, pointerY, line_thickness, strokeStyle);

                var jsonDataServer = {};
                jsonDataServer.dataType = clientSocket.LINE;
                jsonDataServer.X = clientSocket.X;
                jsonDataServer.Y = clientSocket.Y;
                jsonDataServer.endX = pointerX;
                jsonDataServer.endY = pointerY;
                jsonDataServer.lineThickness = line_thickness;
                jsonDataServer.color = strokeStyle;

                if (easeAll) {
                    console.log("date.easerAll = true")
                    jsonDataServer.easerAll = easeAll;
                }

                clientSocket.socket.send(JSON.stringify(jsonDataServer));

                jsonDataServer.easerAll = false;
                easeAll = false;

                clientSocket.X = pointerX;
                clientSocket.Y = pointerY;
            }
        }
    });

    $("#draw-board").bind("mouseup touchend", function(e) {
        clientSocket.isDrawing = false;
    });


    /*******/

    $("#draw").click(function (e) {
        strokeStyle = "#000000";
        canvasCTX.strokeStyle = "#000000";
        line_thickness = 1;
    });

    $('#color-chooser').change(function (e) {
        canvasCTX.strokeStyle = document.getElementById("color-chooser").value;
        strokeStyle = document.getElementById("color-chooser").value;
    });

    $('#eraser').click(function (e) {
        canvasCTX.strokeStyle = "#f1f3ef";
        strokeStyle = "#f1f3ef";
        line_thickness = 10;
    });

    $('#eraser-all').click(function (e) {
        canvasCTX.clearRect(0, 0, canvasCTX.canvas.width, canvasCTX.canvas.height);
        easeAll = true;
    });

    $('#pen-size').change(function () {
        line_thickness = $('#pen-size').val();
    });

}




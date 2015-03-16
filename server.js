// ------------------------ Version 2

var static = require('node-static');
var http = require('http');
var file = new(static.Server)();


// titi: Factorisation des variables d'environnement 
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1" ;
var port = process.env.OPENSHIFT_NODEJS_PORT || 2013;

var app = http.createServer(function (req, res) {
  file.serve(req, res);
// }).listen(port); // titi: 404/503 sur Openshift... Remplacé par >>>
}).listen( port, ipaddress, function() { 
    console.log((new Date()) + ' Server is on the IP adress '+ipaddress); // débugg
    console.log((new Date()) + ' Server is listening on port '+port); // Débugg
});


// M.Buffa. Rappel des trois syntaxes de socket.io
// socket = un tuyau relié à un client. C'est un objet unique par client.
// Donc si on fait socket.n = 3; c'est comme si on ajoutait une propriété
// "n" à la session dédiée au client connecté. 
// socket.emit(type_message, data) = envoie un message juste au client connecté
// socket.broadcast.emit(type_message, data1, data2) = envoie à tous les clients sauf au client connecté
// io.sockets.emit(type_message, data1, data2) = envoie à tous les clients y compris au client connecté.
// Variantes avec les "room" :
// socket.broadcast.to(nom de la salle).emit(...) = tous sauf client courant, mais de la salle
// io.sockets.in(nom de la salle).emit(...) = tous les clients de la salle y compris le client courant.


var io = require('socket.io').listen(app);
// titi: Contrôle de la version de socket.io et débugg openshift
console.log("**Socket.IO Version: " + require('socket.io/package').version);
console.log('**Server is on the IP adress '+ipaddress);
console.log('**Server is listening on port '+port);

/*// titi: Variables a passer coté client
var messageIoVersion = "Server Socket.IO Version >>> " + require('socket.io/package').version;
var messageIPServer = "Server is on the IP adress "+ipaddress;
var messagePortServer = "Server  is listening on port "+port;
/**/


io.sockets.on('connection', function (socket){

	// A finir pour passer des variables coté client...
	//log('Got message: ', message);
	//socket.broadcast.emit('message', message); // should be room only

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}
	
	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	
	socket.on('create or join', function (room) {
		var numClients = io.sockets.clients(room).length;
		// -- reprise original
		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);
		if (numClients == 0){
			socket.join(room);
			socket.emit('created', room);
		} else if (numClients == 1) {
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room);
		} else { // max two clients
			socket.emit('full', room);
		}
	});
	

});

/**/




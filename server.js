
/*
var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
// Titi :  Factorisation du numéro de port
// Teste si présence d'une variable d'environnement Hosting (Heroku) sinon port 2013 pour local 
var port = process.env.PORT || 2013;

var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port);



console.log('listen on port'+port);

// var express = require('express');
// var app = express();
// console.log(express.static(__dirname + '/js'));
// app.use(express.static(__dirname + '/js'));
// app.all('*', function(req, res){
// 	res.sendfile("index.html");
// });

// app.listen(9000);

// M.Buffa. Rappel des trois syntaxes de socket.io
// socket = un tuyau relié à un client. C'est un objet unique par client.
//      Donc si on fait socket.n = 3; c'est comme si on ajoutait une propriété
// 		"n" à la session dédiée au client connecté. 
// socket.emit(type_message, data) = envoie un message juste au client connecté
// socket.broadcast.emit(type_message, data1, data2) = envoie à tous les clients
// 		sauf au client connecté
// io.sockets.emit(type_message, data1, data2) = envoie à tous les clients y compris
// 		au client connecté.
// 	Variantes avec les "room" :
// 	socket.broadcast.to(nom de la salle).emit(...) = tous sauf client courant, mais
// 													 de la salle
// io.sockets.in(nom de la salle).emit(...) = tous les clients de la salle y compris
// 											  le client courant.

var io = require('socket.io').listen(app);
// Titi - Contrôle de la version de socket.io
console.log("**Socket.IO Version: " + require('socket.io/package').version);


io.sockets.on('connection', function (socket){

	// Permet d'envoyer des traces au client distant
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
		//socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		//socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

	});

});
/**/

// ------------------------ Version 2

var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1" ;
var port = process.env.OPENSHIFT_NODEJS_PORT || 2013;
/*
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port);
/**/
// console.log('Port >>> '+port);
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen( port, ipaddress, function() {
    console.log((new Date()) + ' Server is on the IP adress '+ipaddress);
    console.log((new Date()) + ' Server is listening on port '+port);
});



console.log('listen on port'+port);
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){
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



/*
var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

 // Add pour 1-openshift 2-heroku 3-local
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "127.0.0.1" ;
var port      = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 2013;
app.set('port', port); // Pour Openshift

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


io.sockets.on('connection', function (socket){
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

server.listen(app.get('port'),ipaddress);
/***/
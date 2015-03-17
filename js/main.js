'use strict';

var sendChannel;
var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");

// titi: pour afficher les données "Candidate finales de chaque client
var infoIceCandidateReceive = document.getElementById("infoIceCandidateReceived");
var infoIceCandidateSend = document.getElementById("infoIceCandidateSended");

sendButton.onclick = sendData;

var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var turnReady;


//var io = require('socket.io');
// Titi - Contrôle de la version de socket.io
// >>>> Vérification de concordance entre local et Hosted
// console.log("**Socket.IO Version: " + require('socket.io/package').version);
//console.log("test");
//var toto = require('socket.io');

// titi: Pkoi ce test pr firefox ????
// titi: Et c'est quoi cette syntaxe à la mord mois le noeud ????
// Configuration des serveurs stun...
/*
var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
/**/


/*// Hack titi :
var pc_config = {'iceServers':[{'url':'stun:23.21.150.121'}]};
pc_config.iceServers.push({url: 'stun:stun.l.google.com:19302'});
//tool.traceObjectDump(peerConnectionServer,'script. getPeerConnectionServers()');
//pc_config.iceServers.push({url: 'stun:stun1.l.google.com:19302'});
//pc_config.iceServers.push({url: 'stun:stun2.1.google.com:19302'}); 
//pc_config.iceServers.push({url: 'stun:stun3.1.google.com:19302'});
//pc_config.iceServers.push({url: 'stun:stun4.1.google.com:19302'});
// Ajout d'un serveur' TURN
// pc_config.iceServers.push({url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "louis%40mozilla.com"});
pc_config.iceServers.push({url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "temp20fev2015@gmail.com"});
// -- end Hack
/**/

// titi: instanciation de mes outils de débugg
var tool = new utils();
// tool.testutils('librairie utils active...');

// titi: On fait au plus simple la déclaration des serveurs stun/turn
var pc_config = {
    iceServers: [
        // {url: "stun:23.21.150.121"},
        // {url: "stun:stun.l.google.com:19302"}
        // {url: 'turn:turn.anyfirewall.com:443?transport=tcp', credential: 'webrtc', username: 'azkarproject'}
        // {url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "temp20fev2015@gmail.com"}
    ]
}

// titi: Hack pour connaitre l'adresse Ip locale/réseau du client
var lastCandidate;



// Peer connection constraints
// note titi: Selon le type de connexion, on peux passer des options.
var pc_constraints = {
  'optional': [
    {'DtlsSrtpKeyAgreement': true}, // titi: DtlsSrtpKeyAgreement est exigé pour Chrome et Firefox pour interagir.
    {'RtpDataChannels': true} // titi: RtpDataChannels est nécessaire si nous voulons utiliser l'API DataChannels sur Firefox.
  ]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};

// titi - constraints 
var constraints = {
          audio: true,
          video: {
              mandatory : {
                  maxWidth    : 300,
                  maxHeight   : 180  
              }
          }
    };

// var constraints = {video: true};



/////////////////////////////////////////////

// Permet d'indiquer une "room" dans le path
var room = location.pathname.substring(1);
if (room === '') {
//  room = prompt('Enter room name:');
  room = 'foo';
} else {
  //
}

// Demande de connexion au serveur de sockets. Si on regarde le code du
// server dans server.js on verra que si on est le premier client connecté
// on recevra un message "created", sinon un message "joined"
var socket = io.connect();

if (room !== '') {
  console.log('Create or join room', room);
  socket.emit('create or join', room);
}

// Si on reçoit le message "created" alors on est l'initiateur du call
socket.on('created', function (room){
  console.log('Created room ' + room);
  isInitiator = true;
});

// On a essayé de rejoindre une salle qui est déjà pleine (avec deux personnes)
socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

// Jamais appelé, à mon avis une trace de la version nxn
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

// Si on reçoit le message "joined" alors on a rejoint une salle existante
// on est pas l'initiateur, il y a déjà quelqu'un (l'appelant), donc
// on est prêt à communiquer...
socket.on('joined', function (room){
  console.log('This peer has joined room ' + room);
  isChannelReady = true;
});

// Appelé par le serveur pour faire des traces chez les clients connectés
socket.on('log', function (array){
  console.log.apply(console, array);
});

////////////////////////////////////////////////

// Envoi de message générique, le serveur broadcaste à tout le monde
// par défaut (ce sevrait être que dans la salle courante...)
// Il est important de regarder dans le code de ce fichier quand on envoit
// des messages.
function sendMessage(message){
  // console.log('Sending message: ', message);
  socket.emit('message', message);
}
 
// Récéption de message générique.
socket.on('message', function (message){
 

  if (message === 'got user media') {
    // On ouvre peut-être la connexion p2p
  	maybeStart();
  
 
 // on a recu une "offre"
  } else if (message.type === 'offer') {

    // On initialise la connexion p2p si on est pas l'apellant
    // et si elle n'est pas déjàs ouverte...
    if (!isInitiator && !isStarted) {
      maybeStart();
    }

    // si on reçoit une offre, on va initialiser dans la connexion p2p
    // la "remote Description", avec le message envoyé par l'autre pair 
    // (et recu ici)
    pc.setRemoteDescription(new RTCSessionDescription(message));

    // On envoie une réponse à l'offre.
    doAnswer();
  
  
  // On a reçu une réponse à l'offre envoyée, on initialise la 
  // "remote description" du pair.
  } else if (message.type === 'answer' && isStarted) {
    
    pc.setRemoteDescription(new RTCSessionDescription(message));
  
  // On a recu un "ice candidate" et la connexion p2p est déjà ouverte
  } else if (message.type === 'candidate' && isStarted) {
    
    // On ajoute cette candidature à la connexion p2p. 
    var candidate = new RTCIceCandidate({
      sdpMLineIndex:message.label,
      candidate:message.candidate
    });
    
    pc.addIceCandidate(candidate);
    
    // titi: on copie le dernier candidat reçut ds une variable de contrôle
    lastCandidate = candidate;
 
  // 
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
 
 // titi: Modification du message pour meilleure lisibilité logs ...
 console.log('Received message: >>>', message);

});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

function handleUserMedia(stream) {
  localStream = stream;
  attachMediaStream(localVideo, stream);
  console.log('Adding local stream.');

  // On envoie un message à tout le monde disant qu'on a bien
  // overt la connexion video avec la web cam.
  sendMessage('got user media');

  // Si on est l'appelant on essaie d'ouvrir la connexion p2p
  if (isInitiator) {
    maybeStart();
  }
}

function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
}





getUserMedia(constraints, handleUserMedia, handleUserMediaError);
console.log('Getting user media with constraints', constraints);


// On regarde si on a besoin d'un serveur TURN que si on est pas en localhost
// Add Titi: Et aussi si c'est pas 127.0.0.1 !!!!!
if ( (location.hostname != "localhost") && (location.hostname != '127.0.0.1') ) {
  console.log("Distant hosting !!!");
  // requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
} else {
  console.log("Local hosting !!!");
};


// titi >>> Pour tests et forcer le chargement du turn
// console.log('@>>>> requestTurn forcé');
// requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');


/**/

// On démarre peut être l'appel (si on est appelant) que quand on a toutes les 
// conditons. Si on est l'appelé on n'ouvre que la connexion p2p   
// isChannelReady = les deux pairs sont dans la même salle virtuelle
//                  via websockets
// localStream = on a bien accès à la caméra localement,
// !isStarted = on a pas déjà démarré la connexion.
// En résumé : on établit la connexion p2p que si on a la caméra et les deux
// pairs dans la même salle virtuelle via WebSockets (donc on peut communiquer
// via WebSockets par sendMessage()...)
function maybeStart() {
  if (!isStarted && localStream && isChannelReady) {
    // Ouverture de la connexion p2p
    createPeerConnection();
    // on donne le flux video local à la connexion p2p. Va provoquer un événement 
    // onAddStream chez l'autre pair.
    pc.addStream(localStream);
    // On a démarré, utile pour ne pas démarrer le call plusieurs fois
    isStarted = true;
    // Si on est l'appelant on appelle. Si on est pas l'appelant, on ne fait rien.
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function(e){
	sendMessage('bye');
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    // Ouverture de la connexion p2p
    pc = new RTCPeerConnection(pc_config, pc_constraints);

    // ecouteur en cas de réception de candidature
    pc.onicecandidate = handleIceCandidate;

    console.log('Created RTCPeerConnnection with:\n' +
      '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
      '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
  // Ecouteur appelé quand le pair a enregistré dans la connexion p2p son
  // stream vidéo.
  pc.onaddstream = handleRemoteStreamAdded;

  // Ecouteur appelé quand le pair a retiré le stream vidéo de la connexion p2p
  pc.onremovestream = handleRemoteStreamRemoved;

  // Data channel. Si on est l'appelant on ouvre un data channel sur la 
  // connexion p2p
  if (isInitiator) {
    try {
      // Reliable Data Channels not yet supported in Chrome
      sendChannel = pc.createDataChannel("sendDataChannel",
        {reliable: false});

      // écouteur de message reçus
      sendChannel.onmessage = handleMessage;

      trace('Created send data channel');
    } catch (e) {
      alert('Failed to create data channel. ' +
            'You need Chrome M25 or later with RtpDataChannel enabled');
      trace('createDataChannel() failed with exception: ' + e.message);
    }

    // ecouteur appelé quand le data channel est ouvert
    sendChannel.onopen = handleSendChannelStateChange;
    // idem quand il est fermé.
    sendChannel.onclose = handleSendChannelStateChange;
  } else {
    // ecouteur appelé quand le pair a enregistré le data channel sur la 
    // connexion p2p
    pc.ondatachannel = gotReceiveChannel;
  }
}

function sendData() {
  var data = sendTextarea.value;
  sendChannel.send(data);
  trace('Sent data: ' + data);
}

// function closeDataChannels() {
//   trace('Closing data channels');
//   sendChannel.close();
//   trace('Closed data channel with label: ' + sendChannel.label);
//   receiveChannel.close();
//   trace('Closed data channel with label: ' + receiveChannel.label);
//   localPeerConnection.close();
//   remotePeerConnection.close();
//   localPeerConnection = null;
//   remotePeerConnection = null;
//   trace('Closed peer connections');
//   startButton.disabled = false;
//   sendButton.disabled = true;
//   closeButton.disabled = true;
//   dataChannelSend.value = "";
//   dataChannelReceive.value = "";
//   dataChannelSend.disabled = true;
//   dataChannelSend.placeholder = "Press Start, enter some text, then press Send.";
// }

// Le data channel est créé par l'appelant. Si on entre dans cet écouteur
// C'est qu'on est l'appelé. On se contente de le récupérer via l'événement
function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  sendChannel = event.channel;
  sendChannel.onmessage = handleMessage;
  sendChannel.onopen = handleReceiveChannelStateChange;
  sendChannel.onclose = handleReceiveChannelStateChange;
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
  receiveTextarea.value = event.data;
}

function handleSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  enableMessageInterface(readyState == "open");
}

function handleReceiveChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Receive channel state is: ' + readyState);
  enableMessageInterface(readyState == "open");
}

function enableMessageInterface(shouldEnable) {
    if (shouldEnable) {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
    sendButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
  }
}

function handleIceCandidate(event) {
  // On a recu une candidature, c'est le serveur STUN qui déclenche l'event
  // quand il a réussi à déterminer le host/port externe.
  console.log('handleIceCandidate event: ', event);

  if (event.candidate) {
    // On envoie cette candidature à tout le monde.
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    
    var debugCandidate = tool.stringObjectDump(lastCandidate,'candidate');
    //infoIceCandidateReceive.value = lastCandidate;
    infoIceCandidateReceive.innerHTML = debugCandidate;
    console.log('End of candidates.');
  }
}

// Exécuté par l'appelant uniquement
function doCall() {
  // M.Buffa : les contraintes et les configurations (SDP) sont encore 
  // supportées différements selon les browsers, et certaines propriétés du 
  // standard officiel ne sont pas encore supportées... bref, c'est encore
  // un peu le bazar, d'où des traitement bizarres ici par exemple...
  var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
  // temporary measure to remove Moz* constraints in Chrome
  if (webrtcDetectedBrowser === 'chrome') {
    for (var prop in constraints.mandatory) {
      if (prop.indexOf('Moz') !== -1) {
        delete constraints.mandatory[prop];
      }
     }
   }
  constraints = mergeConstraints(constraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n' +
    '  \'' + JSON.stringify(constraints) + '\'.');

  // Envoi de l'offre. Normalement en retour on doit recevoir une "answer"
  pc.createOffer(setLocalAndSendMessage, null, constraints);
}

// Exécuté par l'appelé uniquement...
function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

// callback de createAnswer et createOffer, ajoute une configuration locale SDP
// A la connexion p2p, lors de l'appel de createOffer/answer par un pair.
// Envoie aussi la description par WebSocket. Voir le traitement de la réponse
// au début du fichier sans socket.on("message" , ...) partie "answer" et "offer"
function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  // M.Buffa : là c'est de la tambouille compliquée pour modifier la 
  // configuration SDP pour dire qu'on préfère un codec nommé OPUS (?)
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);

  pc.setLocalDescription(sessionDescription);

  // Envoi par WebSocket
  sendMessage(sessionDescription);
}


// titi: inutile si les stun/turn sont préalablement renseignés ???
/*
// regarde si le serveur turn de la configuration de connexion
// (pc_config) existe, sinon récupère l'IP/host d'un serveur
// renvoyé par le web service computeengineondemand.appspot.com
// de google. La requête se fait en Ajax, résultat renvoyé en JSON.
function requestTurn(turn_url) {
  
  

  var turnExists = false;
  
  

  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });

        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();




  }
}
/**/

// Ecouteur de onremotestream : permet de voir la vidéo du pair distant dans 
// l'élément HTML remoteVideo
function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
 // reattachMediaStream(miniVideo, localVideo);
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
  //  waitForRemoteVideo();

  // titi: on regarde si on trouves pas des données ICE Candidate ds le flux vidéo apellant
  // var objectDebugg = tool.stringObjectDump(remoteStream,"remoteStream");
  // alert (objectDebugg);
  // Bon, au final ca donne rien...
  
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

// bouton "on raccroche"
function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

// Fermeture de la connexion p2p
function stop() {
  isStarted = false;
  // isAudioMuted = false;
  // isVideoMuted = false;
  pc.close();
  pc = null;
}

///////////////////////////////////////////
// M.Buffa : tambouille pour bidouiller la configuration sdp
// pour faire passer le codec OPUS en premier....
// 
// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}


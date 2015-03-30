'use strict';

var sendChannel;
var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");

// titi: pour afficher les donnees "Candidate finales de chaque client
var infoIceCandidateReceive = document.getElementById("infoIceCandidateReceived");
var infoIceCandidateSend = document.getElementById("infoIceCandidateSended");
// titi: flag de selection de type de serveur...
var validChoiceP2pStunTurn  = false;
var forceServer = false;
//var forceServer = "p2p";
var forceServer = "stun";
//var forceServer = "turn";

sendButton.onclick = sendData;

var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var turnReady;


// titi: Pkoi ce test pr firefox ????
// titi: Et c'est quoi cette syntaxe a la mord mois le noeud ????
// Configuration des serveurs stun...
/*
var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
/**/

// Hack titi :
var pc_config = {'iceServers':[{'url':'stun:23.21.150.121'}]};
pc_config.iceServers.push({url: 'stun:stun.l.google.com:19302'});
// pc_config.iceServers.push({url: 'stun:stun1.l.google.com:19302'});
// pc_config.iceServers.push({url: 'stun:stun2.1.google.com:19302'}); 
// pc_config.iceServers.push({url: 'stun:stun3.1.google.com:19302'});
// pc_config.iceServers.push({url: 'stun:stun4.1.google.com:19302'});
pc_config.iceServers.push({url: 'stun:stun.anyfirewall.com:3478'});
pc_config.iceServers.push({url: 'stun:turn1.xirsys.com'});
// Ajout de serveurs TURN
pc_config.iceServers.push({url: "turn:turn.bistri.com:80", credential: "homeo", username: "homeo"});
pc_config.iceServers.push({url: 'turn:turn.anyfirewall.com:443?transport=tcp', credential: 'webrtc', username: 'azkarproject'});
pc_config.iceServers.push({url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "temp20fev2015@gmail.com"});
pc_config.iceServers.push({url: "turn:turn.anyfirewall.com:443?transport=tcp", credential: "webrtc", username: "webrtc"});
pc_config.iceServers.push({url: "turn:turn1.xirsys.com:443?transport=tcp", credential: "b8631283-b642-4bfc-9222-352d79e2d793", username: "e0f4e2b6-005f-440b-87e7-76df63421d6f"});
// -- / end Hack


// titi: instanciation de mes outils de debugg
var tool = new utils();
// tool.testutils('librairie utils active...');


// Peer connection constraints
// note titi: Selon le type de connexion, on peux passer des options.
var pc_constraints = {
  'optional': [
    {'DtlsSrtpKeyAgreement': true}, // titi: DtlsSrtpKeyAgreement est exige pour Chrome et Firefox pour interagir.
    {'RtpDataChannels': true} // titi: RtpDataChannels est necessaire si nous voulons utiliser l'API DataChannels sur Firefox.
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
// server dans server.js on verra que si on est le premier client connecte
// on recevra un message "created", sinon un message "joined"
var socket = io.connect();

if (room !== '') {
  console.log('Create or join room', room);
  socket.emit('create or join', room);
}

// Si on recoit le message "created" alors on est l'initiateur du call
socket.on('created', function (room){
  console.log('Created room ' + room);
  isInitiator = true;
});

// On a essaye de rejoindre une salle qui est deja pleine (avec deux personnes)
socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

// Jamais appele, a mon avis une trace de la version nxn
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

// Si on recoit le message "joined" alors on a rejoint une salle existante
// on est pas l'initiateur, il y a deja quelqu'un (l'appelant), donc
// on est pret a communiquer...
socket.on('joined', function (room){
  console.log('This peer has joined room ' + room);
  isChannelReady = true;
});

// Appele par le serveur pour faire des traces chez les clients connectes
socket.on('log', function (array){
  console.log.apply(console, array);
});

////////////////////////////////////////////////

// Envoi de message generique, le serveur broadcaste a tout le monde
// par defaut (ce sevrait etre que dans la salle courante...)
// Il est important de regarder dans le code de ce fichier quand on envoit
// des messages.
function sendMessage(message){
  // console.log('Sending message: ', message);
  socket.emit('message', message);
}
 
// Reception de message generique.
socket.on('message', function (message){
 

  // console.log ("// --- Reception de message > socket.on('message')");
  
  if (message === 'got user media') {
    // console.log ("// > On ouvre peut-etre la connexion p2p > message === if 'got user media' > maybeStart()");
    console.log ("// Message 'got user media'");
    console.log ("// >>>>>>>> maybeStart() (On ouvre peut-etre la connexion p2p)");
    // On ouvre peut-etre la connexion p2p
  	maybeStart();
    
 
  // on a recu une "offre"
  } else if (message.type === 'offer') {
    console.log ("// Message 'offer' ");

    //console.log ("// > on a recu une 'offre' > else if message.type === 'offer'");
    // On initialise la connexion p2p si on est pas l'apellant
    // et si elle n'est pas dejas ouverte...
    if (!isInitiator && !isStarted) {
      console.log ("// >>>>>>>> if (!isInitiator && !isStarted) > maybeStart()");
      maybeStart();
    }

    // si on recoit une offre, on va initialiser dans la connexion p2p
    // la "remote Description", avec le message envoye par l'autre pair 
    // (et recu ici)
    console.log ("// >>>> on itinialise la remote description ds la connexion p2p");
    console.log ("// >>>> avec le message de recu de l'autre pair.... ");
    console.log ("// >>>> pc.setRemoteDescription(new RTCSessionDescription(message)); ");
    pc.setRemoteDescription(new RTCSessionDescription(message));

    // On envoie une reponse a l'offre.
    console.log ("// >>>> // On envoie une reponse a l'offre > doAnswer();");
    doAnswer();
  
  
  // On a recu une reponse a l'offre envoyee, on initialise la 
  // "remote description" du pair.
  } else if (message.type === 'answer' && isStarted) {
    console.log ("// Message 'answer'(on a recu une reponse a l'offre envoyee)");
    console.log ("// >>>> on itinialise la remote description du pair > ");
    console.log ("// >>>> pc.setRemoteDescription(new RTCSessionDescription(message)); ");
    pc.setRemoteDescription(new RTCSessionDescription(message));


  // On a recu un "ice candidate" et la connexion p2p est deja ouverte
  } else if (message.type === 'candidate' && isStarted) {
    console.log ("// Message 'candidate' (on reçoit un Ice Candidate)");
    // console.log ("// >>>> On cree une nouvelle candidature a partir du message >  var candidate = new RTCIceCandidate({..}])");
    // On ajoute cette candidature a la connexion p2p. 
    var candidate = new RTCIceCandidate({
      sdpMLineIndex:message.label,
      candidate:message.candidate
    });
    
    // ----------------------

    //var debugIceCandidate = tool.stringObjectDump(handleIceCandidate,'====== candidate =======');
    //console.log(debugIceCandidate);
    


    //var debugCandidate = tool.stringObjectDump(lastCandidate,'candidate');
   
    // titi: Affichage du type de candidature 
    var iceCandidateTesting = candidate.candidate;
    if (iceCandidateTesting.indexOf('typ host') != -1) {
      console.log("// >>>>  type de candidature p2p > host");
    } else if (iceCandidateTesting.indexOf('typ srflx') != -1) {
      console.log("// >>>>  type de candidature p2p > STUN...");
    } else if (iceCandidateTesting.indexOf('typ relay') != -1) {
      console.log("// >>>>  type de candidature p2p > TURN...");
    } else {
      console.log("// >>>>  type de candidature p2p > ???");   
    }
    /**/

    



    // titi: Forcage STUN/TURN et direct p2p...
    // suffit de mettre le type choisi a true et les autres a false
    
    //var directp2p     = false;
    //var stunp2p       = false;
    //var turnp2p       = false;

    /*var forceTypeTurn = "p2p";
    //var forceTypeTurn = "stun";
    //var forceTypeTurn = "turn";
    //alert ('toto');
    if(iceCandidateTesting.indexOf('typ host') != -1) {
      console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
      //return;
    }
    /**/
     //if (iceCandidateTesting.indexOf('typ host') != -1) {


    /*
    else if(stunp2p && iceCandidateTesting.indexOf('srflx') == -1){
      return;
    } 
    else if(turnp2p && iceCandidateTesting.indexOf('relay') == -1) {
      return;
    }
    /**/


    



    // -------------------------------------------

    // On ajoute cette candidature a la connexion p2p (suite...). 
    // console.log ("// >>>> On ajoute cette candidature a la connexion p2p >  pc.addIceCandidate(candidate);");
    pc.addIceCandidate(candidate);
    
    // titi: on copie le dernier candidat recut ds une variable de contrôle
    // lastCandidate = candidate;
 
  // 
  } else if (message === 'bye' && isStarted) {
    console.log ("// Message 'bye'");
    console.log ("// >>>> On coupe la remote video >  handleRemoteHangup()");
    handleRemoteHangup();
  }
 
 // titi: Modification du message pour meilleure lisibilite logs ...
 // console.log('Received message: >>>', message);

});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

function handleUserMedia(stream) {
  
  localStream = stream;
  attachMediaStream(localVideo, stream);
  console.log('Adding local stream.');

  // On envoie un message a tout le monde disant qu'on a bien
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
// console.log('@>>>> requestTurn force');
// requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');


/**/

// On demarre peut etre l'appel (si on est appelant) que quand on a toutes les 
// conditions. Si on est l'appele on n'ouvre que la connexion p2p   
// isChannelReady = les deux pairs sont dans la meme salle virtuelle  via websockets
// localStream = on a bien acces a la camera localement,
// !isStarted = on a pas deja demarre la connexion.
// En resume : on etablit la connexion p2p que si on a la camera et les deux
// pairs dans la meme salle virtuelle via WebSockets (donc on peut communiquer
// via WebSockets par sendMessage()...)
function maybeStart() {
  
  
  if (!isStarted && localStream && isChannelReady) {
    console.log(">>> maybeStart() > if (!isStarted && localStream && isChannelReady)");
    console.log(">>>>>> // Ouverture de la connexion p2p >createPeerConnection()");
    // Ouverture de la connexion p2p
    createPeerConnection();
    


    // on donne le flux video local a la connexion p2p. Va provoquer un evenement 
    // onAddStream chez l'autre pair.
    console.log(">>>>>> // on donne le flux video local a la connexion p2p");
    console.log(">>>>>> // Va provoquer un evenement onAddStream chez l'autre pair.")
    console.log(">>>>>> pc.addStream(localStream)");
    pc.addStream(localStream);
    
    // On a demarre, utile pour ne pas demarrer le call plusieurs fois
    console.log(">>>>>> // On a demarre, utile pour ne pas demarrer le call plusieurs fois > isStarted = true")
    isStarted = true;
    
    // Si on est l'appelant on appelle. Si on est pas l'appelant, on ne fait rien.
    // note titi: provoque bug d'ouverture du stram distant en cas de déco/reco...
    // note titi: pour débug, faire un docall() systématique et + de problèmes de décco/reco
    /*// Désactivé >>>>>
    console.log(">>>>>> // Si on est l'appelant on appelle. Si on est pas l'appelant, on ne fait rien.")
    if (isInitiator) {
       console.log(">>>>>> if (isInitiator) > doCall() ");
       doCall();
    }
    /**/// Remplacé par >>>
    doCall();
  } 
}

window.onbeforeunload = function(e){
	sendMessage('bye');
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  
  console.log(">>> createPeerConnection() ================================");

  try {
    
    // Ouverture de la connexion p2p
    console.log ( '// try > pc = new RTCPeerConnection(pc_config, pc_constraints)');
    pc = new RTCPeerConnection(pc_config, pc_constraints);

    console.log ( "// ecouteur reception de candidature > pc.onicecandidate = handleIceCandidate");
    pc.onicecandidate = handleIceCandidate;

    // ---- >>> débugg
    
    // var debugIceCandidate = tool.stringObjectDump(handleIceCandidate,'====== candidate =======');
    // console.log(debugIceCandidate);
    
    // var debugPC = tool.stringObjectDump(pc,'====== objet pc =======');
    // console.log(debugPC);

    // ---- /// débugg  
    

    // titi - Forcage des serveurs TURN...
    // Voir http://www.w3.org/TR/webrtc/#idl-def-RTCIceTransportPolicy
    // "none": ICE n'envoie ni ne recevoit des paquets au niveau de ce point.
    // "relay": ICE utilise uniquement des candidats TURN. par exemple pour reduire les fuites d'adresses IP dans certains cas d'utilisation.
    // "all": ICE peut utiliser ne importe quel type de candidats lorsque cette valeur est specifiee.
    // pc_config.iceTransportPolicy = "none";
        

    console.log('// Created RTCPeerConnnection with:\n' +
      '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
      '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
  

  } catch (e) {
    console.log('// catch(e) > Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    console.log(">>> // createPeerConnection() ================================");
      return;
  }
  
  // Ecouteur appelé quand le pair a enregistré dans la connexion p2p son stream video.
  console.log ( "// ecouteur reception ajout stream > pc.onicecandidate = handleIceCandidate");
  pc.onaddstream = handleRemoteStreamAdded;

  // Ecouteur appelé quand le pair a retiré le stream video de la connexion p2p
  console.log ( "// ecouteur reception retrait stream > pc.onaddstream = handleRemoteStreamAdded");
  pc.onremovestream = handleRemoteStreamRemoved;

  // Data channel. Si on est l'appelant on ouvre un data channel sur la connexion p2p
  if (isInitiator) {
    console.log ( "// if is initiator >...");
    
    
    try {
      // Reliable Data Channels not yet supported in Chrome
      console.log ( '// >>>> try > sendChannel = pc.createDataChannel("sendDataChannel",{reliable: false} )');
      sendChannel = pc.createDataChannel("sendDataChannel",{reliable: false});

      // ecouteur de message recus
      console.log ( "// >>>> ecouteur de message recus > sendChannel.onmessage = handleMessage");
      sendChannel.onmessage = handleMessage;
      // trace('Created send data channel');
    } catch (e) {
      alert('Failed to create data channel. ' +
            'You need Chrome M25 or later with RtpDataChannel enabled');
      //trace('createDataChannel() failed with exception: ' + e.message);
      console.log ( '// >>>> catch(e) > failed with exception: ' + e.message);
    }

    // ecouteur appele quand le data channel est ouvert
    console.log ( "// >> ecouteur ouverture data Channel > sendChannel.onopen = handleSendChannelStateChange");
    sendChannel.onopen = handleSendChannelStateChange;
    
    // idem quand il est ferme.
    console.log ( "// >> ecouteur fermeture data Channel >  sendChannel.onclose = handleSendChannelStateChange");
    sendChannel.onclose = handleSendChannelStateChange;
 
  } else {
    console.log ( "// if is NOT initiator >...");
    // ecouteur appele quand le pair a enregistre le data channel sur la connexion p2p
    console.log ( "// >> ecouteur enregistrement data Channel sur connexion p2p > pc.ondatachannel = gotReceiveChannel");
    pc.ondatachannel = gotReceiveChannel;
  }

  console.log(">>> // createPeerConnection() ================================");


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

// Le data channel est cree par l'appelant. Si on entre dans cet ecouteur
// C'est qu'on est l'appele. On se contente de le recuperer via l'evenement
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
  //pc.addStream(localStream);
  //var debugCandidate = tool.stringObjectDump(lastCandidate,'candidate');
  console.log("////////////// LAST LOG 1/////////////////////");
  //var lastDebug1 = tool.stringObjectDump(pc,'pc object');
  //console.log(lastDebug1);
}

function handleReceiveChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Receive channel state is: ' + readyState);
  enableMessageInterface(readyState == "open");
  console.log("////////////// LAST LOG 2 /////////////////////");
  //var lastDebug2 = tool.stringObjectDump(pc,'pc object');
  //console.log(lastDebug2);

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



// titi: Comptage et contrôle des ICE candidates
var iceCandidateTimeStamp = 0;
var iceCandidateNumber = 1;
var lastCandidate;

function handleIceCandidate(event) {
  
  
  if (event.target.iceGatheringState == "complete") {
      console.log('!!!!!!!!!!!!!!!!!!!!!! ------------ !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');


      //local.createOffer(function(offer) {
      //console.log("Offer with ICE candidates: " + offer.sdp);
      //signalingChannel.send(offer.sdp); 5
  }




  /*// On a recu une candidature, c'est le serveur STUN qui declenche l'event
  // quand il a reussi a determiner le host/port externe.
  console.log('handleIceCandidate(event.iceCandidateTimeStamp)', event.timeStamp );
  if (event.timeStamp) {
     
  }
  // console.log('handleIceCandidate event: ', event);
  // iceCandidateNumber 
  if ( iceCandidateTimeStamp === 0) {
  console.log('handleIceCandidate(event)', event);
  iceCandidateNumber += 1;

  }
  /**/

  if (event.candidate) {
    // On envoie cette candidature a tout le monde.
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    
    // alert('fin des candidatures...');
    console.log('End of candidates.');
    //var wtf3 = tool.traceObjectDump(pc.localDescription,'objet pc.localDescription >>> [object RTCSessionDescription]');  
    //var wtf4 = tool.traceObjectDump(pc.remoteDescription,'objet pc.remoteDescription >>> [object RTCSessionDescription]');
  }
}

// Execute par l'appelant uniquement
function doCall() {
  
  console.log(">>> doCall()");

  // M.Buffa : les contraintes et les configurations (SDP) sont encore 
  // supportees differements selon les browsers, et certaines proprietes du 
  // standard officiel ne sont pas encore supportees... bref, c'est encore
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
  console.log('>>>>>> Sending offer to peer, with constraints: \n' +
    '  \'' + JSON.stringify(constraints) + '\'.');

  // Envoi de l'offre. Normalement en retour on doit recevoir une "answer"
  console.log(">>>>>> // Envoi de l'offre. Normalement en retour on doit recevoir une 'answer'");
  console.log(">>>>>> pc.createOffer(setLocalAndSendMessage, null, constraints)");
  pc.createOffer(setLocalAndSendMessage, null, constraints);
  console.log(">>> / doCall()");
}

// Execute par l'appele uniquement...
function doAnswer() {
  console.log('>>> doAnswer() / > Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
  console.log('>>> mergeConstraints(cons1, cons2) / > ???');
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

// callback de createAnswer et createOffer, ajoute une configuration locale SDP
// A la connexion p2p, lors de l'appel de createOffer/answer par un pair.
// Envoie aussi la description par WebSocket. Voir le traitement de la reponse
// au debut du fichier sans socket.on("message" , ...) partie "answer" et "offer"
function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  // M.Buffa : la c'est de la tambouille compliquee pour modifier la 
  // configuration SDP pour dire qu'on prefere un codec nomme OPUS (?)
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);

  pc.setLocalDescription(sessionDescription);

  // Envoi par WebSocket
  sendMessage(sessionDescription);
}


// titi: inutile si les stun/turn sont prealablement renseignes ???
/*
// regarde si le serveur turn de la configuration de connexion
// (pc_config) existe, sinon recupere l'IP/host d'un serveur
// renvoye par le web service computeengineondemand.appspot.com
// de google. La requete se fait en Ajax, resultat renvoye en JSON.
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

// Ecouteur de onremotestream : permet de voir la video du pair distant dans 
// l'element HTML remoteVideo
function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
 // reattachMediaStream(miniVideo, localVideo);
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
  //  waitForRemoteVideo();

  // titi: on regarde si on trouves pas des donnees ICE Candidate ds le flux video apellant
  // var objectDebugg = tool.stringObjectDump(remoteStream,"remoteStream");
  // alert (objectDebugg);
  // Bon, au final ca donne rien...
  
}

function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
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
  // titi: Test en laissant isinitiator a true...
  isInitiator = false;
}

// Fermeture de la connexion p2p
function stop() {
  // titi: Test en laissant isStarted a true...
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

/*
var host      = false;
var reflexive = false;
var relay     = true;

peer.onicecandidate = function(e) {
     var ice = e.candidate;
     if(!ice) return;
   
     if(host && ice.candidate.indexOf('typ host') == -1) return;
     if(reflexive && ice.candidate.indexOf('srflx') == -1) return;
     if(relay && ice.candidate.indexOf('relay') == -1) return;
   
     POST_to_Other_Peer(ice);
};
/**/


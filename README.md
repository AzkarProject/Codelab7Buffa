# codelab7Buffa

Codelab 7 proposé par https://bitbucket.org/webrtc/codelab

Version annotée par Michel Buffa pour son cours WebRTC et Thierry Bergeron

Sert de banc d'essai pour:
- Déterminer si la connexion est en p2p direct, à du passer par un STUN ou est relayée par un TURN
- Si possible, forcer l'API RTCPeerConnection a utiliser tel ou tel type de connexion

Difficulté: L'API RTCPeerConnection fonctionne comme une boite noire, il est donc très difficile de savoir parmi la série des ICE candidates qu'elle évalue lequel elle utilisera au final. 

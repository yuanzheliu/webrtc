import React, { Component }                                                                 from 'react';
import { Text, TouchableOpacity, View, YellowBox }                                          from 'react-native';
import { mediaDevices, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import io                                                                                   from 'socket.io-client';
import { button, container, rtcView, text }                                                 from './styles';
import { log, logError }                                                                    from './debug';


YellowBox.ignoreWarnings(['Setting a timer', 'Unrecognized WebSocket connection', 'ListView is deprecated and will be removed']);

/* ==============================
 Global variables
 ================================ */
const url = 'http://192.168.1.3:4460';
const socket = io.connect(url, { transports: ['websocket'] });
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let pcPeers = {};
let appClass;
let localStream;

/* ==============================
 Class
 ================================ */
class App extends Component {
  state = {
    info: 'Initializing',
    status: 'init',
    roomID: 'Tasfa^$&^%*^476HGI',
    isFront: true,
    localStreamURL: null,
    remoteStreamURL:null,
    debuginfo:"",
    debuginfo2:"",
  };
  
  componentDidMount() {
    appClass = this;
    getLocalStream();
  }
  
  switchCamera = () => {
    
    localStream.getVideoTracks().forEach(track =>
      track._switchCamera());
  };
  
  // onPressEnterRoom = () => {
  //   this.setState({
  //     status: 'connect',
  //     info: 'Connecting',
  //   });
  //   console.log('start join')
  //   join(this.state.roomID);
  // };
  onPressEnterRoom = () => {
    startCall();
  }
  
  button = (func, text) => (
    <TouchableOpacity style={button.container} onPress={func}>
      <Text style={button.style}>{text}</Text>
    </TouchableOpacity>
  );
  
  render() {
    const { status, info, localStreamURL, remoteStreamURL,debuginfo,debuginfo2} = this.state;
    
    return (
      <View style={container.style}>
        <Text style={text.style}>{info}</Text>
        
        {status === 'ready' ? this.button(this.onPressEnterRoom, 'Enter room') : null}
        {this.button(this.switchCamera, 'Change Camera')}
        
        <RTCView streamURL={localStreamURL} style={rtcView.style}/>
        <Text>{"Peer:"}</Text>
        <RTCView streamURL={remoteStreamURL} style={rtcView.style}/>
        <Text>{debuginfo}</Text>
        <Text>{debuginfo2}</Text>
      </View>
    );
  }
}

/* ==============================
 Functions
 ================================ */
 const getLocalStream = () => {
  let isFront = true;

  mediaDevices.enumerateDevices().then(sourceInfos => {
    console.log(sourceInfos);
    let videoSourceId;
    for (let i = 0; i < sourceInfos.length; i++) {
      const sourceInfo = sourceInfos[i];
      if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
        videoSourceId = sourceInfo.deviceId;
      }
    }
    mediaDevices.getUserMedia({
      audio: true,
      video: {
        mandatory: {
          minWidth: 500, // Provide your own width, height and frame rate here
          minHeight: 300,
          minFrameRate: 30
        },
        facingMode: (isFront ? "user" : "environment"),
        optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
      }
    })
    .then(stream => {
      // Got stream!
      localStream = stream;
      appClass.setState({
        localStreamURL: stream.toURL(),
        status: 'ready',
        info: 'Welcome to WebRTC demo',
        debuginfo: stream.toURL(),
      });
      console.log('appClass.setState done.')
    })
    .catch(error => {
      // Log error
    });
  });

};

const join = roomID => {
  let onJoin = socketIds => {
    for (const i in socketIds) {
      console.log(i)
      if (socketIds.hasOwnProperty(i)) {
        const socketId = socketIds[i];
        createPC(socketId, true);
      }
    }
  };
  socket.emit('join', roomID, onJoin);
};

const startCall = async () => {
  // You'll most likely need to use a STUN server at least. Look into TURN and decide if that's necessary for your project
  const localPC = new RTCPeerConnection(configuration);
  const remotePC = new RTCPeerConnection(configuration);

  // could also use "addEventListener" for these callbacks, but you'd need to handle removing them as well
  localPC.onicecandidate = event => {
    try {
      console.log('localPC icecandidate:', event.candidate);
      if (event.candidate) {
        remotePC.addIceCandidate(event.candidate);
      }
    } catch (err) {
      console.error(`Error adding remotePC iceCandidate: ${err}`);
    }
  };
  
  remotePC.onicecandidate = event => {
    try {
      console.log('remotePC icecandidate:', event.candidate);
      if (event.candidate) {
        localPC.addIceCandidate(event.candidate);
      }
    } catch (err) {
      console.error(`Error adding localPC iceCandidate: ${err}`);
    }
  };

  remotePC.onaddstream = event => {
    console.log('remotePC tracking with ', event);
    if (event.stream && appClass.state.remoteStreamURL !== event.stream) {
      console.log('RemotePC received the stream', event.stream);
      appClass.setState({
        remoteStreamURL: event.stream.toURL(),
        debuginfo2: event.stream.toURL(),
      });
    }
  };

  // AddTrack not supported yet, so have to use old school addStream instead
  // newStream.getTracks().forEach(track => localPC.addTrack(track, newStream));
  localPC.addStream(localStream);
    const offer = await localPC.createOffer();
    // console.log('Offer from localPC, setLocalDescription');
    await localPC.setLocalDescription(offer);
    // console.log('remotePC, setRemoteDescription');
    await remotePC.setRemoteDescription(localPC.localDescription);
    // console.log('RemotePC, createAnswer');
    const answer = await remotePC.createAnswer();
    // console.log(`Answer from remotePC: ${answer.sdp}`);
    // console.log('remotePC, setLocalDescription');
    await remotePC.setLocalDescription(answer);
    // console.log('localPC, setRemoteDescription');
    await localPC.setRemoteDescription(remotePC.localDescription);
};


const createPC = (socketId, isOffer) => {
  /**
   * Create the Peer Connection
   */
  const peer = new RTCPeerConnection(configuration);
  
  log('Peer', peer);
  
  pcPeers = {
    ...pcPeers,
    [socketId]: peer,
  };
  
  /**
   * On Negotiation Needed
   */
  peer.onnegotiationneeded = () => {
    //console.log('onnegotiationneeded');
    if (isOffer) {
      let callback = desc => {
        
        log('The SDP offer', desc.sdp);
        
        peer.setLocalDescription(desc, callback2, logError);
      };
      let callback2 = () => {
        //console.log('setLocalDescription', peer.localDescription);
        socket.emit('exchange', { to: socketId, sdp: peer.localDescription });
      };
      
      peer.createOffer(callback, logError);
    }
  };

  console.log("peer.addStream");
  
  /**
   * (Deprecated)
   */
  peer.addStream(localStream);

  // const newStream = mediaDevices.getUserMedia(constraints);
  // newStream.getTracks().forEach(track => localPC.addTrack(track, newStream));
  // setLocalStream(newStream);

  console.log("peer.onaddstream");
  
  /**
   * On Add Stream (Deprecated)
   */
  peer.onaddstream = event => {
    console.log('onaddstream', event.stream);
    const remoteList = appClass.state.remoteList;
    
    remoteList[socketId] = event.stream.toURL();
    appClass.setState({
      info: 'One peer join!',
      remoteList: remoteList,
    });
  };
  
  /**
   * On Ice Candidate
   */
  peer.onicecandidate = event => {
    //console.log('onicecandidate', event.candidate);
    if (event.candidate) {
      socket.emit('exchange', { to: socketId, candidate: event.candidate });
    }
  };
  
  /**
   * On Ice Connection State Change
   */
  peer.oniceconnectionstatechange = event => {
    //console.log('oniceconnectionstatechange', event.target.iceConnectionState);
    if (event.target.iceConnectionState === 'completed') {
      //console.log('event.target.iceConnectionState === 'completed'');
      setTimeout(() => {
        getStats();
      }, 1000);
    }
    if (event.target.iceConnectionState === 'connected') {
      //console.log('event.target.iceConnectionState === 'connected'');
    }
  };
  
  /**
   * On Signaling State Change
   */
  peer.onsignalingstatechange = event => {
    //console.log('on signaling state change', event.target.signalingState);
  };
  
  /**
   * On Remove Stream
   */
  peer.onremovestream = event => {
    //console.log('on remove stream', event.stream);
  };
  
  return peer;
};

socket.on('connect', () => {
  //console.log('connect');
});
socket.on('exchange', data => {
  exchange(data);
});
socket.on('leave', socketId => {
  leave(socketId);
});

const exchange = data => {
  let fromId = data.from;
  
  if (data.sdp) {
    log('Exchange', data);
  }
  
  let peer;
  if (fromId in pcPeers) {
    peer = pcPeers[fromId];
  } else {
    peer = createPC(fromId, false);
  }
  
  if (data.sdp) {
    //console.log('exchange sdp', data);
    let sdp = new RTCSessionDescription(data.sdp);
    
    let callback = () => peer.remoteDescription.type === 'offer' ? peer.createAnswer(callback2, logError) : null;
    let callback2 = desc => peer.setLocalDescription(desc, callback3, logError);
    let callback3 = () => socket.emit('exchange', { to: fromId, sdp: peer.localDescription });
    
    peer.setRemoteDescription(sdp, callback, logError);
  } else { 
    peer.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
};

const leave = socketId => {
  //console.log('leave', socketId);
  
  const peer = pcPeers[socketId];
  
  peer.close();
  
  delete pcPeers[socketId];
  
  const remoteList = appClass.state.remoteList;
  
  delete remoteList[socketId];
  
  appClass.setState({
    info: 'One peer left!',
    remoteList: remoteList,
  });
};

const mapHash = (hash, func) => {
  //console.log(hash);
  const array = [];
  for (const key in hash) {
    if (hash.hasOwnProperty(key)) {
      const obj = hash[key];
      array.push(func(obj, key));
    }
  }
  return array;
};

const getStats = () => {
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    let callback = report => console.log('getStats report', report);
    
    //console.log('track', track);
    
    pc.getStats(track, callback, logError);
  }
};

/* ==============================
 Export
 ================================ */
export default App;

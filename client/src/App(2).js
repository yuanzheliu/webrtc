import React from 'react';
import {View, SafeAreaView, Button, StyleSheet} from 'react-native';
import io from 'socket.io-client'
import {RTCPeerConnection, RTCView, mediaDevices} from 'react-native-webrtc';

export default function App() {
  const [localStream, setLocalStream] = React.useState();
  const [remoteStream, setRemoteStream] = React.useState();
  const [cachedLocalPC, setCachedLocalPC] = React.useState();
  const [cachedRemotePC, setCachedRemotePC] = React.useState();

  const [isMuted, setIsMuted] = React.useState(false);

  const startLocalStream = async () => {
    // isFront will determine if the initial camera should face user or environment
    const isFront = true;
    const devices = await mediaDevices.enumerateDevices();

    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(device => device.kind === 'videoinput' && device.facing === facing);
    const facingMode = isFront ? 'user' : 'environment';
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500, // Provide your own width, height and frame rate here
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
  };

  const startCall = async () => {
    // You'll most likely need to use a STUN server at least. Look into TURN and decide if that's necessary for your project
    const STUN_SERVER = 'stun:stun.l.google.com:19302';
    const SERVER = 'http://192.168.1.3:4443';
    const socket = io.connect(SERVER,{transports:['websocket']});
    let pcPeers = {};
    let appClass;

    const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
    const localPC = new RTCPeerConnection(configuration);
    const remotePC = new RTCPeerConnection(configuration);
    

    
    /*socket.on('leave', socketId => {
      leave(socketId);
    });

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
    };*/

    const exchange = data => {
      console.log('echange called');
      let fromId = data.from;
      
      if (data.sdp) {
        console.log('Exchange', data);
      }
      
      let peer;
      if (fromId in pcPeers) {
        peer = pcPeers[fromId];
      } else {
        peer = createPC(fromId, false);
      }
      
      if (data.sdp) {
        console.log('exchange sdp', data);
        let sdp = new RTCSessionDescription(data.sdp);
        
        let callback = () => peer.remoteDescription.type === 'offer' ? peer.createAnswer(callback2, logError) : null;
        let callback2 = desc => peer.setLocalDescription(desc, callback3, logError);
        let callback3 = () => io.emit('exchange', { to: fromId, sdp: peer.localDescription });
        
        peer.setRemoteDescription(sdp, callback, logError);
      } else {
        console.log('addIceCandidate');
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

   
    socket.on('exchange', data => {
      console.log('exchange in socket');
      exchange(data);
    });

    // could also use "addEventListener" for these callbacks, but you'd need to handle removing them as well
    localPC.onicecandidate = event => {
    // try {
    //     console.log('localPC icecandidate:', event.candidate);
    //     if (event.candidate) {
    //       remotePC.addIceCandidate(event.candidate);
    //     }
    //   } catch (err) {
    //     console.error(`Error adding remotePC iceCandidate: ${err}`);
    //   }
      if (event.candidate) {
        console.log("emit exchange local")
        io.emit('exchange', { to: socket.id, candidate: event.candidate });
        // socket.emit("message", "hello");
      }
    };
    remotePC.onicecandidate = event => {
      // try {
      //   console.log('remotePC icecandidate:', event.candidate);
      //   if (event.candidate) {
      //     localPC.addIceCandidate(event.candidate);
      //   }
      // } catch (err) {
      //   console.error(`Error adding localPC iceCandidate: ${err}`);
      // }
      if (event.candidate) {
        console.log("emit exchange remote")
        io.emit('exchange', { to: socket.id, candidate: event.candidate });
      }
    };
    remotePC.onaddstream = event => {
      console.log('remotePC tracking with ', event);
      if (event.stream && remoteStream !== event.stream) {
        console.log('RemotePC received the stream', event.stream);
        setRemoteStream(event.stream);
      }
    };

    // AddTrack not supported yet, so have to use old school addStream instead
    // newStream.getTracks().forEach(track => localPC.addTrack(track, newStream));
    localPC.addStream(localStream);
    try {
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
    } catch (err) {
      console.error(err);
    }
    setCachedLocalPC(localPC);
    setCachedRemotePC(remotePC);
  };

  const switchCamera = () => {
    localStream.getVideoTracks().forEach(track => track._switchCamera());
  };

  // Mutes the local's outgoing audio
  const toggleMute = () => {
    if (!remoteStream) return;
    localStream.getAudioTracks().forEach(track => {
      console.log(track.enabled ? 'muting' : 'unmuting', ' local track', track);
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };

  const closeStreams = () => {
    if (cachedLocalPC) {
      cachedLocalPC.removeStream(localStream);
      cachedLocalPC.close();
    }
    if (cachedRemotePC) {
      cachedRemotePC.removeStream(remoteStream);
      cachedRemotePC.close();
    }
    setLocalStream();
    setRemoteStream();
    setCachedRemotePC();
    setCachedLocalPC();
  };

  return (
    <SafeAreaView style={styles.container}>
      {!localStream && <Button title="Click to start stream" onPress={startLocalStream} />}
      {localStream && <Button title="Click to start call" onPress={startCall} disabled={!!remoteStream} />}

      {localStream && (
        <View style={styles.toggleButtons}>
          <Button title="Switch camera" onPress={switchCamera} />
          <Button title={`${isMuted ? 'Unmute' : 'Mute'} stream`} onPress={toggleMute} disabled={!remoteStream} />
        </View>
      )}

      <View style={styles.rtcview}>
        {localStream && <RTCView style={styles.rtc} streamURL={localStream.toURL()} />}
      </View>
      <View style={styles.rtcview}>
        {remoteStream && <RTCView style={styles.rtc} streamURL={remoteStream.toURL()} />}
      </View>
      <Button title="Click to stop call" onPress={closeStreams} disabled={!remoteStream} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#313131',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  text: {
    fontSize: 30,
  },
  rtcview: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '40%',
    width: '80%',
    backgroundColor: 'black',
  },
  rtc: {
    width: '80%',
    height: '100%',
  },
  toggleButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
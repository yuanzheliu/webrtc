import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, Button, StyleSheet, Text } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import io from "socket.io-client";

export default function WEBRtc({ roomNumber }) {
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  let isCaller, peerConnection;
  const socket = io("http://192.168.1.3:4460");
  
  const constraints = {
    audio: true,
    video: true
  };



  /**
   * Getting ready for local stream 
   */
  const startLocalStream = () => {
    socket.emit('joinTheRoom', roomNumber);
  };

  useEffect(() => {

    socket.on('roomCreated', room => {
      console.log('room created');

      mediaDevices.getUserMedia(constraints)
        .then(stream => {
          setLocalStream(stream);
          setUpConnection(stream)
          isCaller = true;
        })
    });

    socket.on('roomJoined', room => {
      console.log('room joined');
      mediaDevices.getUserMedia(constraints)
        .then(stream => {
          setLocalStream(stream);
          setUpConnection(stream);
          socket.emit('ready', roomNumber)
        });
    });



    const configuration = {
      iceServers: [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
      ]
    };

    socket.on('ready', room => {
      if (isCaller) {
        console.log('ready');
        // peerConnection = new RTCPeerConnection(configuration);
        // peerConnection.onicecandidate = onIceCandidate;
        // peerConnection.onaddstream = onAddStream;
        peerConnection.createOffer()
          .then(offer => {
            return peerConnection.setLocalDescription(offer)
              .then(() => {
                console.log('emit offer');
                socket.emit('offer', {
                  type: 'offer',
                  sdp: offer,
                  room: roomNumber
                });
              })
          })
      }
    });

    socket.on("offer", e => {

      if (!isCaller) {
        //          peerConnection = new RTCPeerConnection(configuration);
        console.log('offer');

        //          peerConnection.onicecandidate = onIceCandidate;
        //          peerConnection.onaddstream = onAddStream;

        console.log('about to create answer');

        //accept offer from here(ready)
        peerConnection.setRemoteDescription(e)
          .then(() => {
            return peerConnection.createAnswer()
              .then(answer => {
                return peerConnection.setLocalDescription(answer)
                  .then(() => {
                    socket.emit('answer', {
                      type: 'answer',
                      sdp: answer,
                      room: roomNumber
                    });
                  })
              })
          });
      }

    });

    function setUpConnection(stream) {
      console.log('offer');
      peerConnection = new RTCPeerConnection(configuration);
      peerConnection.onicecandidate = onIceCandidate;
      peerConnection.onaddstream = onAddStream;
      peerConnection.addStream(stream);
    }

    function onAddStream(e) {
      console.log('remote stream', e);
      if (e.stream && remoteStream !== e.stream) {
        console.log('remote stream', e.stream);

        setRemoteStream(e.stream);
      }
    };

    function onIceCandidate(event) {
      console.log('ice candidate');
      if (event.candidate) {
        console.log('sending ice candidate', event.candidate);
        socket.emit('candidate', {
          type: 'candidate',
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          room: roomNumber
        });
      }
    }

    socket.on('candidate', e => {
      console.log('candidate', isCaller);
      peerConnection.addIceCandidate(e);
      //    peerConnection.addStream(localStream);
    });

    socket.on('answer', e => {
      console.log('answer', e);
      peerConnection.setRemoteDescription(e);
    });

  }, [localStream, remoteStream]);

  /**
   *  Utility functions
   */
  const switchCamera = () => {
    console.log('switching cam');
    localStream.getVideoTracks().forEach(track => track._switchCamera());
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.streamContainer}>
        <View style={styles.streamWrapper}>
          <View style={styles.rtcview}>
            {localStream && <RTCView style={styles.rtc} streamURL={localStream.toURL()} />}
            {!localStream && <Button title="Tap to start" onPress={startLocalStream} />}
          </View>
          <View style={styles.rtcview}>
            {remoteStream && <RTCView style={styles.rtc} streamURL={remoteStream.toURL()} />}
          </View>
        </View>
        <View style = {styles.buttonLine}>
          {localStream && <Button style={styles.buttons} title="Camera" onPress={switchCamera} />}
        </View>
        {/* {!!remoteStream ? <Button style={styles.toggleButtons} title="Click to stop call" onPress={closeStreams} disabled={!remoteStream} /> : localStream && <Button title="Click to start call" onPress={startCall}  />} */}
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    // justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    width: '100%'
  },
  streamContainer: {
    backgroundColor: 'white',
    alignItems: 'center',
    height: '30%',
    width: '100%',
    flexDirection: 'column'
  },
  streamWrapper: {
    backgroundColor: 'white',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    flexDirection: 'row'
  },
  roomTitle: {
    fontSize: 20,
    paddingTop: 20
  },
  rtcview: {
    width: '45%',
    height: '100%',
    // borderColor: '#ccc',
    // borderWidth: 1,
    // display: 'flex',
    // alignItems: 'center',
    // flexDirection: 'row',
    // justifyContent: 'space-around',
  },
  rtc: {
    width: '100%',
    height: '100%',
  },
  buttonLine:{
    width: '100%',
    height: '5%',
  },
  buttons:{
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'black',
    width: '10%',
    margin: 10,
    padding: 10,
    borderRadius: 10,
  },
});
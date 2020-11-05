# RealtimeTranslationFramework

A Realtime translation Framework using React Native, most framework are done with WebRTC module for React native. 
+ Support Android(tested)/Web/iOS


# Installation
This guidline is base on Linux, connecting to Android client. 
### 1. Install React-native 
Step-by-step installation guide can be found here
https://reactnative.dev/docs/environment-setup

also need: node.js 
https://github.com/nodesource/distributions/blob/master/README.md

### 2. Start the signaling server 

in ./server, run 
$ npm install

$ node app

### 3. Start Android application
First connect an Android device with the PC. Make sure the device's debugging mode is turned on.

Start react-native development framework: in ./client, run

$ npm install

$ npx react-native start

Compile the app and burn into the device: in another console:

$ npx react-native run-android

# Usage

Now you can initializa the framework in your browser. In this framework, a signal server is created. You can access the server with the port specified in the server file. You will be asked to input a room name. One other user can enter the room by entering the same name.

Use the callback function in the low-level java library to coordinate with translation API. Audio down-sampling may be needed. 

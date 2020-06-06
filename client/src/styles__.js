import { StyleSheet } from "react-native";


const button = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  style: {
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'black',
    width: '50%',
    margin: 10,
    padding: 10,
    borderRadius: 10,
  },
});

const rtcView = StyleSheet.create({
  style: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 150,
    margin: 10,
  },
});

const text = StyleSheet.create({
  style: {
    fontSize: 20,
    textAlign: "center",
    margin: 10,
    borderRadius: 10,
  },
});


const container = StyleSheet.create({
  style: {
    flex: 1,
    flexDirection: 'column',
  },
});


export default container;

export default text;

export default rtcView;

export default button;


import {Animated, View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
class Playground extends Component {
    static styles = StyleSheet.create({
        container: {
            flex: 1
        },
        box: {
            backgroundColor: 'red',
            position: 'absolute',
            top: 100,
            left: 100,
            width: 100,
            height: 100
        }
    });

    constructor(props) {
        super(props);
        this.state = {
            bounceValue: new Animated.Value(0),
        };
    }

    render() {
        var interpolatedRotateAnimation = this._animatedValue.interpolate({
            inputRange: [0, 100],
            outputRange: ['0deg', '360deg']
        });

        return (
            <View style={Playground.styles.container}>
            </View>
        );
    }

    componentWillMount() {
        this._animatedValue = new Animated.Value(0);
    }

    componentDidMount() {
        Animated.timing(this._animatedValue, {
            toValue: 100,
            duration: 3000
        }).start();
    }
}

export default Playground;
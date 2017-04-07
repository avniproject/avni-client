import {Animated, View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import {VictoryLine, VictoryStack} from "victory-native";
import _ from "lodash";

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
                <VictoryStack>
                    <VictoryLine name="bar-1" data={[{x: "a", y: 2}, {x: "b", y: 3}, {x: "c", y: 5}]}/>
                    <VictoryLine name="bar-2" data={[{x: "a", y: 1}, {x: "b", y: 4}, {x: "c", y: 5}]}/>
                    <VictoryLine name="bar-3" data={[{x: "a", y: 3}, {x: "b", y: 2}, {x: "c", y: 6}]}/>
                    <VictoryLine name="bar-4" data={[{x: "a", y: 2}, {x: "b", y: 3}, {x: "c", y: 3}]}/>
                </VictoryStack>
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
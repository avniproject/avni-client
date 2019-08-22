import React from 'react';
import Styles from "../primitives/Styles";
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import ModelPin from '../../model/Pin';

export default class Pin extends React.Component {

    static propTypes = {
        onComplete: PropTypes.func,
    };

    static defaultProps = {
        onComplete: _.noop,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {pin: new ModelPin()}
    }

    componentWillMount() {
    }

    componentDidUpdate() {
        if (!this.state.pin.isFilled()) {
            this.refs[`pinItem-${this.state.pin.position}`].focus();
        }
    }

    componentDidMount() {
        this.refs[`pinItem-0`].focus();
    }

    changeText(text, index) {
        this.setState((state) => {
            const newState = Object.assign({}, state);
            newState.pin.setValue(text, index);
            return newState;
        });
    }

    renderPinItem(index, value) {
        return (
            <TextInput
                ref={`pinItem-${index}`}
                key={index}
                style={{
                    borderWidth: StyleSheet.hairlineWidth,
                    textAlign: "center", textAlignVertical: "center",
                    borderColor: 'black',
                    marginHorizontal: 16,
                    height: 48,
                    width: 48,
                    fontSize: 18,
                }}
                keyboardType={"numeric"}
                value={value}
                placeholder={"-"}
                onChangeText={(text) => this.changeText(text, index)}
            />
        );
    }

    render() {
        return (
            <View style={Styles.container}>
                <Text style={Styles.menuTitle}>Enter PIN.
                </Text>
                <View style={{justifyContent: 'center', flexDirection: 'row', marginVertical: 16}}>
                    {this.state.pin.values.map((value, index) => {
                        return this.renderPinItem(index, value, index === this.state.pin.position);
                    })}
                </View>
                <Text style={[{
                    flex: 1,
                    marginVertical: 0,
                    paddingVertical: 5
                }, Styles.formBodyText]}>{this.props.individualNameValue}</Text>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={this.props.onComplete}
                                  style={Styles.basicPrimaryButtonView}>
                    <Text style={{
                        color: 'white',
                        alignSelf: 'center',
                        fontSize: Styles.normalTextSize
                    }}>{'Done'}</Text>
                </TouchableOpacity>
            </View>
        )
    }
};

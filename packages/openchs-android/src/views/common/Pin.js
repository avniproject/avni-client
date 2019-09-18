import React from 'react';
import Styles from "../primitives/Styles";
import {StyleSheet, Text, TextInput, TouchableOpacity, View, Button} from "react-native";
import PropTypes from 'prop-types';
import SmoothPinCodeInput from 'react-native-smooth-pincode-input';
import Colors from "../primitives/Colors";

export default class Pin extends React.Component {

    static propTypes = {
        onComplete: PropTypes.func,
    };

    static defaultProps = {
        onComplete: _.noop,
        reset: _.noop,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {code: ''};
        this.pinInput = React.createRef();
        this.props.reset(this.reset);
    }

    reset = ()=> {
        this.setState({code:''});
    };

    componentDidUpdate() {
        this.pinInput.current.focus();
    }

    componentDidMount() {
        this.pinInput.current.focus();
    }

    render() {
        return (
            <View style={Styles.container}>
                <Text style={Styles.menuTitle}>{this.props.I18n.t('Enter PIN')}</Text>
                <View style={{justifyContent: 'center', flexDirection: 'row', marginVertical: 16}}>
                    <SmoothPinCodeInput
                        ref={this.pinInput}
                        value={this.state.code}
                        autoFocus={true}
                        onTextChange={code => this.setState({code})}
                    />
                </View>
                <Text style={[{
                    flex: 1,
                    marginVertical: 0,
                    paddingVertical: 5
                }, Styles.formBodyText]}>{this.props.individualNameValue}</Text>
                <Button
                    title={`${this.props.I18n.t('Done')}`}
                    color={Colors.ActionButtonColor}
                    onPress={() => this.props.onComplete(+this.state.code)}
                    disabled={this.state.code.length < 4}
                />
            </View>
        )
    }
};

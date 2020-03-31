import React from 'react';
import {findNodeHandle, TouchableOpacity, UIManager, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from "prop-types";
import Colors from "../primitives/Colors";


export default class PopupMenu extends React.Component {
    static propTypes = {
        actions: PropTypes.arrayOf(PropTypes.string).isRequired,
        onPress: PropTypes.func.isRequired,
        iconSize: PropTypes.number.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            icon: null
        }
    }

    onError() {
        console.log('Popup Error')
    }

    onPress = () => {
        if (this.state.icon) {
            UIManager.showPopupMenu(
                findNodeHandle(this.state.icon),
                this.props.actions,
                this.onError,
                this.props.onPress
            )
        }
    };

    render() {
        return (
            <View>
                <TouchableOpacity onPress={this.onPress}>
                    <Icon
                        name='more-vert'
                        size={this.props.iconSize}
                        color={Colors.Complimentary}
                        ref={this.onRef}/>
                </TouchableOpacity>
            </View>
        )
    }

    onRef = icon => {
        if (!this.state.icon) {
            this.setState({icon})
        }
    }
}

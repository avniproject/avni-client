import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Text} from "native-base";
import {TouchableNativeFeedback, View} from "react-native";
import Colors from "../primitives/Colors";
import PropTypes from "prop-types";


class CommentResolveButton extends AbstractComponent {

    static propTypes = {
        onResolveComment: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <TouchableNativeFeedback onPress={this.props.onResolveComment}>
                <View style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    alignSelf: 'center',
                    height: 30,
                    width: 90,
                    paddingHorizontal: 16,
                    marginRight: 5,
                    marginTop: 5,
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF'
                }}>
                    <Text style={{color: Colors.DarkPrimaryColor}}>{this.I18n.t("resolve")}</Text>
                </View>
            </TouchableNativeFeedback>
        )
    }
}


export default CommentResolveButton;

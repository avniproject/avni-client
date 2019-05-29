import {ProgressBarAndroid, Text, View, Button} from "react-native";
import Fonts from "./primitives/Fonts";
import PropTypes from 'prop-types';
import React from "react";
import Colors from "./primitives/Colors";
import _ from "lodash";
import AbstractComponent from "../framework/view/AbstractComponent";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

class ProgressBarView extends AbstractComponent {
    static propType = {
        onPress: PropTypes.func.isRequired,
        progress: PropTypes.number,
        message: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.createStyles();
    }

    createStyles() {
        this.container = {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
        };
        this.syncTextContent = {
            color: Colors.TextOnPrimaryColor,
            lineHeight: 30,
            height: 50,
        };
        this.percentageText = {
            color: Colors.TextOnPrimaryColor,
        };

    }

    render() {

        return (
            <View>
                {this.props.progress < 1 ?

                    (<View>
                        <Text style={[this.syncTextContent, Fonts.typography("paperFontSubhead")]}>
                            {this.I18n.t(_.isNil(this.props.message) ? "doingNothing" : this.props.message)}
                        </Text>
                        <ProgressBarAndroid styleAttr="Horizontal" progress={this.props.progress}
                                            indeterminate={false} color="white"/>
                        <Text
                            style={[this.percentageText, {textAlign: 'center'}, Fonts.typography("paperFontSubhead")]}>
                            {((this.props.progress) * 100).toFixed(0)}%
                        </Text>
                    </View>)
                    :
                    (<View>
                        <View style={this.container}>
                            <Text
                                style={[Fonts.typography("paperFontSubhead"), {color: Colors.TextOnPrimaryColor}]}>
                                {this.I18n.t("syncComplete")}
                            </Text>
                            <Icon name='check-circle' size={21} style={[{color: Colors.TextOnPrimaryColor}]}/>
                        </View>
                        <View style={{paddingTop: 20}}>
                            <Button
                                title={`${this.I18n.t('ok')}`}
                                color={Colors.ActionButtonColor}
                                onPress={() => this.props.onPress()}/>
                        </View>
                    </View>)}
            </View>
        );
    }
}

export default ProgressBarView

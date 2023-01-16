import {Text, View, Button, Modal, Dimensions} from "react-native";
import {ProgressBar}  from "@react-native-community/progress-bar-android";
import Fonts from "./primitives/Fonts";
import PropTypes from 'prop-types';
import React from "react";
import Colors from "./primitives/Colors";
import _ from "lodash";
import AbstractComponent from "../framework/view/AbstractComponent";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import KeepAwake from 'react-native-keep-awake';

const {width, height} = Dimensions.get('window');

class ProgressBarView extends AbstractComponent {
    static propType = {
        onPress: PropTypes.func.isRequired,
        progress: PropTypes.number,
        message: PropTypes.string,
        syncing: PropTypes.bool.isRequired,
        notifyUserOnCompletion: PropTypes.bool.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.createStyles();
    }

    createStyles() {
        this.syncContainerStyle = {
            flex: 1,
            flexDirection: 'column',
            flexWrap: 'nowrap',
            backgroundColor: "rgba(0, 0, 0, 0.5)",
        };
        this.syncBackground = {
            width: width * .7,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            alignSelf: 'center',
            backgroundColor: Colors.getCode("paperGrey900").color,
        };
        this.container = {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
        };
        this.syncTextContent = {
            color: Colors.TextOnPrimaryColor,
            lineHeight: 30,
            height: 70,
        };
        this.percentageText = {
            color: Colors.TextOnPrimaryColor,
        };

    }

    render() {
        if (!this.props.syncing) return null;

        return (
            <Modal animationType={'fade'}
                   transparent={true}
                   onRequestClose={_.noop}
                   visible={this.props.syncing}>
                <KeepAwake />
                <View style={[this.syncContainerStyle, {backgroundColor: 'rgba(0, 0, 0, 0.25)'}]}
                      key={`spinner_${Date.now()}`}>
                    <View style={{flex: .4}}/>
                    <View style={this.syncBackground}>
                        <View style={{flex: .9}}>
                            <View>
                                {this.props.progress < 1 ?
                                    (<View>
                                        <Text style={[this.syncTextContent, Fonts.typography("paperFontSubhead")]}>
                                            {this.I18n.t(_.isNil(this.props.message) ? "doingNothing" : this.props.message)}
                                        </Text>
                                        <ProgressBar styleAttr="Horizontal" progress={this.props.progress}
                                                            indeterminate={false} color="white"/>
                                        <Text
                                            style={[this.percentageText, {textAlign: 'center'}, Fonts.typography("paperFontSubhead")]}>
                                            {((this.props.progress) * 100).toFixed(0)}%
                                        </Text>
                                    </View>)
                                    :
                                    (this.props.notifyUserOnCompletion ? <View>
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
                                    </View> : <View/>)}
                            </View>
                        </View>
                    </View>
                    <View style={{flex: 1}}/>
                </View>
            </Modal>
        );
    }
}

export default ProgressBarView

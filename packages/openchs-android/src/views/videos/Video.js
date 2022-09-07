import PropTypes from 'prop-types';
import React, {Component} from "react";
import {Text, View, TouchableNativeFeedback} from "react-native";
import ListView from "deprecated-react-native-listview";
import {Icon} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import General from "../../utility/General";

export class VideoList extends AbstractComponent {

    static propTypes = {
        videos: PropTypes.array.isRequired,
        onPlay: PropTypes.func.isRequired
    };

    viewName() {
        return 'VideoList';
    }

    constructor(props, context) {
        super(props, context);
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    renderLineItem(video) {
        return (
            <TouchableNativeFeedback onPress={() => this.props.onPlay(video)}
                                     background={this.background()}>
            <View>
                <View style={{
                    marginBottom: 2,
                    flexDirection: 'row',
                    flex: 16,
                    paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
                    height: 86,
                    alignItems: 'center',
                    alignSelf: 'center'
                }}>
                    <Icon name='play-circle-outline' style={{
                        color: Colors.AccentColor,
                        fontSize: 56,
                        paddingRight: 16
                    }}/>
                    <View style={{flexDirection: 'column', alignItems: 'flex-start', flex: 1}}>
                        <Text style={Styles.textStyle}>{this.I18n.t(video.title)}</Text>
                        <Text style={Styles.userProfileSubtext}>{this.I18n.t(video.description)}</Text>
                    </View>
                </View>
                <View style={{
                    borderBottomColor: Colors.GreyBackground,
                    borderBottomWidth: 1,
                }}/>
            </View>
            </TouchableNativeFeedback>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(this.props.videos);
        return (
            <View>
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    style={{backgroundColor: Styles.greyBackground}}
                    pageSize={20}
                    initialListSize={10}
                    removeClippedSubviews={true}
                    renderRow={(rowData) => this.renderLineItem(rowData)}/>
            </View>
        );
    }
}

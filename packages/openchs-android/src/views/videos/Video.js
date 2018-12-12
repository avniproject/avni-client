import React, {Component, PropTypes} from "react";
import {ListView, Text, View} from "react-native";
import {Button} from "native-base";
import General from "openchs-models/src/utility/General";

export class VideoList extends Component {

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

    renderLineItem(video) {
        return (
            <View style={{marginBottom: 2, flexDirection: 'row', flex: 16}}>
                <Button style={{flex: 2, marginRight: 8, borderRadius: 2}}
                        onPress={() => this.props.onPlay(video)}>
                    {this.I18n.t('PlayVideo')}
                </Button>
                <View style={{flex: 14}}>
                    <Text style={{fontSize: 18}}>{this.I18n.t(video.title)}</Text>
                    <Text style={{flex: 5}}>{this.I18n.t(video.description)}</Text>
                </View>
            </View>
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
                    pageSize={20}
                    initialListSize={10}
                    removeClippedSubviews={true}
                    renderRow={(rowData) => this.renderLineItem(rowData)}/>
            </View>
        );
    }
}

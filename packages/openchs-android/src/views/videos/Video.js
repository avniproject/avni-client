import React, {Component, PropTypes} from "react";
import {ListView, Text, View} from "react-native";
import {Button} from "native-base";

export class VideoList extends Component {

    static propTypes = {
        videos: PropTypes.array.isRequired,
        play: PropTypes.func.isRequired
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
                        onPress={() => this.props.play(video)}>
                    Play
                </Button>
                <View style={{flex: 14}}>
                    <Text style={{fontSize: 18}}>{video.title}</Text>
                    <Text style={{flex: 5}}>{video.description}</Text>
                </View>
            </View>
        );
    }

    render() {
        console.log(this.props.videos);
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

import React, {Component, PropTypes} from "react";
import {ListView, Text, View} from "react-native";
import Separator from "../primitives/Separator";
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
            <View>
                <Text>{video.title}</Text>
                <Text>{video.description}</Text>
                <Button onPress={() => this.props.play(video)}>Play Video</Button>
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
                    renderSeparator={(ig, idx) => (<Separator key={idx} height={1}/>)}
                    renderHeader={() => (<Separator height={1} backgroundColor={'rgba(0, 0, 0, 0.12)'}/>)}
                    renderRow={(rowData) => this.renderLineItem(rowData)}/>
            </View>
        );
    }
}

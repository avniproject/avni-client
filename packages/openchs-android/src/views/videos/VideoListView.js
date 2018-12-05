import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import themes from "../primitives/themes";
import CHSContainer from "../common/CHSContainer";
import {VideoList} from './Video';
import Colors from "../primitives/Colors";
import Actions from "../../action/VideoListViewActions";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/VideoListView')
class VideoListView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.videoList);
    }

    viewName() {
        return 'VideoListView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        this.dispatchOnLoad();
    }

    dispatchOnLoad() {
        this.dispatchAction(Actions.Names.ON_LOAD, this.props);
    }

    componentWillUnmount() {
        this.dispatchAction(Actions.Names.RESET_LIST);
        super.componentWillUnmount();
    }

    play(video) {
        this.dispatchAction(Actions.Names.PLAY_VIDEO, {
            cb: () => {
                CHSNavigator.navigateToVideoPlayerView(this, video);
            }
        });
    }

    render() {
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('myDashboard')}/>
                <CHSContent>
                    <View style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <VideoList videos={this.state.videos} play={(video) => this.play(video)}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }

}

export default VideoListView;
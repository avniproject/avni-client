import {View, Text} from "react-native";
import PropTypes from 'prop-types';
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
import GlobalStyles from "../primitives/GlobalStyles";
import General from "../../utility/General";

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

    renderZeroResultsMessageIfNeeded() {
        if (this.state.videos.length === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('videoListNotAvailable')}</Text>
                </View>
            );
        else
            return (<View/>);
    }


    onExit = (data) => {
        this.dispatchAction(Actions.Names.ON_EXIT_VIDEO, data);
    };

    onPlay = (video) => {
        this.dispatchAction(Actions.Names.ON_PLAY_VIDEO, {
            video,
            cb: (telemetric) => {
                CHSNavigator.navigateToVideoPlayerView(this, {telemetric, onExit: this.onExit});
            }
        });
    };

    render() {
        General.logDebug('VideoListView', 'render');
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('Videos')}/>
                <CHSContent>
                    <VideoList videos={this.state.videos} onPlay={this.onPlay}/>
                    {this.renderZeroResultsMessageIfNeeded()}
                </CHSContent>
            </CHSContainer>
        );
    }

}

export default VideoListView;
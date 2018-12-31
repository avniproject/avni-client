import React, {PropTypes} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import General from "../../utility/General";
import VideoPlayer from 'react-native-video-player';
import Orientation from 'react-native-orientation';
import { StatusBar } from 'react-native';
import {Alert, Text, TouchableHighlight, View} from 'react-native';
import Distances from "../primitives/Distances";
import _ from "lodash";

@Path('/VideoPlayerView')
class VideoPlayerView extends AbstractComponent {
    static propTypes = {
        telemetric: PropTypes.object.isRequired,
        onExit: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.videoList);
        this.state = {
            layout: {
                width: Distances.DeviceWidth,
                height: Distances.DeviceEffectiveHeight,
            }
        };
    }

    viewName() {
        return 'VideoPlayerView';
    }

    componentDidMount() {
        StatusBar.setHidden(true);
        Orientation.lockToLandscape();
    }

    componentWillUnmount() {
        StatusBar.setHidden(false);
        Orientation.getOrientation((err, orientation) => {
            General.logDebug(this.viewName(), `Device Orientation: ${orientation}`);
        });

        Orientation.unlockAllOrientations();
        this.props.onExit({error:this.state.error});
        super.componentWillUnmount();
    }

    goBack = () => {
        super.goBack();
    };

    onLayout = (event) => {
        if (this.state.layout.height !== Distances.DeviceEffectiveHeight) {
            if (this.state.layout.width !== Distances.DeviceWidth) {
                this.setState(state => ({
                    ...state,
                    layout: {
                        height: Distances.DeviceEffectiveHeight,
                        width: Distances.DeviceWidth
                    }
                }));
            }
        }
    };

    onProgress = (progress) => {
        this.props.telemetric.setOnceVideoStartTime(progress.currentTime);
        this.props.telemetric.setVideoEndTime(progress.currentTime);
    };

    onError = (event) => {
        this.state.error = event.error;
        const roughErrorMessage = _.join(_.values(_.get(event,'error')),'\n');
        let message;
        if (_.includes(roughErrorMessage,'FileNotFoundException')) {
            message = `FileNotFound: Provide permission to access storage from settings and make sure '${this.props.telemetric.video.filePath}' file exists`;
        } else {
            message = `UnknownError: ${roughErrorMessage}`;
        }
        General.logError(this.viewName(), event);
        General.logError(this.viewName(), message);
        Alert.alert(this.I18n.t("UnableToPlayVideoError"), message, [{text: this.I18n.t('Okay'), onPress: this.goBack}]);
    };

    render() {
        General.logDebug(this.viewName(), 'render');

        return (<View onLayout={this.onLayout}>
            <VideoPlayer
                endWithThumbnail
                video={{uri: this.props.telemetric.video.filePath}}
                ref={r => this.player = r}
                onError={this.onError}
                onProgress={this.onProgress}
                disableSeek={false}
                pauseOnPress={false}
                autoplay={true}
            />
            <TouchableHighlight
                underlayColor="transparent"
                activeOpacity={0.3}
                onPress={this.goBack}
                style={{margin: 8, padding: 16, position: 'absolute', top: 0, left: 0}}
            >
                <Text style={{fontSize: 60, color: 'white', lineHeight: 32}}>{'<'}</Text>
            </TouchableHighlight>
        </View>);
    }

}

export default VideoPlayerView;
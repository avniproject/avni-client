import React, {PropTypes} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import General from "../../utility/General";
import VideoPlayer from 'react-native-video-player';
import Orientation from 'react-native-orientation';
import {Text, TouchableHighlight, View} from 'react-native';
import Distances from "../primitives/Distances";

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
        this.telemetric = this.props.telemetric;
        this.video = this.props.telemetric.video;
        console.log('this.props.telemetric.video',this.props.telemetric);
    }

    viewName() {
        return 'VideoPlayerView';
    }

    componentDidMount() {
        Orientation.lockToLandscape();
        this.telemetric.setPlayerOpenTime();
    }

    componentWillUnmount() {
        Orientation.getOrientation((err, orientation) => {
            console.log(`Current Device Orientation: ${orientation}`);
        });

        Orientation.unlockAllOrientations();
        this.telemetric.setPlayerCloseTime();
        this.props.onExit(this.telemetric);
        super.componentWillUnmount();
    }

    goBack = () => {
        Orientation.unlockAllOrientations();
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
        this.telemetric.setOnceVideoStartTime(progress.currentTime);
        this.telemetric.setVideoEndTime(progress.currentTime);
    };

    render() {
        General.logDebug(this.viewName(), 'render');

        return (<View onLayout={this.onLayout}>
            <VideoPlayer
                endWithThumbnail
                // thumbnail={{ uri: '' }}
                video={{uri: this.video.filePath}}
                // videoWidth={}
                // videoHeight={}
                // duration={}
                ref={r => this.player = r}
                onLoad={k => console.log('onLoad: ', k)}
                onLoadStart={k => console.log('onLoadStart: ', k)}
                onEnd={k => console.log('onEnd: ', k)}
                onProgress={this.onProgress}
                onPause={k => console.log('onPause: ', k)}
                onPlayPress={k => console.log('onPlayPress: ', k)}
                onStart={k => console.log('onStart: ', k)}
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

/*
<VideoPlayer
                source={{uri: this.props.video.filePath}}
                style={{
                    width: this.state.layout.width,
                    height: this.state.layout.height,
                }}
                ref={(ref) => (this.player = ref)}
                onLoad={() => {
                    console.log('------------------started');
                }}
                onEnd={() => {
                    console.log('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\started');
                }}
                onBack={this._goBack}
                resizeMode={'contain'}
                disableFullscreen={true}
            />

*/

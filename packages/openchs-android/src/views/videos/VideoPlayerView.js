import React, {PropTypes} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import General from "../../utility/General";
import VideoPlayer from 'react-native-video-controls';
import CHSNavigator from "../../utility/CHSNavigator";
import Orientation from 'react-native-orientation';
import {View} from 'react-native';
import Distances from "../primitives/Distances";

@Path('/VideoPlayerView')
class VideoPlayerView extends AbstractComponent {
    static propTypes = {
        video: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.videoList);
        this.state = {
            layout: {
                width: Distances.DeviceWidth,
                height: Distances.DeviceEffectiveHeight,
            }
        };
        this.onLayout = this.onLayout.bind(this);
    }

    viewName() {
        return 'VideoPlayerView';
    }

    componentDidMount() {
        Orientation.lockToLandscape();
    }

    componentWillUnmount() {
        Orientation.getOrientation((err, orientation) => {
            console.log(`Current Device Orientation: ${orientation}`);
        });

        Orientation.unlockAllOrientations();
        super.componentWillUnmount();
    }

    _goBack = () => {
        Orientation.unlockAllOrientations();
        CHSNavigator.goBack(this);
    };

    onLayout = (event) => {
        this.setState(state => ({
            ...state,
            layout: {
                height: Distances.DeviceEffectiveHeight,
                width: Distances.DeviceWidth
            }
        }));
    };

    render() {
        General.logDebug(this.viewName(), 'render');

        return (<View
            onLayout={this.onLayout}>
            <VideoPlayer
                onLayout={this.onLayout}
                source={{uri: this.props.video.filePath}}
                style={{
                    width: this.state.layout.width,
                    height: this.state.layout.height,
                }}
                ref={(ref) => (this.player = ref)}
                onLoad={() => {}}
                onBack={this._goBack}
                resizeMode={'contain'}
                disableFullscreen={true}
            />
        </View>);
    }

}

export default VideoPlayerView;
import React, {PropTypes} from "react";
import General from "../../utility/General";
import VideoPlayer from 'react-native-video-player';
import {Text, TouchableHighlight, View} from 'react-native';
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import {Icon} from "native-base";

/*TODO: Replace some of the code inside VideoPlayerView and put VideoPlayerWrapper Component in there
* Rename this component after that.
* */
class VideoPlayerWrapper extends React.Component {
    static propTypes = {
        uri: PropTypes.string.isRequired,
        onError: PropTypes.func,
        onProgress: PropTypes.func,
        onClose: PropTypes.func,
    };

    constructor(props) {
        super(props);
    }

    viewName() {
        return 'VideoPlayerWrapper';
    }

    componentWillMount() {
        this.setState({layout:{}});
    }

    componentWillUnmount() {
        this.props.onClose();
    }

    onLayout = () => {
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

    showBackArrow() {
        return (
            <TouchableHighlight
                underlayColor="transparent"
                activeOpacity={0.3}
                onPress={this.props.onClose}
                style={{margin: 8, padding: 16, position: 'absolute', top: 0, left: 0}}
            >
                <View>
                    <Icon style={{fontSize: 40, color: Colors.TextOnPrimaryColor}} name='keyboard-arrow-left'/>
                </View>
            </TouchableHighlight>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');

        return (
            <View onLayout={this.onLayout} style={{backgroundColor: 'black', flex: 1, justifyContent: 'center'}}>
                <VideoPlayer
                    endWithThumbnail
                    video={{uri: this.props.uri}}
                    ref={r => this.player = r}
                    onError={this.props.onError}
                    onProgress={this.props.onProgress}
                    pauseOnPress={true}
                    autoplay={true}
                    resizeMode={'cover'}
                />
                {this.showBackArrow()}
            </View>
        );
    }

}

export default VideoPlayerWrapper;

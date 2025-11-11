import PropTypes from 'prop-types';
import React from "react";
import General from "../../utility/General";
import Video from 'react-native-video';
import {TouchableHighlight, View} from 'react-native';
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AvniIcon from '../common/AvniIcon';

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
        this.state = {
            paused: false,
            layout: {}
        };
    }

    viewName() {
        return 'VideoPlayerWrapper';
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
                    <AvniIcon style={{fontSize: 40, color: Colors.TextOnPrimaryColor}} name='keyboard-arrow-left' type='MaterialIcons'/>
                </View>
            </TouchableHighlight>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');

        return (
            <View onLayout={this.onLayout} style={{backgroundColor: 'black', flex: 1, justifyContent: 'center'}}>
                <Video
                    source={{uri: this.props.uri}}
                    ref={r => this.player = r}
                    style={{flex: 1}}
                    controls={true}
                    paused={this.state.paused}
                    resizeMode={'contain'}
                    onError={(error) => this.props.onError?.(error)}
                    onProgress={(progress) => this.props.onProgress?.(progress)}
                />
                {this.showBackArrow()}
            </View>
        );
    }

}

export default VideoPlayerWrapper;

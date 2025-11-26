import React from 'react';
import {Image, TouchableWithoutFeedback, View, Modal} from 'react-native';
import PropTypes from 'prop-types';
import AbstractComponent from '../../framework/view/AbstractComponent';
import MediaService from '../../service/MediaService';
import AvniModel from './AvniModel';
import AvniIcon from './AvniIcon';
import VideoPlayerWrapper from '../videos/VideoPlayerWrapper';
import Colors from '../primitives/Colors';

class MediaContent extends AbstractComponent {
    static propTypes = {
        media: PropTypes.array.isRequired,
        size: PropTypes.number,
        style: PropTypes.object,
    };

    static defaultProps = {
        size: 40,
        style: {},
        media: []
    };

    constructor(props, context) {
        super(props, context);
        this.mediaService = this.getService(MediaService);
        this.state = {
            imageExpanded: false,
            videoExpanded: false,
            mediaPaths: {},
            imageAspectRatio: 1 // Default aspect ratio until image loads
        };
    }

    UNSAFE_componentWillMount() {
        this.loadMedia();
        return super.UNSAFE_componentWillMount();
    }

    loadMedia() {
        const { media } = this.props;

        if (media && media.length > 0) {
            const mediaPaths = {};

            media.forEach(mediaItem => {
                if (mediaItem.url) {
                    this.mediaService.downloadFileIfRequired(mediaItem.url, 'Metadata')
                        .then(filePath => {
                            mediaPaths[mediaItem.url] = filePath;
                            this.setState({ mediaPaths: { ...this.state.mediaPaths, ...mediaPaths } });
                        })
                        .catch(error => {
                            console.error('Error loading media:', error);
                        });
                }
            });
        }
    }

    toggleImageExpand = (expanded = false) => {
        this.setState({ imageExpanded: expanded });
    }

    toggleVideoExpand = (expanded = false) => {
        this.setState({ videoExpanded: expanded });
    }

    renderImageIcon(mediaItem) {
        const { size, style } = this.props;
        const { mediaPaths } = this.state;

        if (!mediaPaths[mediaItem.url]) {
            return null;
        }

        // Get the absolute path using MediaService
        const absolutePath = this.mediaService.getAbsolutePath(mediaItem.url, 'Metadata');

        return (
            <TouchableWithoutFeedback onPress={() => this.toggleImageExpand(true)}>
                <View>
                    <Image
                        source={{ uri: `file://${absolutePath}` }}
                        style={[{ height: size, width: size }, style]}
                    />
                </View>
            </TouchableWithoutFeedback>
        );
    }

    renderVideoIcon() {
        const { size, style } = this.props;

        return (
            <TouchableWithoutFeedback onPress={() => this.toggleVideoExpand(true)}>
                <View>
                    <AvniIcon
                        name='slideshow'
                        type='MaterialIcons'
                        style={{
                            fontSize: size * 1.25,
                            color: Colors.ActionButtonColor,
                            ...style
                        }}
                    />
                </View>
            </TouchableWithoutFeedback>
        );
    }

    render() {
        const { media } = this.props;
        const { imageExpanded, videoExpanded, mediaPaths } = this.state;

        if (!media || media.length === 0) {
            return null;
        }

        const images = media.filter(m => m.isImage());
        const videos = media.filter(m => m.isVideo());
        const imageMedia = images.length > 0 ? images[0] : null;
        const videoMedia = videos.length > 0 ? videos[0] : null;

        return (
            <View style={{ marginTop: 5 }}>
                {imageMedia && (
                    <AvniModel
                        dismiss={() => this.toggleImageExpand(false)}
                        visible={imageExpanded}
                    >
                        <View style={{
                            backgroundColor: 'white',
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: 'black',
                            padding: 4,
                            maxHeight: '80%',
                            maxWidth: '90%',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Image
                                source={{ uri: `file://${this.mediaService.getAbsolutePath(imageMedia.url, 'Metadata')}` }}
                                style={{
                                    width: '100%',
                                    height: undefined,
                                    aspectRatio: this.state.imageAspectRatio,
                                    maxHeight: '100%',
                                }}
                                resizeMode="contain"
                                onLoad={(event) => {
                                    const { width, height } = event.nativeEvent.source;
                                    if (width && height) {
                                        this.setState({ imageAspectRatio: width / height });
                                    }
                                }}
                            />
                        </View>
                    </AvniModel>
                )}

                {videoMedia && (
                    <Modal
                        visible={videoExpanded}
                        onRequestClose={() => this.toggleVideoExpand(false)}
                        style={{ height: '100%' }}
                    >
                        <VideoPlayerWrapper
                            uri={`file://${this.mediaService.getAbsolutePath(videoMedia.url, 'Metadata')}`}
                            onClose={() => this.toggleVideoExpand(false)}
                        />
                    </Modal>
                )}

                {/* Icons Container - Side by Side */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {imageMedia && mediaPaths[imageMedia.url] && this.renderImageIcon(imageMedia)}
                    {videoMedia && mediaPaths[videoMedia.url] && this.renderVideoIcon()}
                </View>
            </View>
        );
    }
}

export default MediaContent;

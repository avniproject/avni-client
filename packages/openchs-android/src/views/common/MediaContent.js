import React from 'react';
import {Image, TouchableWithoutFeedback, TouchableOpacity, Text, View, Modal, StyleSheet} from 'react-native';
import {ImageViewer} from 'react-native-image-zoom-viewer';
import PropTypes from 'prop-types';
import AbstractComponent from '../../framework/view/AbstractComponent';
import MediaService from '../../service/MediaService';
import AvniIcon from './AvniIcon';
import VideoPlayerWrapper from '../videos/VideoPlayerWrapper';
import Colors from '../primitives/Colors';
import Styles from '../primitives/Styles';

class MediaContent extends AbstractComponent {
    static propTypes = {
        media: PropTypes.array.isRequired,
        size: PropTypes.number,
        style: PropTypes.object,
        round: PropTypes.bool,
        fullWidth: PropTypes.bool,
    };

    static defaultProps = {
        size: 40,
        style: {},
        media: [],
        round: false,
        fullWidth: false
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
        const { size, style, round, fullWidth } = this.props;
        const { mediaPaths, imageAspectRatio } = this.state;

        if (!mediaPaths[mediaItem.url]) {
            return null;
        }

        // Get the absolute path using MediaService
        const absolutePath = this.mediaService.getAbsolutePath(mediaItem.url, 'Metadata');
        // Cap the width so extremely wide images don't push the option layout around
        const width = round ? size : size * Math.min(imageAspectRatio, 2);
        const roundStyle = round ? {borderRadius: size / 2, borderWidth: 2, borderColor: '#ffffff'} : {};
        const dimensionStyle = fullWidth ? {width: '100%', aspectRatio: imageAspectRatio || 1, height: undefined} : {height: size, width};

        return (
            <TouchableWithoutFeedback onPress={() => this.toggleImageExpand(true)}>
                <View style={fullWidth ? {width: '100%'} : {}}>
                    <Image
                        source={{ uri: `file://${absolutePath}` }}
                        style={[dimensionStyle, roundStyle, style]}
                        resizeMode={round ? "cover" : "contain"}
                        onLoad={(event) => {
                            const { width: imageWidth, height: imageHeight } = event.nativeEvent.source;
                            if (imageWidth && imageHeight) {
                                this.setState({ imageAspectRatio: imageWidth / imageHeight });
                            }
                        }}
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
                {imageMedia && imageExpanded && (
                    <Modal onRequestClose={() => this.toggleImageExpand(false)}>
                        <View style={styles.previewContainer}>
                            <ImageViewer
                                imageUrls={[{ url: `file://${this.mediaService.getAbsolutePath(imageMedia.url, 'Metadata')}` }]}
                                renderIndicator={() => null}
                            />
                            <TouchableOpacity onPress={() => this.toggleImageExpand(false)} style={styles.closeButton}>
                                <Text style={styles.closeButtonText}>{this.I18n.t('closeImagePreview')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Modal>
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

const styles = StyleSheet.create({
    previewContainer: {flex: 1, backgroundColor: 'black'},
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 100,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeButtonText: {color: Colors.TextHint, fontSize: Styles.normalTextSize},
});

export default MediaContent;

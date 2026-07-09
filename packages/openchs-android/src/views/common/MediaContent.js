import React from 'react';
import {Image, TouchableWithoutFeedback, View, Modal, FlatList, Text, Dimensions} from 'react-native';
import {ImageViewer} from 'react-native-image-zoom-viewer';
import {Button} from 'native-base';
import PropTypes from 'prop-types';
import AbstractComponent from '../../framework/view/AbstractComponent';
import MediaService from '../../service/MediaService';
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
            galleryExpanded: false,
            viewerImageIndex: null,
            viewerVideo: null,
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

    toggleGalleryExpand = (expanded = false) => {
        this.setState({ galleryExpanded: expanded, viewerImageIndex: null, viewerVideo: null });
    }

    // Open a specific item from the thumbnail grid.
    openGalleryItem = (item) => {
        const { media } = this.props;
        if (item.isVideo()) {
            this.setState({ viewerVideo: item });
        } else {
            const images = media.filter(m => m.isImage());
            const index = Math.max(0, images.findIndex(im => im.url === item.url));
            this.setState({ viewerImageIndex: index });
        }
    }

    absolutePath(mediaItem) {
        return `file://${this.mediaService.getAbsolutePath(mediaItem.url, 'Metadata')}`;
    }

    renderImageThumb(mediaItem, onPress) {
        const { size, style } = this.props;
        const { mediaPaths, imageAspectRatio } = this.state;

        if (!mediaPaths[mediaItem.url]) {
            return null;
        }

        // Cap the width so extremely wide images don't push the option layout around
        const width = size * Math.min(imageAspectRatio, 2);

        return (
            <TouchableWithoutFeedback onPress={onPress}>
                <View>
                    <Image
                        source={{ uri: this.absolutePath(mediaItem) }}
                        style={[{ height: size, width }, style]}
                        resizeMode="contain"
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

    renderVideoThumb(onPress) {
        const { size, style } = this.props;

        return (
            <TouchableWithoutFeedback onPress={onPress}>
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

    renderThumb(mediaItem, onPress) {
        return mediaItem.isVideo()
            ? this.renderVideoThumb(onPress)
            : this.renderImageThumb(mediaItem, onPress);
    }

    renderCloseBar(onClose) {
        return (
            <View style={{ backgroundColor: 'black', padding: 5 }}>
                <Button onPress={onClose}
                        style={{ height: 35, alignSelf: 'flex-end', backgroundColor: Colors.ActionButtonColor }}
                        leftIcon={<AvniIcon type="MaterialIcons" name="close"
                                            style={{ color: Colors.headerIconColor, fontSize: 15 }}/>}>
                </Button>
            </View>
        );
    }

    // Up to one image + one video: preserve the existing side-by-side, tap-to-expand behaviour.
    renderLegacy(imageMedia, videoMedia) {
        const { mediaPaths, imageExpanded, videoExpanded } = this.state;

        return (
            <View style={{ marginTop: 5 }}>
                {imageMedia && imageExpanded && (
                    <Modal onRequestClose={() => this.toggleImageExpand(false)}>
                        {this.renderCloseBar(() => this.toggleImageExpand(false))}
                        <ImageViewer imageUrls={[{ url: this.absolutePath(imageMedia) }]} />
                    </Modal>
                )}

                {videoMedia && (
                    <Modal
                        visible={videoExpanded}
                        onRequestClose={() => this.toggleVideoExpand(false)}
                        style={{ height: '100%' }}
                    >
                        <VideoPlayerWrapper
                            uri={this.absolutePath(videoMedia)}
                            onClose={() => this.toggleVideoExpand(false)}
                        />
                    </Modal>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {imageMedia && mediaPaths[imageMedia.url] &&
                        this.renderImageThumb(imageMedia, () => this.toggleImageExpand(true))}
                    {videoMedia && mediaPaths[videoMedia.url] &&
                        this.renderVideoThumb(() => this.toggleVideoExpand(true))}
                </View>
            </View>
        );
    }

    renderGalleryTile(item, tile) {
        const { mediaPaths } = this.state;
        return (
            <TouchableWithoutFeedback onPress={() => this.openGalleryItem(item)}>
                <View style={{
                    width: tile,
                    height: tile,
                    backgroundColor: '#111',
                    borderRadius: 4,
                    overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    {item.isVideo() ? (
                        <AvniIcon name='slideshow' type='MaterialIcons'
                                  style={{ fontSize: tile * 0.4, color: Colors.headerIconColor }}/>
                    ) : (
                        mediaPaths[item.url] &&
                        <Image source={{ uri: this.absolutePath(item) }}
                               style={{ width: tile, height: tile }} resizeMode="cover"/>
                    )}
                </View>
            </TouchableWithoutFeedback>
        );
    }

    // Full-screen page: a grid of thumbnails; tapping a thumbnail opens that image/video.
    // A single Modal swaps its content (grid <-> viewer) — nesting Modals breaks the grid's scroll on Android.
    renderGallery(media) {
        const { width, height } = Dimensions.get('window');
        const { viewerImageIndex, viewerVideo } = this.state;
        const columns = 3;
        const gap = 6;
        const tile = Math.floor((width - gap * (columns + 1)) / columns);
        const images = media.filter(m => m.isImage());

        let content;
        if (viewerImageIndex != null) {
            content = (
                <React.Fragment>
                    {this.renderCloseBar(() => this.setState({ viewerImageIndex: null }))}
                    <ImageViewer
                        index={viewerImageIndex}
                        imageUrls={images.map(m => ({ url: this.absolutePath(m) }))}
                    />
                </React.Fragment>
            );
        } else if (viewerVideo) {
            content = (
                <React.Fragment>
                    {this.renderCloseBar(() => this.setState({ viewerVideo: null }))}
                    <VideoPlayerWrapper
                        uri={this.absolutePath(viewerVideo)}
                        onClose={() => this.setState({ viewerVideo: null })}
                    />
                </React.Fragment>
            );
        } else {
            content = (
                <React.Fragment>
                    {this.renderCloseBar(() => this.toggleGalleryExpand(false))}
                    <FlatList
                        style={{ flex: 1 }}
                        data={media}
                        numColumns={columns}
                        keyExtractor={(m, index) => `${m.url}-${index}`}
                        contentContainerStyle={{ padding: gap, gap }}
                        columnWrapperStyle={{ gap }}
                        renderItem={({ item }) => this.renderGalleryTile(item, tile)}
                    />
                </React.Fragment>
            );
        }

        return (
            <Modal onShow={() => this.forceUpdate()}
                   onRequestClose={() => this.toggleGalleryExpand(false)}>
                <View style={{ width, height, backgroundColor: '#000' }}>
                    {content}
                </View>
            </Modal>
        );
    }

    // Multiple images and/or videos: compact cover thumbnail + "+N" badge that opens the grid page.
    renderMultiple(media) {
        const { mediaPaths, galleryExpanded } = this.state;
        const { size } = this.props;
        const cover = media[0];
        const remaining = media.length - 1;

        return (
            <View style={{ marginTop: 5 }}>
                {galleryExpanded && this.renderGallery(media)}
                {mediaPaths[cover.url] && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {this.renderThumb(cover, () => this.toggleGalleryExpand(true))}
                        {remaining > 0 && (
                            <TouchableWithoutFeedback onPress={() => this.toggleGalleryExpand(true)}>
                                <View style={{
                                    marginLeft: 4,
                                    backgroundColor: Colors.ActionButtonColor,
                                    borderRadius: 12,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2
                                }}>
                                    <Text style={{ color: 'white', fontSize: Math.max(10, size * 0.35) }}>
                                        +{remaining}
                                    </Text>
                                </View>
                            </TouchableWithoutFeedback>
                        )}
                    </View>
                )}
            </View>
        );
    }

    render() {
        const { media } = this.props;

        if (!media || media.length === 0) {
            return null;
        }

        const images = media.filter(m => m.isImage());
        const videos = media.filter(m => m.isVideo());

        // At most one image and one video -> keep the current side-by-side display.
        if (images.length <= 1 && videos.length <= 1) {
            return this.renderLegacy(images[0] || null, videos[0] || null);
        }

        return this.renderMultiple(media);
    }
}

export default MediaContent;

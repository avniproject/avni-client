import React from 'react';
import {Image, TouchableWithoutFeedback, View} from 'react-native';
import PropTypes from 'prop-types';
import AbstractComponent from '../../framework/view/AbstractComponent';
import MediaService from '../../service/MediaService';
import AvniModel from './AvniModel';

class MediaContent extends AbstractComponent {
    static propTypes = {
        mediaType: PropTypes.string.isRequired,
        mediaUrl: PropTypes.string.isRequired,
        size: PropTypes.number,
        style: PropTypes.object,
    };

    static defaultProps = {
        size: 40,
        style: {}
    };

    constructor(props, context) {
        super(props, context);
        this.mediaService = this.getService(MediaService);
        this.state = {
            expanded: false,
            filePath: props.mediaUrl ? this.mediaService.getAbsolutePath(props.mediaUrl, 'Metadata') : null,
            imageAspectRatio: 1 // Default aspect ratio until image loads
        };
    }

    UNSAFE_componentWillMount() {
        this.loadMedia();
        return super.UNSAFE_componentWillMount();
    }

    loadMedia() {
        const { mediaUrl, mediaType } = this.props;
        
        if (mediaUrl && mediaType === 'Image') {
            this.mediaService.downloadFileIfRequired(mediaUrl, 'Metadata')
                .then(filePath => {
                    this.setState({ filePath });
                })
                .catch(error => {
                    console.error('Error loading media:', error);
                });
        }
    }

    toggleExpand = (expanded = false) => {
        this.setState({ expanded });
    }

    renderIcon() {
        const { size, style } = this.props;
        const { filePath } = this.state;
        const { mediaUrl } = this.props;
        
        if (!filePath) {
            return null;
        }
        
        // Get the absolute path using MediaService
        const absolutePath = this.mediaService.getAbsolutePath(mediaUrl, 'Metadata');
        
        return (
            <Image 
                source={{ uri: `file://${absolutePath}` }}
                style={[{ height: size, width: size  }, style]}
            />
        );
    }

    render() {
        const { expanded, filePath } = this.state;
        const { mediaType, mediaUrl } = this.props;
        
        if (mediaType !== 'Image' || !filePath) {
            return null;
        }
        
        // Get the absolute path using MediaService
        const absolutePath = this.mediaService.getAbsolutePath(mediaUrl, 'Metadata');
        
        return (
            <View style={{ marginTop: 5 }}>
                <AvniModel 
                    dismiss={() => this.toggleExpand(false)} 
                    visible={expanded}
                >
                    <View style={{ 
                        backgroundColor: 'white', 
                        borderRadius: 4, 
                        borderWidth: 1, 
                        borderColor: 'black',
                        padding: 4,
                        maxHeight: '80%', // Limit to 80% of the screen height
                        maxWidth: '90%',  // Limit to 90% of the screen width
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Image 
                            source={{ uri: `file://${absolutePath}` }}
                            style={{
                                width: '100%',
                                height: undefined,
                                aspectRatio: 1, // This will be overridden when the image loads
                                maxHeight: '100%',
                            }}
                            resizeMode="contain"
                            // Override aspectRatio with actual image dimensions once loaded
                            onLoad={(event) => {
                                const { width, height } = event.nativeEvent.source;
                                if (width && height) {
                                    this.setState({ imageAspectRatio: width / height });
                                }
                            }}
                        />
                    </View>
                </AvniModel>
                
                <TouchableWithoutFeedback onPress={() => this.toggleExpand(true)}>
                    <View>
                        {this.renderIcon()}
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

export default MediaContent;

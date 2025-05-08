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
        this.state = {
            expanded: false,
            filePath: null
        };
        this.mediaService = this.getService(MediaService);
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
                    <Image 
                        source={{ uri: `file://${absolutePath}` }}
                        style={{ height: 250, width: 250, backgroundColor: 'white', opacity: 1, borderRadius: 4, borderWidth: 1, borderColor: 'black'}}
                        resizeMode="contain"
                    />
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

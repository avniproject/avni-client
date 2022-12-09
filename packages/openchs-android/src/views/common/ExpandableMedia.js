import PropTypes from 'prop-types';
import React, {Fragment} from 'react';
import ExpandableVideo from "./ExpandableVideo";
import ExpandableImage from "./ExpandableImage";
import AbstractFormElement from "../form/formElement/AbstractFormElement";
import MediaService from "../../service/MediaService";
import General from "../../utility/General";
import {StyleSheet, TouchableNativeFeedback, View} from "react-native";
import Colors from "../primitives/Colors";
import ExpandableAudio from "./ExpandableAudio";
import ExpandableFile from "./ExpandableFile";
import AvniIcon from './AvniIcon';

export default class ExpandableMedia extends AbstractFormElement {
    static propTypes = {
        source: PropTypes.string,
        type: PropTypes.string,
        relatedMediaURIs: PropTypes.array
    };

    constructor(props, context) {
        super(props, context);
        this.mediaService = context.getService(MediaService);
        this.state = {};

    }

    async UNSAFE_componentWillMount() {
        await this.mediaService.exists(this.mediaUriInDevice).then(async (exists) => {
            if (exists) {
                await this.downloadDependentURIs();
            }
        });
        super.UNSAFE_componentWillMount();
    }

    downloadDependentURIs() {
        const allMediaAbsolutePath = [];
        if (this.props.relatedMediaURIs) {
            _.forEach(this.props.relatedMediaURIs, mediaURI => {
                const path = this.mediaService.getAbsolutePath(mediaURI, this.props.type);
                allMediaAbsolutePath.push(path);
                this.mediaService.exists(path).then((exists) => {
                    if (!exists) {
                        return this.mediaService.downloadMedia(mediaURI, path);
                    }
                });
            });
            this.setState(state => ({...state, allMediaAbsolutePath}))
        }
    }

    get mediaUriInDevice() {
        return this.props.source && this.mediaService.getAbsolutePath(this.props.source, this.props.type);
    }

    get fileName() {
        return this.props.source && this.mediaService.getFileName(this.props.source);
    }

    componentDidMount() {
        this.setState({mounted: true});
        this.mediaService.exists(this.mediaUriInDevice).then((exists) => {
            /*https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html*/
            if(!this.state.mounted) return;
            this.setState((state) => ({
                ...state, exists
            }));
        });
    }

    componentWillUnmount() {
        this.setState({mounted: false});
    }

    _preDownload = (cb) => {
        this.setState((state) => ({...state, downloading: true}), cb);
    };

    _postDownload = () => {
        this.setState((state) => ({
            ...state,
            exists: true,
            downloading: false
        }));
    };

    _errDownload = (err) => {
        General.logDebug('ExpandableMedia', `${err}`);
    };

    download() {
        this._preDownload(() => {
            this.mediaService.exists(this.mediaUriInDevice).then((exists) => {
                if (!exists) {
                    return this.mediaService.downloadMedia(this.props.source, this.mediaUriInDevice);
                }
            }).then(this._postDownload, this._errDownload);
        });
    }


    showDownloadIcon() {
        if (!this.state.exists) {
            return <View>
                <TouchableNativeFeedback onPress={() => this.download()}>
                    <AvniIcon name={this.state.downloading ? 'loading' : 'download'} style={styles.icon} type='MaterialCommunityIcons'/>
                </TouchableNativeFeedback>
            </View>
        }
    }

    getMediaComponentByType(type) {
        switch (type) {
            case 'Video' : return ExpandableVideo;
            case 'Image' : return ExpandableImage;
            case 'Profile-Pics' : return ExpandableImage;
            case 'Audio' : return ExpandableAudio;
            case 'File'  : return ExpandableFile;
        }
    }

    showExpandableMedia() {
        if (this.props.source && this.state.exists) {
            const MediaComponent = this.getMediaComponentByType(this.props.type);
            return <MediaComponent source={this.mediaUriInDevice} fileName={this.fileName} allMediaAbsolutePath={this.state.allMediaAbsolutePath}/>;
        }
    }

    render() {
        return (
            <Fragment>
                {this.showDownloadIcon()}
                {this.showExpandableMedia()}
            </Fragment>
        );
    }

}


const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        fontSize: 36,
    }
});

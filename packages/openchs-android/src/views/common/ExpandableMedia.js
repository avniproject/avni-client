import React from 'react';
import ExpandableVideo from "./ExpandableVideo";
import ExpandableImage from "./ExpandableImage";
import AbstractFormElement from "../form/formElement/AbstractFormElement";
import MediaService from "../../service/MediaService";
import General from "../../utility/General";
import {StyleSheet, TouchableNativeFeedback, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";

export default class ExpandableMedia extends AbstractFormElement {
    static propTypes = {
        source: React.PropTypes.string,
        type: React.PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.mediaService = context.getService(MediaService);
        this.state = {};

    }

    get mediaUriInDevice() {
        return this.props.source && this.mediaService.getAbsolutePath(this.props.source, this.props.type);
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
        General.logDebug('MediaFormElement', `${err}`);
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
                    <Icon name={this.state.downloading ? 'loading' : 'download'} style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        }
    }

    showExpandableMedia() {
        if (this.props.source && this.state.exists) {
            return this.props.type === 'Video' ? <ExpandableVideo source={this.mediaUriInDevice}/>
                : <ExpandableImage source={this.mediaUriInDevice}/>;
        }
    }

    render() {
        return (
            <View>
                {this.showDownloadIcon()}
                {this.showExpandableMedia()}
            </View>
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

import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import PropTypes from "prop-types";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {Dimensions} from "react-native";
import React from "react";
import {WebView} from 'react-native-webview';
import {size} from 'lodash';

@Path('/newsDetailView')
class NewsDetailView extends AbstractComponent {

    static propTypes = {
        title: PropTypes.string.isRequired,
        newsPublishedDate: PropTypes.array.isRequired,
        contentHtml: PropTypes.string.isRequired,
        exists: PropTypes.bool.isRequired,
        imageURI: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.news);
    }

    viewName() {
        return 'NewsDetailView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        const {title, newsPublishedDate, contentHtml, imageURI, exists} = this.props;
        const slicedTitle = title.slice(0, 25);
        const headerTitle = size(title) > size(slicedTitle) ? `${slicedTitle} ...` : slicedTitle;
        const {width, height} = Dimensions.get('window');
        const imageTag = exists ? `<img src="${imageURI}" height="200" width="${width}" alt="${imageURI}">` : `<div/>`;
        const htmlToRender = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta content='initial-scale=1.0, maximum-scale=1.0, user-scalable=0' name='viewport'/>
        </head>
        <body style="margin: 0 !important;padding: 0 !important; background-color: #ffffff">
        ${imageTag}
        <div style="margin-right:8px; margin-left:8px">
            <p style="font-size: 19px;color: #000000;text-decoration: rgba(0, 0, 0, 0.87);">
                <b>${title}</b>
            </p>
            <p style="margin-top: -15px;font-size: 12px;color: #767676;">
                ${newsPublishedDate}
            </p>
            <p style="margin-top: 15px">
                ${contentHtml}
            </p>
        </div>
        </body>
        </html>
        `;

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={headerTitle} hideIcon={true}/>
                <WebView
                    originWhitelist={['*']}
                    source={{html: htmlToRender}}
                    allowFileAccess={true}
                    style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        height: height,
                        flex: 1,
                    }}
                />
            </CHSContainer>
        )
    }
}

export default NewsDetailView

import React from 'react';
import getRNDraftJSBlocks from 'react-native-draftjs-render';
import {Dimensions, Image, View, Text} from "react-native";
import { WebView } from 'react-native-webview';
import {convertFromRaw} from 'draft-js';
import {stateToHTML} from 'draft-js-export-html';

let contentState = {
    "blocks": [{
        "key": "c4cmm",
        "text": "hello there how are you? what do you want? hmmm. ",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [{"offset": 12, "length": 13, "style": "ITALIC"}, {
            "offset": 25,
            "length": 17,
            "style": "BOLD"
        }, {"offset": 43, "length": 4, "style": "UNDERLINE"}],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "2mjum",
        "text": " fine. go back now.",
        "type": "header-one",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [{"offset": 0, "length": 1, "key": 0}],
        "data": {"textAlign": "ALIGN_CENTER"}
    }],
    "entityMap": {
        "0": {
            "type": "IMAGE1",
            "mutability": "IMMUTABLE",
            "data": {
                "src": "file:///storage/emulated/0/OpenCHS/media/images/sc.png",
                "width": 640,
                "height": 637,
                "originalWidth": 640,
                "originalHeight": 637
            }
        }
    }
};

let contentStatee = {
    "blocks": [{
        "key": "b0q5q",
        "text": "",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "df6bq",
        "text": " ",
        "type": "atomic",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [{"offset": 0, "length": 1, "key": 0}],
        "data": {}
    }, {
        "key": "e0645",
        "text": "",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [],
        "data": {}
    }],
    "entityMap": {
        "0": {
            "type": "image",
            "mutability": "IMMUTABLE",
            "data": {"src": "file:///storage/emulated/0/OpenCHS/media/images/sc.png"}
        }
    }
};

const customBlockHandler = (item, params) => {
    console.log(',item.type', item.type, params);
    return <View></View>;
};

const tryo = {
    "blocks": [{
        "key": "e8m6c",
        "text": "hello there how are you?\nhi?",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [{"offset": 6, "length": 5, "style": "BOLD"}, {
            "offset": 25,
            "length": 3,
            "style": "ITALIC"
        }],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "8habh",
        "text": "what do you want?",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [{"offset": 8, "length": 3, "style": "UNDERLINE"}],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "91mit",
        "text": "adfasdf",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "for9r",
        "text": "asdfadsf",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [{"offset": 6, "length": 2, "style": "ITALIC"}],
        "entityRanges": [],
        "data": {}
    }, {
        "key": "b6ahf",
        "text": " ",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [{"offset": 0, "length": 1, "key": 0}],
        "data": {}
    }], "entityMap": {"0": {"type": "IMAGE", "mutability": "MUTABLE", "data": {"src": "file:///storage/emulated/0/OpenCHS/media/images/sc.png"}}}
};
const yhi = `
<p>hello <strong>there</strong> how are you?<br>
<em>hi?</em></p>
<p>what do <u>you</u> want?</p>
<p>adfasdf</p>
<p>asdfad<em>sf</em></p>
<p><img src="file:///storage/emulated/0/OpenCHS/media/images/sc.png"/></p>
`;

const deviceHeight = Dimensions.get('window').height;
const deviceWidth = Dimensions.get('window').width;

export default () => {
    const blocks = getRNDraftJSBlocks({contentState: contentStatee, customBlockHandler});
    // console.log('came here', blocks);
    return <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'flex-end' }}>
        <WebView
            source={{
                html: stateToHTML(convertFromRaw(tryo)),
            }}
            startInLoadingState={true}
            scalesPageToFit={true}
            style={{
                width: deviceWidth,
                height: deviceHeight * 0.40,
            }}
            allowFileAccess
        />
    </View>;

    return     <WebView
        originWhitelist={['*']}
        source={{ html: yhi }}
        style={{ marginTop: 20 }}
        allowFileAccess
    />;


    return (
        <View>
            {/*<Image source={{uri: "file:///storage/emulated/0/OpenCHS/media/images/sc.png"}}*/}
                   {/*style={{height: 50, width: 100}}/>*/}
            {/*<View style={{flex: 1}}>{blocks}</View>*/}
            {/*<Text>hey</Text>*/}
            <WebView
                originWhitelist={['*']}
                source={{ uri: `https://infinite.red/`, url: `https://infinite.red/` }}
                style={{ marginTop: 20, width: 180 }}
            />
            {/*<Text>hey</Text>*/}
        </View>
    );
};


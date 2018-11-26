import {Alert, ToastAndroid, Text, View, Dimensions, Modal, ActivityIndicator} from "react-native";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from 'lodash';
import Path from "../framework/routing/Path";
import {Button} from "native-base";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import {EntityMetaData} from "openchs-models";
import EntityService from "../service/EntityService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import MyDashboardView from "./mydashbaord/MyDashboardView";
import FamilyFolderView from "./familyfolder/FamilyFolderView";
import CHSNavigator from "../utility/CHSNavigator";
import RuleEvaluationService from "../service/RuleEvaluationService";
import General from "../utility/General";
import ProgramConfigService from "../service/ProgramConfigService";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import Fonts from "./primitives/Fonts";
import Colors from "./primitives/Colors";
import MessageService from "../service/MessageService";
import AuthenticationError from "../service/AuthenticationError";
import AuthService from "../service/AuthService";
import RuleService from "../service/RuleService";
import Video from 'react-native-video';


const {width, height} = Dimensions.get('window');

@Path('/PlaygroundView')
class PlaygroundView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this.createStyles();
    }

    viewName() {
        return "PlaygroundView";
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48};

    createStyles() {
        this.columnStyle = {
            marginHorizontal: DynamicGlobalStyles.resizeWidth(29),
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: DynamicGlobalStyles.resizeWidth(71),
            flexDirection: 'column'
        };
        this.syncContainerStyle = {
            flex: 1,
            flexDirection: 'column',
            flexWrap: 'nowrap',
            backgroundColor: "rgba(0, 0, 0, 0.5)",
        };

        this.syncBackground = {
            width: width * .7,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: 20,
            alignSelf: 'center',
            backgroundColor: Colors.getCode("paperGrey900").color,
        };
        this.syncTextContent = {
            color: Colors.TextOnPrimaryColor
        };
        this.backgroundVideo = {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
        };
    }


    render() {
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    height: Dimensions.get('window').height, backgroundColor: Styles.defaultBackground
                }}>
                    <Video source={{uri: "file:///sdcard/Movies/openchs/Sewa Rural.mp4"}}   // Can be a URL or a local file.
                           ref={(ref) => {
                               this.player = ref
                           }}                                      // Store reference
                           style={this.backgroundVideo}/>
                </View>
            </CHSContent>
        );
    }
}

export default PlaygroundView;

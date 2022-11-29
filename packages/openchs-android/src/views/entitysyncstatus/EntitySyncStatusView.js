import {Alert, Text, TouchableNativeFeedback, View, ScrollView} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Actions from "../../action/common/EntitySyncStatusActions";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import EntityQueueService from "../../service/EntityQueueService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import Distances from "../primitives/Distances";
import EntitySyncStatusSummary from "./EntitySyncStatusSummary";
import EntitySyncStatusTable from "./EntitySyncStatusTable";

@Path('/entitySyncStatusView')
class EntitySyncStatusView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.entitySyncStatusList);
        this.styles = {
            table: {
                backgroundColor: Colors.GreyContentBackground,
            }
        };
    }

    viewName() {
        return 'EntitySyncStatusView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.Names.ON_LOAD);
        super.UNSAFE_componentWillMount();
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('entitySyncStatus')}/>
                    <ScrollView>
                        <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                            <EntitySyncStatusSummary totalQueueCount={this.state.totalQueueCount}
                                                     lastLoaded={this.state.lastLoaded}/>
                            <EntitySyncStatusTable data={this.state.entitySyncStatusList}/>
                        </View>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default EntitySyncStatusView;

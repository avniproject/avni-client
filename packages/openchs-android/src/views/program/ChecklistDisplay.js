import PropTypes from 'prop-types';
import React from "react";
import {View} from "react-native";
import {Button, Text} from "native-base";
import {Duration} from 'openchs-models';
import DGS from "../primitives/DynamicGlobalStyles";
import Fonts from "../primitives/Fonts";
import {ChecklistActions, ChecklistActionsNames as Actions} from "../../action/program/ChecklistActions";
import Styles from "../primitives/Styles";
import _ from 'lodash';
import Distances from "../primitives/Distances";
import ChecklistItemDisplay from "./ChecklistItemDisplay";


export default ({data, onSave}) => (
    <View style={{
        marginHorizontal: DGS.resizeWidth(Distances.ContentDistanceFromEdge),
        backgroundColor: Styles.whiteColor,
        borderRadius: 5,
        flexDirection: 'column',
        flexWrap: "nowrap",
        paddingHorizontal: DGS.resizeWidth(13)
    }}>
        <Text style={{fontSize: Fonts.Large}}>{data.name}</Text>
        {Object.entries(data.groupedItems).map(([state, items], idx) =>
            <View key={idx}
                  style={{marginTop: DGS.resizeHeight(10)}}>
                <Text
                    style={{fontSize: Fonts.Medium}}>{_.startCase(state)}</Text>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start'
                }}>
                    {items.map((item, idx) =>
                        <ChecklistItemDisplay
                            key={idx}
                            checklistItem={item.checklistItem}
                            applicableState={item.applicableState}
                            completionDateAction={Actions.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE}/>
                    )}
                </View>
            </View>)}
    </View>);

import React from "react";
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import ListView from "deprecated-react-native-listview";
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {FamilyFolderActionNames as Actions} from "../../action/familyFolder/FamilyFolderActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AddressFamilyRow from './AddressFamilyRow';
import Distances from '../primitives/Distances'
import Separator from '../primitives/Separator';
import TypedTransition from "../../framework/routing/TypedTransition";
import FamilyRegisterView from "../familyfolder/FamilyRegisterView";
import AvniIcon from '../common/AvniIcon';

@Path('/FamilyFolder')
class FamilyFolderView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FamilyFolderView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyFolder);
        this.ds = new ListView.DataSource({rowHasChanged: () => false});
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge
        },

            TouchableOpacityStyle:{
                position: 'absolute',
                width: 60,
                height: 60,
                alignItems: 'center',
                justifyContent: 'center',
                right: 30,
                bottom: 30,
                borderRadius: 150,
                backgroundColor:Colors.AccentColor
            },

            FloatingButtonStyle: {
                color: Colors.TextOnPrimaryColor
            }
    });

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.UNSAFE_componentWillMount();
    }

    _onPressButton() {
        TypedTransition.from(this).to(FamilyRegisterView);
    }

    render() {
        const dataSource = this.ds.cloneWithRows(_.values(this.state.familiesSummary));
        return (
            <CHSContainer  style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('familyFolder')}/>
                <CHSContent>
                    <View style={FamilyFolderView.styles.container}>
                        <ListView enableEmptySections={true} dataSource={dataSource}
                                  initialListSize={1}
                                  removeClippedSubviews={true}
                                  renderSeparator={(ig, idx) => (<Separator key={idx} height={2}/>)}
                                  renderRow={(rowData) => <AddressFamilyRow address={rowData.address}
                                                                           familiesSummary={rowData.familiesSummary}/>}/>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5} onPress={this._onPressButton.bind(this)} style ={FamilyFolderView.styles.TouchableOpacityStyle}>
                    <AvniIcon name='account-multiple-plus' type='MaterialCommunityIcons'
                              style={{fontSize: 40, ...FamilyFolderView.styles.FloatingButtonStyle}}/>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default FamilyFolderView;

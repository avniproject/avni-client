import PropTypes from 'prop-types';
import React from "react";
import {Text, View, StyleSheet, ListView, TouchableNativeFeedback} from 'react-native';
import _ from 'lodash';
import {Header} from 'native-base';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {FamilyFolderActionNames as Actions} from "../../action/familyFolder/FamilyFolderActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Distances from '../primitives/Distances'
import FamilyProfile from './FamilyProfile';
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import General from "../../utility/General";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/FamilyList')
class FamilyList extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FamilyList";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyFolder);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    }

    static styles = StyleSheet.create({
        container: {
            backgroundColor: Styles.greyBackground
        },
        header: {
            fontWeight: "500",
            color: Colors.InputNormal,
            marginTop: DynamicGlobalStyles.resizeHeight(16),
            marginBottom: DynamicGlobalStyles.resizeHeight(16)
        }
    });

    componentWillMount() {
        General.logDebug("FamilyList", "Component Will Mount");
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.componentWillMount();
    }

    componentWillUnmount() {
        General.logDebug("FamilyList", "Component Will UnMount");
        this.dispatchAction(Actions.RESET_LIST);
        super.componentWillUnmount();
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }


    render() {
        const dataSource = this.ds.cloneWithRows(this.state.familiesList.data);
        const familyType = this.I18n.t(this.props.params.listType);
        return (
            <CHSContainer theme={themes}>
                <AppHeader
                    title={`${this.props.params.address.name} - ${familyType}`}/>
                <CHSContent>
                    <ListView
                        style={FamilyList.styles.container}
                        initialListSize={20}
                        enableEmptySections={true}
                        renderHeader={() => (
                            <Text style={[Fonts.typography("paperFontTitle"), FamilyList.styles.header]}>
                                {`${this.I18n.t("familyCountInThisCategory", {count: this.props.params.total})}`}
                            </Text>)}
                        removeClippedSubviews={true}
                        dataSource={dataSource}
                        renderRow={(family) =>
                            <TouchableNativeFeedback onPress={() => this.onResultRowPress(family)}
                                                     background={this.background()}>
                                <View>
                            <FamilyProfile viewContext={FamilyProfile.viewContext.Family} family={family}/>
                                <View style={{borderBottomColor: Colors.GreyBackground, borderBottomWidth: 1,}}/>
                                </View>
                            </TouchableNativeFeedback>
                        }/>
                </CHSContent>
            </CHSContainer>
        );
    }

    onResultRowPress(family) {
        CHSNavigator.navigateToFamilyDashboardView(this, family.uuid);
    }

}

export default FamilyList;
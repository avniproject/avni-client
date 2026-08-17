import React from "react";
import {Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import _ from 'lodash';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AbstractComponent from "../../framework/view/AbstractComponent";
import SubjectProfilePicture from "./SubjectProfilePicture";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";

const AVATAR_SIZE = 56;

class EncounterSubjectHeader extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        // Optional: when provided, the chevron below is driven by the caller (e.g. to slide open
        // the previous-encounters view) instead of just expanding the address text in place.
        expanded: PropTypes.bool,
        onToggleExpand: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {addressExpanded: false};
    }

    toggleAddressExpanded() {
        this.setState(state => ({addressExpanded: !state.addressExpanded}));
    }

    render() {
        const {individual, onToggleExpand} = this.props;
        const isExternallyControlled = !_.isNil(onToggleExpand);
        const isExpanded = isExternallyControlled ? this.props.expanded : this.state.addressExpanded;
        const onTogglePress = isExternallyControlled ? onToggleExpand : () => this.toggleAddressExpanded();
        const i18n = this.I18n;
        const addressText = individual.lowestTwoLevelAddress(i18n);
        return (
            <View style={{backgroundColor: '#ffffff', paddingTop: 16, paddingBottom: 12}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <SubjectProfilePicture
                        size={AVATAR_SIZE}
                        subjectType={individual.subjectType}
                        round={true}
                        individual={individual}
                        containerStyle={{marginRight: 16}}
                    />
                    <View style={{flex: 1}}>
                        <Text style={{fontSize: Styles.titleSize, fontWeight: 'bold', color: Styles.blackColor}}
                              numberOfLines={1} ellipsizeMode='tail'>
                            {individual.getTranslatedNameString(i18n)}
                        </Text>
                        {individual.isPerson() &&
                        <Text style={{fontSize: Styles.normalTextSize, color: Styles.blackColor, marginTop: 2}}>
                            {individual.userProfileSubtext1(i18n)} • {individual.userProfileSubtext2(i18n)}
                        </Text>}
                    </View>
                </View>
                {!_.isEmpty(addressText) &&
                <View style={{marginTop: 16}}>
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: Colors.InputBorderNormal,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8
                    }}>
                        <Text style={{fontSize: Styles.smallerTextSize, color: Styles.greyText}}>
                            {i18n.t('location')}
                        </Text>
                        <Text style={{fontSize: Styles.normalTextSize, color: Colors.ActionButtonColor, marginTop: 2}}
                              numberOfLines={isExpanded ? undefined : 1}
                              ellipsizeMode='tail'>
                            {addressText}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onTogglePress}
                                       style={{
                                           flexDirection: 'row',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           marginTop: 28,
                                           height: 56,
                                           borderWidth: 1,
                                           borderColor: Colors.BrandPrimaryDark,
                                           borderRadius: 8,
                                           paddingHorizontal: 12,
                                           backgroundColor: 'transparent'
                                       }}>
                        <Text style={{fontSize: Styles.smallTextSize, color: Colors.BrandPrimaryDark, fontWeight: '500', marginRight: 4}}>
                            {i18n.t(isExpanded ? 'viewLess' : 'viewMore')}
                        </Text>
                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18}
                              color={Colors.BrandPrimaryDark}/>
                    </TouchableOpacity>
                </View>}
            </View>
        );
    }
}

export default EncounterSubjectHeader;

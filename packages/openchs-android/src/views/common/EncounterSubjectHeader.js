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
            <View style={{backgroundColor: '#ffffff', paddingVertical: 16}}>
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
                <View style={{flexDirection: 'row', alignItems: 'stretch', marginTop: 16}}>
                    <View style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: Colors.InputBorderNormal,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginRight: 10
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
                    {/* No fixed height here - stretches (via the row's alignItems: 'stretch') to
                        match the location box's content-driven height instead of risking a mismatch
                        if that box's text ever wraps to a different number of lines. */}
                    <TouchableOpacity onPress={onTogglePress}
                                       style={{
                                           width: 48,
                                           borderRadius: 8,
                                           borderWidth: 1,
                                           borderColor: Colors.BorderDefault,
                                           backgroundColor: '#ffffff',
                                           alignItems: 'center',
                                           justifyContent: 'center'
                                       }}>
                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22}
                              color={Styles.greyText}/>
                    </TouchableOpacity>
                </View>}
            </View>
        );
    }
}

export default EncounterSubjectHeader;

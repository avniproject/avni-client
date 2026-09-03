import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {FlatList, Text, TouchableOpacity, View} from "react-native";
import React from "react";
import _ from "lodash";
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import SubjectInfoCard from "../common/SubjectInfoCard";

// Above this the list scrolls in its own right; below it a plain map avoids nesting a
// VirtualizedList inside the screen's ScrollView for no benefit.
const VIRTUALISE_THRESHOLD = 8;

class SelectedMembersList extends AbstractComponent {
    static propTypes = {
        selectedMembers: PropTypes.array.isRequired,
        onRemove: PropTypes.func.isRequired,
        roleCapacityRemaining: PropTypes.number
    };

    constructor(props, context) {
        super(props, context);
    }

    renderHeader() {
        const {selectedMembers, roleCapacityRemaining} = this.props;
        const eligible = _.filter(selectedMembers, ({validationResults}) => _.isEmpty(validationResults)).length;
        const total = selectedMembers.length;
        return <View style={{marginTop: 8}}>
            <Text style={{fontSize: 15, color: Styles.greyText}}>
                {this.I18n.t('membersSelectedCount', {count: total})}
            </Text>
            {eligible < total &&
            <Text style={{fontSize: 13, color: Colors.ValidationError}}>
                {this.I18n.t('membersEligibleCount', {eligible, total})}
            </Text>}
            {eligible === total && _.isFinite(roleCapacityRemaining) &&
            <Text style={{fontSize: 13, color: Styles.lightgrey}}>
                {this.I18n.t('roleCapacityRemaining', {remaining: roleCapacityRemaining})}
            </Text>}
        </View>;
    }

    renderMember({memberSubject, validationResults}) {
        return <View key={memberSubject.uuid}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={{flex: 1}}>
                    <SubjectInfoCard individual={memberSubject}/>
                </View>
                <TouchableOpacity activeOpacity={0.5}
                                  accessibilityLabel={this.I18n.t('removeSelectedMember')}
                                  onPress={() => this.props.onRemove(memberSubject.uuid)}>
                    <Icon name="close" style={{color: Colors.ValidationError, fontSize: 24, paddingHorizontal: 12}}/>
                </TouchableOpacity>
            </View>
            {_.map(validationResults, (validationResult, index) =>
                <ValidationErrorMessage key={index} validationResult={validationResult}/>)}
            <Separator/>
        </View>;
    }

    render() {
        const {selectedMembers} = this.props;
        // Nothing to say before anything is picked - the search button already says it.
        if (_.isEmpty(selectedMembers)) return null;
        return <View>
            {this.renderHeader()}
            {selectedMembers.length > VIRTUALISE_THRESHOLD
                ? <FlatList style={{maxHeight: 400}}
                            nestedScrollEnabled={true}
                            data={selectedMembers}
                            keyExtractor={({memberSubject}) => memberSubject.uuid}
                            renderItem={({item}) => this.renderMember(item)}/>
                : _.map(selectedMembers, member => this.renderMember(member))}
        </View>;
    }
}

export default SelectedMembersList;

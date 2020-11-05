import {TouchableOpacity, View} from "react-native";
import {Text} from 'native-base';
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Colors from "../../primitives/Colors";
import Distances from "../../primitives/Distances";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Entypo from "react-native-vector-icons/Entypo";
import TypedTransition from "../../../framework/routing/TypedTransition";
import IndividualSearchView from "../../individual/IndividualSearchView";
import {Concept, SubjectType} from "openchs-models";
import IndividualService from "../../../service/IndividualService";
import EntityService from "../../../service/EntityService";

class MultiSelectSubjectFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
        this.individualService = context.getService(IndividualService);
        this.entityService = context.getService(EntityService);
    }

    renderSearchIcon() {
        return <TouchableOpacity activeOpacity={0.5} onPress={this.search.bind(this)} transparent>
            <Icon name="magnify"
                  style={{color: Colors.ActionButtonColor, fontSize: 30, marginLeft: 10}}/>
        </TouchableOpacity>
    }

    removeSubject(answerUUID) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: answerUUID,
        });
    }

    subjectTypeUUID() {
        return this.props.element.concept.recordValueByKey(Concept.keys.subjectTypeUUID);
    }

    search() {
        const subjectTypeUUID = this.subjectTypeUUID();
        if (subjectTypeUUID) {
            const subjectType = this.entityService.findByUUID(subjectTypeUUID, SubjectType.schema.name);
            TypedTransition.from(this).bookmark().with(
                {
                    showHeader: true,
                    hideBackButton: false,
                    memberSubjectType: subjectType,
                    onIndividualSelection: (source, individual) => {
                        TypedTransition.from(source).popToBookmark();
                        this.dispatchAction(this.props.actionName, {
                            formElement: this.props.element,
                            answerUUID: individual.uuid,
                        });
                    }
                }).to(IndividualSearchView, true);
        }
    }

    renderAnswer(subject) {
        if (subject) {
            return <View style={{
                flexDirection: 'row',
                borderWidth: 0.5,
                borderRadius: 10,
                alignItems: 'center',
                paddingHorizontal: 5,
                paddingVertical: 2,
                backgroundColor: Colors.GreyBackground,
                marginLeft: 5,
            }}>
                <Text>{subject.nameString}</Text>
                <TouchableOpacity onPress={() => this.removeSubject(subject.uuid)}>
                    <Entypo name='cross' style={{fontSize: 20, color: Colors.ActionButtonColor, marginLeft: 5}}/>
                </TouchableOpacity>
            </View>
        }
    }

    render() {
        const subjectUUIDs = _.get(this.props.value, 'answer');
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {this.label}
                    {this.renderSearchIcon()}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {_.map(subjectUUIDs, subjectUUID => this.renderAnswer(this.individualService.findByUUID(subjectUUID)))}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        )
    }
}

export default MultiSelectSubjectFormElement;

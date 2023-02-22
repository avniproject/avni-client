import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import IndividualService from "../../../service/IndividualService";
import EntityService from "../../../service/EntityService";
import _ from "lodash";
import {TouchableOpacity, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../primitives/Colors";
import React from "react";
import {Concept, SubjectType} from "openchs-models";
import TypedTransition from "../../../framework/routing/TypedTransition";
import IndividualSearchView from "../../individual/IndividualSearchView";
import {Text} from "native-base";
import Entypo from "react-native-vector-icons/Entypo";

class SubjectFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };
    static defaultProps = {
        style: {}
    };

    SWITCH_TO_SEARCH_UI_THRESHOLD: number = 30;

    constructor(props, context) {
        super(props, context);
        this.individualService = context.getService(IndividualService);
        this.entityService = context.getService(EntityService);
    }

    getSubjectOptions() {
        const answersToShow = this.props.element.answersToShow;
        const subjectOptions = [];
        if (!_.isEmpty(answersToShow)) {
            answersToShow.map(uuid => {
                const subject = this.individualService.findByUUID(uuid);
                if (subject != null && this.individualService.unVoided(subject)) {
                    subjectOptions.push(subject);
                }
            });
            return _.sortBy(subjectOptions, ['nameString']);
        }
    }

    renderSearchIcon() {
        return <TouchableOpacity activeOpacity={0.5} onPress={this.search.bind(this)} transparent>
            <Icon name="magnify"
                  style={{color: Colors.ActionButtonColor, fontSize: 30, marginLeft: 10}}/>
        </TouchableOpacity>
    }

    toggleFormElementAnswerSelection(subjectUUID) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: subjectUUID,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
        });
    }

    subjectTypeUUID() {
        return this.props.element.concept.recordValueByKey(Concept.keys.subjectTypeUUID);
    }

    search() {
        this.dismissKeyboard();
        const subjectTypeUUID = this.subjectTypeUUID();
        if (subjectTypeUUID) {
            const subjectType = this.entityService.findByUUID(subjectTypeUUID, SubjectType.schema.name);
            TypedTransition.from(this).bookmark().with(
                {
                    showHeader: true,
                    hideBackButton: false,
                    memberSubjectType: subjectType,
                    allowedSubjectUUIDs: this.props.element.answersToShow,
                    onIndividualSelection: (source, individual) => {
                        TypedTransition.from(source).popToBookmark();
                        this.dispatchAction(this.props.actionName, {
                            formElement: this.props.element,
                            answerUUID: individual.uuid,
                            parentFormElement: this.props.parentElement,
                            questionGroupIndex: this.props.questionGroupIndex,
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
                <Text>{subject.nameStringWithUniqueAttribute}</Text>
                <TouchableOpacity onPress={() => this.toggleFormElementAnswerSelection(subject.uuid)}>
                    <Entypo name='cross' style={{fontSize: 20, color: Colors.ActionButtonColor, marginLeft: 5}}/>
                </TouchableOpacity>
            </View>
        }
    }
}

export default SubjectFormElement;

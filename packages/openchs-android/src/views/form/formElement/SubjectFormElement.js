import {TouchableOpacity, View} from "react-native";
import {Button, Text} from 'native-base';
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";
import Distances from "../../primitives/Distances";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import TypedTransition from "../../../framework/routing/TypedTransition";
import IndividualSearchView from "../../individual/IndividualSearchView";
import {Concept, SubjectType} from "openchs-models";
import IndividualService from "../../../service/IndividualService";
import EntityService from "../../../service/EntityService";

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

    renderRemoveIcon() {
        if (!_.isEmpty(_.get(this.props.value, 'answer'))) {
            return (
                <Button transparent onPress={() => this.removeSubject()} style={{height: 20, alignSelf: 'center'}}>
                    <Icon name='backspace' style={{fontSize: 20, color: Colors.ActionButtonColor, marginLeft: 10}}/>
                </Button>);
        }
    }

    removeSubject() {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            value: null,
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
                            value: individual ? individual.uuid : null,
                        });
                    }
                }).to(IndividualSearchView, true);
        }
    }

    render() {
        const subject = _.get(this.props.value, 'answer') ? this.individualService.findByUUID(this.props.value.answer) : null;
        const subjectName = subject ? subject.nameString : '';
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {this.label}
                    {this.renderSearchIcon()}
                </View>
                <View style={{flexDirection: 'row'}}>
                    <Text style={[{
                        marginVertical: 0,
                        paddingVertical: 5
                    }, Styles.formBodyText]}>{subjectName}</Text>
                    {this.renderRemoveIcon()}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        )
    }
}

export default SubjectFormElement;

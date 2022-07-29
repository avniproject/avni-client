import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {Text, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import SubjectProfilePicture from "./SubjectProfilePicture";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import _ from 'lodash';
import ConceptService from "../../service/ConceptService";
import {Observation} from 'avni-models';
import EncounterService from "../../service/EncounterService";
import IndividualService from "../../service/IndividualService";
import AddressLevelService from "../../service/AddressLevelService";

class SubjectInfoCard extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        renderDraftString: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.encounterService = context.getService(EncounterService);
        this.subjectService = context.getService(IndividualService);
        this.addressLevelService = context.getService(AddressLevelService);
    }

    renderProgram(program, index) {
        return (
            <Text key={index} disabled
                  style={[{
                      height: 22,
                      marginLeft: 4,
                      marginRight: 4,
                      borderRadius: 2,
                      paddingHorizontal: 4,
                      marginVertical: 1,
                      backgroundColor: program.colour,
                      color: Colors.TextOnPrimaryColor,
                  }, Styles.userProfileProgramTitle]}>{this.I18n.t(program.displayName)}</Text>
        );
    }

    renderAgeAndGender(i18n) {
        return <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
        }}>
            <Text
                style={[{opacity: 0.6}, Styles.userProfileSubtext]}>{this.props.individual.userProfileSubtext1(i18n)}</Text>
            <Text
                style={[{opacity: 0.6}, Styles.userProfileSubtext]}>{this.props.individual.userProfileSubtext2(i18n)}</Text>
        </View>
    }

    renderCustomSearchResultFields(i18n, conceptService) {
        const searchResultConcepts = this.getService(OrganisationConfigService).getCustomSearchResultConceptsForSubjectType(this.props.individual.subjectType);
        return _.map(searchResultConcepts, ({name, uuid}) => {
            const observation = this.props.individual.findObservation(name);
            if (_.isNil(observation)) return null;
            const displayable = Observation.valueForDisplay({observation, conceptService,
                subjectService:this.subjectService, addressLevelService:this.addressLevelService, i18n, encounterService:this.encounterService});
            return <Text style={[{opacity: 0.6}, Styles.userProfileSubtext]}>{displayable.displayValue}</Text>
        })
    }

    render() {
        const i18n = this.I18n;
        const conceptService = this.getService(ConceptService);
        const iconContainerStyle = {minHeight: 72, alignItems: 'center', justifyContent: 'center'};
        return (
            <View style={{
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                alignSelf: 'center',
                minHeight: 72,
                backgroundColor: Colors.cardBackgroundColor,
                paddingHorizontal: 8
            }}>
                <SubjectProfilePicture
                    size={24}
                    subjectType={this.props.individual.subjectType}
                    style={{marginRight: 8}}
                    round={true}
                    individual={this.props.individual}
                    containerStyle={iconContainerStyle}
                />
                <View
                    style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        flex: 1
                    }}>
                    <Text style={Styles.textStyle}>
                        {this.props.individual.nameString}
                        {this.props.individual.voided &&
                        <Text style={{color: Styles.redColor}}>
                            {` ${this.I18n.t("voidedLabel")}`}
                        </Text>
                        }
                        {this.props.renderDraftString &&
                        <Text style={{color: Styles.redColor}}>
                            {` (${this.I18n.t("draft")})`}
                        </Text>
                        }
                    </Text>
                    {this.props.individual.isPerson() ? this.renderAgeAndGender(i18n) : null}
                    {this.renderCustomSearchResultFields(i18n, conceptService)}
                </View>
                <View style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    flex: 1
                }}>
                    <View style={{justifyContent: 'flex-end'}}>
                        <Text
                            style={[{opacity: 0.6}, Styles.textStyle]}>{this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text>
                    </View>
                    {!this.props.hideEnrolments &&
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                    }}>
                        {_.filter(this.props.individual.nonVoidedEnrolments(), (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}
                    </View>}
                </View>
            </View>
        );
    }
}

export default SubjectInfoCard

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
import {Observation, ProgramEnrolment} from 'openchs-models';
import EncounterService from "../../service/EncounterService";
import IndividualService from "../../service/IndividualService";
import AddressLevelService from "../../service/AddressLevelService";

const styles = {
    subjectName: {
        fontSize: Styles.smallTextSize,
        fontStyle: 'normal',
        color: Styles.blackColor,
        lineHeight: Styles.smallTextSizeLineHeight
    },
    subjectSubtext1: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.blackish,
        paddingRight: 8
    },
    subjectSubtext2: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.blackish,
    },
    subjectAddress: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.lightgrey,
    },
    enrolledProgram: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.whiteColor,
    },
    customSearchField: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.grey,
        paddingRight: 8
    }
}

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
                      marginRight: 4,
                      borderRadius: 2,
                      paddingHorizontal: 4,
                      marginVertical: 2,
                      backgroundColor: program.colour,
                      color: Colors.TextOnPrimaryColor,
                  }, styles.enrolledProgram]}
                  numberOfLines={1} ellipsizeMode='tail'>{this.I18n.t(program.displayName)}</Text>
        );
    }

    renderAgeAndGender(i18n) {
        return <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
        }}>
            <Text
                style={styles.subjectSubtext1}>{this.props.individual.userProfileSubtext1(i18n)}</Text>
            <Text
                style={styles.subjectSubtext2}>{this.props.individual.userProfileSubtext2(i18n)}</Text>
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
        const enrolledPrograms = _.filter(this.props.individual.nonVoidedEnrolments(), (enrolment) => enrolment.isActive)
            .map((x: ProgramEnrolment) => x.program);

      const subjectAddressText = this.props.individual.lowestTwoLevelAddress(i18n);
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
                    size={32}
                    subjectType={this.props.individual.subjectType}
                    style={{marginRight: 12}}
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
                    <Text style={styles.subjectName}>
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
                    <View style={{justifyContent: 'flex-start'}}>
                        <Text
                            style={styles.subjectAddress}>{subjectAddressText}</Text>
                    </View>
                    {this.renderCustomSearchResultFields(i18n, conceptService)}
                        {!this.props.hideEnrolments &&
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            flexWrap: 'wrap',
                        }}>
                            {_.uniqBy(enrolledPrograms, (x) => x.name).map((program, index) => this.renderProgram(program, index))}
                        </View>}
                </View>
            </View>
        );
    }
}

export default SubjectInfoCard

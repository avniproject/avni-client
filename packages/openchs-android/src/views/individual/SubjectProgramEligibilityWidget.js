import React, {Fragment} from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import _ from 'lodash';
import {SectionList, StyleSheet, View} from 'react-native';
import {Button, Text} from 'native-base';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import {ProgramEnrolment, WorkItem, WorkList, WorkLists} from 'avni-models';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import Separator from "../primitives/Separator";
import ProgramService from "../../service/program/ProgramService";
import AuthService from "../../service/AuthService";
import TypedTransition from "../../framework/routing/TypedTransition";
import ManualProgramEligibilityView from "../program/ManualProgramEligibilityView";
import {AlertMessage} from "../common/AlertMessage";

class SubjectProgramEligibilityWidget extends AbstractComponent {

    static propTypes = {
        subject: PropTypes.object.isRequired,
        subjectProgramEligibilityStatuses: PropTypes.array.isRequired,
        onSubjectProgramEligibilityPress: PropTypes.func.isRequired,
        onManualProgramEligibilityPress: PropTypes.func.isRequired,
        onDisplayIndicatorToggle: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    async onSubjectProgramEligibility() {
        const programs = this.getService(ProgramService).loadAllNonVoided();
        const authToken = await this.getService(AuthService).getAuthToken();
        await this.props.onDisplayIndicatorToggle(true);
        let subjectProgramEligibilityStatuses = [];
        try {
            subjectProgramEligibilityStatuses = await this.getService(RuleEvaluationService).getSubjectProgramEligibilityStatuses(this.props.subject, programs, authToken);
        }
        catch(e) {
            AlertMessage(this.I18n.t("eligibilityFailedTitle"), this.I18n.t(e.message));
        }
        await this.props.onSubjectProgramEligibilityPress(subjectProgramEligibilityStatuses)
    }

    isSubjectProgramEligibilityStatusAvailable() {
        let programWithEligibilityStatus = undefined;
        _.forEach(this.props.subjectProgramEligibilityStatuses, (eligibilityStatusesOfMember) => {
            programWithEligibilityStatus = _.find(eligibilityStatusesOfMember.data,
                (programStatusData) => programStatusData.subjectProgramEligibility != null)

            if (!_.isNil(programWithEligibilityStatus)) return false;
        })

        return programWithEligibilityStatus;
    };

    renderHeader() {
        const programEligibilityCheckRule = _.get(this.props, 'subject.subjectType.programEligibilityCheckRule');
        return (
            <View style={{marginVertical: 8}}>
                <Text style={styles.titleTextStyle}>{this.I18n.t('eligibilityReport')}</Text>
                {!_.isEmpty(programEligibilityCheckRule) &&
                <Button small onPress={async () => await this.onSubjectProgramEligibility()} style={{alignSelf: 'flex-end'}}>
                    <Text>{this.I18n.t('checkEligibility')}</Text>
                </Button>}
            </View>
        )
    }

    onEnrol(subjectProgramEligibility) {
        const individual = subjectProgramEligibility.subject;
        const program = subjectProgramEligibility.program;
        const enrolment = ProgramEnrolment.createEmptyInstance({individual, program});
        CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, new WorkLists(new WorkList('Enrol', [
            new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENROLMENT, {
                programName: program.name,
                subjectUUID: _.get(individual, 'uuid')
            })
        ])));
    }

    onManualEligibilityCheck(subject, program) {
        TypedTransition.from(this).with({subject, program}).to(ManualProgramEligibilityView, true)
    }

    isManualEligibilityCheckEnabled(data) {
        let manualEligibilityCheckEnabledProgram = _.find(data, (programEligibilityData) =>
            programEligibilityData.program.manualEligibilityCheckRequired === true)
        if(!_.isNil(manualEligibilityCheckEnabledProgram))
            return true;
    }

    renderItem({program, subjectProgramEligibility, isEnrolmentEligible}) {
        if(!program.manualEligibilityCheckRequired && _.isNil(this.isSubjectProgramEligibilityStatusAvailable())) return null;

        const eligibilityStatus = _.get(subjectProgramEligibility, 'eligibilityString', 'unavailable');
        return (
            <View style={styles.itemContainer}>
                <View style={[styles.headerContainer,{flex: 0.4}]}>
                    <Text style={styles.contentTextStyle}>{this.I18n.t(program.displayName)}</Text>
                </View>
                <View style={[styles.headerContainer, {flex:0.2}]}>
                    <Text style={styles.contentTextStyle}>{this.I18n.t(eligibilityStatus)}</Text>
                </View>
                <View style={styles.programActionsContainer}>
                    {program.manualEligibilityCheckRequired ?
                    <Button small onPress={() => this.onManualEligibilityCheck(this.props.subject, program)}>
                        <Text>{this.I18n.t('check')}</Text>
                    </Button> : null}
                    {isEnrolmentEligible ?
                    <Button style={{marginLeft: 3}} small onPress={() => this.onEnrol(subjectProgramEligibility)}>
                        <Text>{this.I18n.t('Enrol')}</Text>
                    </Button> : null}
                </View>
            </View>
        )
    }

    renderSection(subject, data) {
        if(!this.isManualEligibilityCheckEnabled(data) && _.isNil(this.isSubjectProgramEligibilityStatusAvailable())) return null;

        return (
            <Fragment>
                <Separator backgroundColor={Colors.InputBorderNormal}/>
                <View style={{flexDirection: 'column', marginVertical: 4}}>
                    <Text>{subject.nameString}</Text>
                    <View style={{flexDirection: 'row', flex: 1, marginTop: 4}}>
                        <View style={{flex: 0.4}}>
                            <Text style={styles.headerTextStyle}>{this.I18n.t('program')}</Text>
                        </View>
                        <View style={{flex: 0.2}}>
                            <Text style={styles.headerTextStyle}>{this.I18n.t('eligibility')}</Text>
                        </View>
                    </View>
                </View>
            </Fragment>
        )
    }

    renderWidget() {
        return (
            <View style={styles.container}>
                <SectionList
                    sections={this.props.subjectProgramEligibilityStatuses}
                    keyExtractor={(item, index) => item.program.uuid + index}
                    renderItem={({item}) => this.renderItem({...item})}
                    renderSectionHeader={({section: {subject, data}}) => this.renderSection(subject, data)}
                    ListHeaderComponent={this.renderHeader()}
                />
            </View>
        )
    }

    render() {
        return _.isEmpty(this.props.subjectProgramEligibilityStatuses) ? null : this.renderWidget();
    }
}


const styles = StyleSheet.create({
    container: {
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        padding: 8,
        flexDirection: 'column',
    },
    itemContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        flex: 1,
        marginBottom: 4,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    programActionsContainer: {
        flex: 0.4,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        marginLeft: 'auto'
    },
    titleTextStyle: {
        fontSize: Styles.titleSize,
        fontStyle: 'normal',
        color: '#151515',
    },
    headerTextStyle: {
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal',
        color: '#151515',
        fontWeight: 'bold'
    },
    contentTextStyle: {
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal',
        color: '#151515',
    }
});

export default SubjectProgramEligibilityWidget;

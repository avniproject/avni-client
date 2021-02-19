import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import React from "react";
import General from "../../utility/General";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import {StyleSheet, Text, View} from "react-native";
import Distances from "../primitives/Distances";
import Observations from "../common/Observations";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import CHSNavigator from "../../utility/CHSNavigator";
import {
    ChecklistItem,
    Encounter,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
    WorkItem,
    WorkList,
    WorkLists,
} from 'avni-models';
import Reducers from "../../reducer";
import {ApprovalActionNames as Actions} from "../../action/approval/ApprovalActions";
import {ApprovalButton} from "./ApprovalButton";
import {ApprovalDialog} from "./ApprovalDialog";

@Path('/approvalDetailsView')
class ApprovalDetailsView extends AbstractComponent {
    static propTypes = {
        entity: PropTypes.object.isRequired,
        schema: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.approval);
    }

    viewName() {
        return 'ApprovalDetailsView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    renderDetails(entity) {
        const onDetailPress = () => CHSNavigator.navigateToIndividualRegistrationDetails(this, entity.individual.uuid, this.goBack.bind(this));
        return (
            <View style={styles.headerContainer}>
                <Text style={styles.headerTextStyle}>{this.I18n.t(entity.getEntityTypeName())}</Text>
                <ApprovalButton
                    name={this.I18n.t('View Details')}
                    textColor={Colors.DarkPrimaryColor}
                    buttonColor={Colors.cardBackgroundColor}
                    onPress={onDetailPress}
                />
            </View>
        )
    }

    renderEditButton(entity, schema) {
        const clonedEntity = entity.cloneForEdit();
        const schemaToActionMap = {
            [Individual.schema.name]: () => this.getNavigateToRegisterView(clonedEntity),
            [ProgramEnrolment.schema.name]: () => this.getNavigateToProgramEnrolmentView(clonedEntity),
            [Encounter.schema.name]: () => this.getNavigateToEncounterView(clonedEntity),
            [ProgramEncounter.schema.name]: () => this.getNavigateToEncounterView(clonedEntity),
            [ChecklistItem.schema.name]: () => CHSNavigator.navigateToChecklistItemView(this, clonedEntity)
        };
        return <ApprovalButton
            name={this.I18n.t('Edit')}
            textColor={Colors.TextOnPrimaryColor}
            buttonColor={Colors.EditColor}
            onPress={schemaToActionMap[schema]}
            extraStyle={{paddingHorizontal: 50}}/>
    }

    getNavigateToEncounterView(clonedEntity) {
        CHSNavigator.navigateToEncounterView(this, {
            encounter: clonedEntity,
            editing: true
        });
    }

    getNavigateToProgramEnrolmentView(clonedEntity) {
        CHSNavigator.navigateToProgramEnrolmentView(this, clonedEntity,
            new WorkLists(new WorkList('Enrolment', [new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENROLMENT,
                {subjectUUID: clonedEntity.individual.uuid, programName: clonedEntity.program.name,})])),
            true);
    }

    getNavigateToRegisterView(clonedEntity) {
        CHSNavigator.navigateToRegisterView(this,
            new WorkLists(new WorkList(`${clonedEntity.subjectType.name} `,
                [new WorkItem(General.randomUUID(),
                    WorkItem.type.REGISTRATION,
                    {uuid: clonedEntity.uuid, subjectTypeName: clonedEntity.subjectType.name})])));
    }

    renderApproveAndRejectButtons(entity) {
        return (<View style={styles.footerContainer}>
            <ApprovalButton
                name={this.I18n.t('Reject')}
                textColor={Colors.TextOnPrimaryColor}
                buttonColor={Colors.NegativeActionButtonColor}
                onPress={() => this.dispatchAction(Actions.ON_REJECT_PRESS, {entity})}
                extraStyle={{paddingHorizontal: 50}}/>
            <ApprovalButton
                name={this.I18n.t('Approve')}
                textColor={Colors.TextOnPrimaryColor}
                buttonColor={Colors.DarkPrimaryColor}
                onPress={() => this.dispatchAction(Actions.ON_APPROVE_PRESS, {entity})}
                extraStyle={{paddingHorizontal: 50}}/>
        </View>)
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const entity = this.props.entity;
        const title = `${entity.individual.nameString} ${entity.getName()} details`;
        const schema = this.props.schema;
        const approvalStatus = entity.latestEntityApprovalStatus.approvalStatus;
        const confirmActionName = this.state.showInputBox ? Actions.ON_REJECT : Actions.ON_APPROVE;
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title} hideIcon={true} />
                    <View style={styles.container}>
                        <View style={{flexDirection: 'column', marginHorizontal: Distances.ContentDistanceFromEdge}}>
                            {this.renderDetails(entity)}
                            <Observations observations={entity.observations}/>
                            {approvalStatus.isPending && this.renderApproveAndRejectButtons(entity)}
                            {approvalStatus.isRejected && this.renderEditButton(entity, schema)}
                        </View>
                    </View>
                    <ApprovalDialog
                        onConfirm={() => this.dispatchAction(confirmActionName, {
                            entity,
                            schema,
                            cb: this.goBack.bind(this)
                        })}
                        onClose={() => this.dispatchAction(Actions.ON_DIALOG_CLOSE)}
                        onInputChange={(value) => this.dispatchAction(Actions.ON_INPUT_CHANGE, {value})}
                        state={this.state}
                        I18n={this.I18n}/>
                </CHSContent>
            </CHSContainer>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        marginTop: 10
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 10,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginVertical: 20,
    },
    headerTextStyle: {
        fontSize: Styles.titleSize,
        fontStyle: 'normal',
        color: Styles.blackColor,
    },
    buttonContainer: {
        elevation: 2,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
    }
});

export default ApprovalDetailsView;

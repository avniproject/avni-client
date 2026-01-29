import PropTypes from 'prop-types';
import {TouchableNativeFeedback, TouchableOpacity, View, Alert, Linking} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import {Actions} from "../../action/individual/IndividualProfileActions";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import DGS from "../primitives/DynamicGlobalStyles";
import Styles from "../primitives/Styles";
import ActionSelector from "./ActionSelector";
import _ from "lodash";
import {ProgramEnrolment, WorkItem, WorkList, WorkLists, SubjectLocation, Point} from "avni-models";
import DeviceLocation from "../../utility/DeviceLocation";
import GroupSubjectService from "../../service/GroupSubjectService";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {MessageIcon} from "./MessageIcon";
import CommentView from "../comment/CommentView";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import SubjectProfilePicture from "./SubjectProfilePicture";
import PhoneCall from "../../model/PhoneCall";
import CustomActivityIndicator from "../CustomActivityIndicator";
import AvniIcon from "../common/AvniIcon";
import GlificScheduledAndSentMsgsView from '../glific/GlificScheduledAndSentMsgsView';

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        viewContext: PropTypes.string,
        programsAvailable: PropTypes.bool,
        hideEnrol: PropTypes.bool,
        textColor: PropTypes.string,
        displayOnly: PropTypes.bool.isRequired
    };

    static viewContext = {
        Wizard: 'Wizard',
        NonWizard: 'NonWizard'
    };

    constructor(props, context) {
        super(props, context, props.displayOnly ? null : Reducers.reducerKeys.individualProfile);
    }

    getMobileNoFromObservation() {
        let i;
        for (i = 0; i < this.props.individual.observations.length; i++) {
            return this.props.individual.getMobileNo();
        }
    }

    renderCallButton() {
        const number = this.getMobileNoFromObservation();
        if (number) {
            return (
                <TouchableOpacity 
                    style={Styles.iconContainer}
                    onPress={() => this.makeCall(number)}
                >
                    <View style={Styles.iconCircle}>
                        <MaterialIcon name="call"
                              style={{color: Styles.accentColor, fontSize: 32}}/>
                    </View>
                    <Text style={Styles.iconLabel}>
                        {this.I18n.t('call')}
                    </Text>
                </TouchableOpacity>
            );
        } else {
            return null;
        }

    }

    renderWhatsappButton(individualUUID) {
        const number = this.getMobileNoFromObservation();
        const {enableMessaging} = this.getService(OrganisationConfigService).getSettings();

        if (number && enableMessaging) {
            return (
                <TouchableOpacity 
                    style={Styles.iconContainer}
                    onPress={() => this.showWhatsappMessages(individualUUID)}
                >
                    <View style={Styles.iconCircle}>
                        <AvniIcon type="MaterialCommunityIcons" name="whatsapp"
                                  style={{fontSize: 36}} color={Styles.accentColor}/>
                    </View>
                    <Text style={Styles.iconLabel}>
                        {this.I18n.t('whatsApp')}
                    </Text>
                </TouchableOpacity>
            );
        } else {
            return null;
        }
    }

    showWhatsappMessages(individualUUID) {
        TypedTransition.from(this).with({individualUUID}).to(GlificScheduledAndSentMsgsView, true);
    }

    makeCall(number) {
        PhoneCall.makeCall(number, this,
            (displayProgressIndicator) => this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator}));
    }

    captureLocation() {
        this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: true});
        
        DeviceLocation.getPosition(
            (position) => {
                this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: false});
                
                try {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    const accuracy = position.coords.accuracy;
                    
                    const pointPosition = Point.newInstance(latitude, longitude);
                    const subjectLocation = SubjectLocation.newInstance(pointPosition, accuracy);
                    
                    this.dispatchAction(Actions.SAVE_SUBJECT_LOCATION, {
                        individual: this.props.individual,
                        subjectLocation: subjectLocation
                    });
                    
                    Alert.alert('Success', this.I18n.t('subjectLocationSaved'));
                } catch (error) {
                    Alert.alert('Error', this.I18n.t('locationSaveError'));
                }
            },
            false,
            (error) => {
                this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: false});
            }
        );
    }


    componentDidMount() {
        if (this.props.displayOnly) return;

        const individual = this.props.individual;
        const programEnrolmentCallback = (program) => {
            const enrolment = ProgramEnrolment.createEmptyInstance({individual, program});
            CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, new WorkLists(new WorkList('Enrol', [
                new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENROLMENT, {
                    programName: program.name,
                    subjectUUID: _.get(individual, 'uuid')
                })
            ])));
        };
        setTimeout(() => this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {individual, programEnrolmentCallback}), 300);
    }


    programProfileHeading() {
        const fullAddress = this.props.individual.fullAddress(this.I18n);
        const individualInfo = this.props.individual.subjectType.isPerson() ?
            `${this.I18n.t(this.props.individual.gender.name)}, ${this.props.individual.getAgeAndDateOfBirthDisplay(this.I18n)}, ${fullAddress}` :
            fullAddress;

        return (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={Styles.programProfileSubheading}>
                    {individualInfo}
                </Text>
            </View>
        );
    }

    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return (<TouchableNativeFeedback onPress={onPress}>
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: DGS.resizeWidth(6),
                alignItems: 'center', justifyContent: 'flex-start', marginLeft: 16, backgroundColor: Styles.greyBackground,
                borderRadius: 5
            }}>
                <AvniIcon name={iconMode} style={{
                    fontSize: DGS.resizeWidth(Styles.programProfileButtonText.fontSize),
                    color: Colors.DarkPrimaryColor,
                    paddingRight: 4
                }} type='MaterialIcons'/>
                <Text style={Styles.programProfileButtonText}>{displayTextMessageKey}</Text>
            </View>
        </TouchableNativeFeedback>);
    }

    groupActions() {
        const groupSubjects = this.getService(GroupSubjectService).getAllGroups(this.props.individual);
        return groupSubjects.map(groupSubject => ({
            fn: () => {
                TypedTransition.from(this).resetStack([GenericDashboardView],
                    [TypedTransition.createRoute(GenericDashboardView, {
                        individualUUID: groupSubject.groupSubject.uuid,
                        tab: 1
                    }, true)])
            },
            label: groupSubject.groupSubject.firstName,
            isHousehold: groupSubject.groupSubject.isHousehold(),
        }))
    }

    onMessagePress() {
        const individualUUID = this.props.individual.uuid;
        const refreshCountActionName = Actions.REFRESH_MESSAGE_COUNTS;
        TypedTransition.from(this).with({individualUUID, refreshCountActionName}).to(CommentView, true);
    }

    renderGroupOptions() {
        const groupActions = this.groupActions();
        if (groupActions.length === 0) {
            return null
        } else {
            return groupActions.length === 1 ? this.renderGroupButton(groupActions[0]) : this.renderMenu(groupActions);
        }

    }

    renderGroupButton(groupAction) {
        const label = groupAction.isHousehold ? 'household' : 'group';
        return <TouchableOpacity onPress={groupAction.fn} style={{
            paddingVertical: 1,
            paddingHorizontal: 10,
            marginEnd: 16,
            alignItems: 'center',
            backgroundColor: Styles.greyBackground,
            borderRadius: 5
        }}>
            <Text style={{color: Styles.accentColor}}>{`${groupAction.label} ${this.I18n.t(label)}`}</Text>
        </TouchableOpacity>
    }

    renderMenu(groupActions) {
        return <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap',}}>
            {groupActions.map((groupAction) => {
                const label = groupAction.isHousehold ? 'household' : 'group';
                return (
                    <TouchableOpacity onPress={groupAction.fn} style={{
                        paddingVertical: 1,
                        paddingHorizontal: 7,
                        marginEnd: 10,
                        alignItems: 'center',
                        backgroundColor: Styles.greyBackground,
                        borderRadius: 5,
                        marginBottom: 5
                    }}>
                        <Text style={{color: Styles.accentColor}}>{`${groupAction.label} ${this.I18n.t(label)}`}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    }

    renderCommentIcon() {
        const {enableComments} = this.getService(OrganisationConfigService).getSettings();
        return enableComments ?
            <TouchableOpacity 
                style={Styles.iconContainer}
                onPress={this.onMessagePress.bind(this)}
            >
                <View style={[Styles.iconCircle]}>
                    <MessageIcon messageCount={this.state.commentsCount} onPress={() => {}}/>
                </View>
                <Text style={Styles.iconLabel}>
                    {this.I18n.t('openComments')}
                </Text>
            </TouchableOpacity> : null;
    }

    renderSubjectLocationIcon() {
        const hasLocation = this.props.individual.subjectLocation != null;

        return (
            <TouchableOpacity 
                style={Styles.iconContainer}
                onPress={hasLocation ? () => this.showLocationOptions() : () => this.captureLocation()}
            >
                <View style={Styles.iconCircle}>
                    <MaterialIcon
                        name={hasLocation ? "location-on" : "add-location-alt"}
                        style={{color: Styles.accentColor, fontSize: 32}}
                    />
                </View>
                <Text style={Styles.iconLabel}>
                    {this.I18n.t("location")}
                </Text>
            </TouchableOpacity>
        )
    }
    
    showLocationOptions() {
        this.dispatchAction(Actions.SHOW_LOCATION_OPTIONS);
    }

    renderProfileSection() {
        const allIcons = [
            this.renderSubjectLocationIcon(),
            this.renderCommentIcon(),
            this.renderCallButton(),
            this.renderWhatsappButton(this.props.individual.uuid)
        ];
        
        const icons = allIcons.filter(icon => icon !== null);

        const renderSubjectProfile = (size, style) => (
            <SubjectProfilePicture
                size={size}
                subjectType={this.props.individual.subjectType}
                style={style}
                round={true}
                allowEnlargementOnClick={true}
                individual={this.props.individual}
            />
        );

        const renderProfileText = (headingStyle) => (
            <>
                <Text style={headingStyle}>
                    {this.props.individual.getTranslatedNameString(this.I18n)} {this.props.individual.id}
                </Text>
                {this.programProfileHeading()}
            </>
        );

        if (icons.length <= 1) {
            return (
                <View style={{flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 10, backgroundColor: Styles.greyBackground}}>
                    <View style={{paddingHorizontal: 20, justifyContent: 'center'}}>
                        {renderSubjectProfile(DGS.resizeWidth(75), {alignSelf: 'center'})}
                    </View>
                    <View style={{flex: 1, paddingHorizontal: 5}}>
                        {renderProfileText(Styles.programProfileHeading)}
                    </View>
                    <View style={{flexDirection: 'column', paddingRight: 15}}>
                        {icons}
                    </View>
                </View>
            );
        } else {
            return (
                <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 5,
                    paddingBottom: 24,
                    paddingHorizontal: 20,
                    backgroundColor: Styles.whiteColor,
                    borderRadius: 16,
                    marginTop: 16,
                    marginRight: 16,
                    marginLeft: 16,
                    marginBottom: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4
                }}>
                    <View style={{justifyContent: 'center'}}>
                        {renderSubjectProfile(DGS.resizeWidth(120), {alignSelf: 'center'})}
                    </View>
                    <View style={{alignItems: 'center', marginBottom: 10}}>
                        {renderProfileText([Styles.programProfileHeading, {marginBottom: 8}])}
                    </View>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-around',
                        width: '100%',
                        backgroundColor: Styles.greyBackground,
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderRadius: 12
                    }}>
                        {icons}
                    </View>
                </View>
            );
        }
    }
    
    navigateToLocation() {
        const subjectLocation = this.props.individual.subjectLocation;
        const lat = subjectLocation.latitude;
        const lng = subjectLocation.longitude;
        const url = `geo:${lat},${lng}?q=${lat},${lng}(${this.props.individual.nameString})`;

        Linking.canOpenURL(url)
            .then(() => {
                    return Linking.openURL(url);
            })
            .catch(err => {
                Alert.alert('Error', `Unable to open map application`);
            });

    }

    renderNameDirectly(programAction) {
        return this.renderProfileActionButton('add', this.I18n.t('enrolIn', {program: this.I18n.t(programAction.label)}), () => programAction.fn())
    }

    renderTitle() {
        return this.renderProfileActionButton('add', this.I18n.t('enrolInProgram'), () => this.launchChooseProgram())
    }

    renderBasedOnProgramActions() {
        return _.size(this.state.programActions) === 1 ? this.renderNameDirectly(_.head(this.state.programActions)) : this.renderTitle();
    }

    render() {
        General.logDebug('IndividualProfile', 'render');
        let isPerson = this.props.individual.subjectType.isPerson();
        let headingSuffixesList = [this.props.individual.fullAddress(this.I18n)]
        if (isPerson) {
            headingSuffixesList.unshift(this.props.individual.userProfileSubtext2(this.I18n)); //localized Age
            headingSuffixesList.unshift(this.props.individual.userProfileSubtext1(this.I18n)); //localized Gender
        }
        let headingSuffix = _.join(headingSuffixesList, ", ")
        return <View style={{backgroundColor: Styles.whiteColor}}>
            {(this.props.viewContext !== IndividualProfile.viewContext.Wizard) ?
                (
                    <>
                        <CustomActivityIndicator loading={this.state.displayProgressIndicator}/>
                        <View>
                            <ActionSelector
                                title={this.I18n.t("enrolInProgram")}
                                hide={() => this.dispatchAction(Actions.HIDE_ACTION_SELECTOR)}
                                visible={this.state.displayActionSelector}
                                actions={this.state.programActions}
                            />
                            <ActionSelector
                                title={this.I18n.t("locationOptions")}
                                hide={() => this.dispatchAction(Actions.HIDE_LOCATION_OPTIONS)}
                                visible={this.state.displayLocationOptions}
                                actions={[
                                    {
                                        fn: () => this.navigateToLocation(),
                                        label: 'navigate',
                                        backgroundColor: Styles.accentColor,
                                        icon: 'map'
                                    },
                                    {
                                        fn: () => this.captureLocation(),
                                        label: 'editLocation',
                                        backgroundColor: Styles.accentColor,
                                        icon: 'edit-location'
                                    }
                                ]}
                            />
                            {this.renderProfileSection()}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    paddingVertical: 8,
                                    alignItems: 'center',
                                    backgroundColor: Styles.whiteColor
                                }}>
                                {(!this.props.hideEnrol && !_.isEmpty(this.state.eligiblePrograms)) ? this.renderBasedOnProgramActions() :
                                    <View/>}
                                {this.renderGroupOptions()}
                            </View>
                        </View></>
                ) :
                (
                    <View style={this.appendedStyle({
                        flexDirection: 'column',
                        backgroundColor: Styles.greyBackground,
                        paddingHorizontal: Distances.ContentDistanceFromEdge,
                        paddingVertical: Distances.ContentDistanceFromEdge
                    })}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Text style={[Fonts.LargeBold, {color: Styles.blackColor}]}>{this.props.individual.nameString}</Text>
                        </View>
                        <Text style={Styles.subjectProfileSubheading}>{headingSuffix}</Text>
                    </View>
                )}
        </View>;
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_ACTION_SELECTOR);
    }
}

export default IndividualProfile;

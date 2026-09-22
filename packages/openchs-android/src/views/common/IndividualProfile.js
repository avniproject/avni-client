import PropTypes from 'prop-types';
import {TouchableNativeFeedback, TouchableOpacity, View, Linking} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import {Actions} from "../../action/individual/IndividualProfileActions";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
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
import CustomConfirmDialog from "./CustomConfirmDialog";

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
                              style={{color: Styles.accentColor, fontSize: 36}}/>
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

    captureLocation = _.debounce(() => {
        this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: true});
        
        setTimeout(() => {
            DeviceLocation.getPosition(
                (position) => {
                    this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: false});
                    
                    try {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        const accuracy = position.coords.accuracy;
                        
                        const pointPosition = Point.newInstance(longitude, latitude);
                        const subjectLocation = SubjectLocation.newInstance(pointPosition, accuracy);
                        
                        this.dispatchAction(Actions.SAVE_SUBJECT_LOCATION, {
                            individual: this.props.individual,
                            subjectLocation: subjectLocation
                        });
                        
                        CustomConfirmDialog.showAlert({title: 'Success', message: this.I18n.t('subjectLocationSaved')});
                    } catch (error) {
                        CustomConfirmDialog.showAlert({title: 'Error', message: this.I18n.t('locationSaveError')});
                    }
                },
                false,
                () => {
                    this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator: false});
                },
                this.context
            );
        }, 50);
    }, 1000, {leading: true, trailing: false});


    onViewDidMount() {
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


    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return (<TouchableNativeFeedback onPress={onPress}>
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: DGS.resizeWidth(6),
                alignItems: 'center', justifyContent: 'flex-start', marginLeft: 16, backgroundColor: Styles.greyBackground,
                borderRadius: 8
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
            borderRadius: 8
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
                        borderRadius: 8,
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
                    {this.I18n.t('comments')}
                </Text>
            </TouchableOpacity> : null;
    }

    showLocationOptions() {
        this.dispatchAction(Actions.SHOW_LOCATION_OPTIONS);
    }

    // Matches the avatar + name + gender/age header pattern already used on the encounter
    // screens (see EncounterSubjectHeader) - full address moved out into its own Location row
    // below instead of being crammed into this subtitle line.
    renderProfileHeader() {
        const isPerson = this.props.individual.subjectType.isPerson();
        return (
            <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 16, paddingBottom: 12}}>
                <SubjectProfilePicture
                    size={56}
                    subjectType={this.props.individual.subjectType}
                    round={true}
                    allowEnlargementOnClick={true}
                    individual={this.props.individual}
                    containerStyle={{marginRight: 16}}
                />
                <View style={{flex: 1}}>
                    <Text style={{fontSize: Styles.titleSize, fontWeight: 'bold', color: Colors.TextPrimaryDark}}
                          numberOfLines={1} ellipsizeMode='tail'>
                        {this.props.individual.getTranslatedNameString(this.I18n)} {this.props.individual.id}
                    </Text>
                    {isPerson &&
                    <Text style={{fontSize: Styles.normalTextSize, color: Colors.TextPrimaryDark, marginTop: 2}}>
                        {this.props.individual.userProfileSubtext1(this.I18n)} • {this.props.individual.userProfileSubtext2(this.I18n)}
                    </Text>}
                </View>
            </View>
        );
    }

    renderOtherIcons() {
        const icons = [
            this.renderCommentIcon(),
            this.renderCallButton(),
            this.renderWhatsappButton(this.props.individual.uuid)
        ].filter(icon => icon !== null);
        if (icons.length === 0) return null;
        return (
            <View style={{flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 15, paddingBottom: 8}}>
                {icons}
            </View>
        );
    }

    // Same GPS subjectLocation capture/view dialog that used to be launched from the small
    // corner "Location" icon - only the entry point moved to this full-width Figma-style chip.
    renderLocationChip() {
        const hasLocation = this.props.individual.subjectLocation != null;
        const addressText = this.props.individual.fullAddress(this.I18n);
        return (
            <TouchableOpacity
                onPress={hasLocation ? () => this.showLocationOptions() : () => this.captureLocation()}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: Colors.BrandLight,
                    borderRadius: 8,
                    marginHorizontal: 15,
                    marginBottom: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10
                }}>
                <MaterialIcon
                    name={hasLocation ? 'location-on' : 'add-location-alt'}
                    style={{fontSize: 22, color: Colors.BrandPrimaryDark, marginRight: 10}}
                />
                <View style={{flex: 1}}>
                    <Text style={{fontSize: Styles.smallerTextSize, color: Colors.TextPrimaryDark, opacity: 0.7}}>
                        {this.I18n.t('location')}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode='tail'
                          style={{fontSize: Styles.smallTextSize, color: Colors.BrandPrimary, opacity: 0.7, marginTop: 2}}>
                        {addressText}
                    </Text>
                </View>
                <Text style={{fontSize: Styles.smallTextSize, color: Colors.BrandPrimaryDark, fontWeight: '500', marginLeft: 8}}>
                    {this.I18n.t(hasLocation ? 'changeLocation' : 'addLocation')}
                </Text>
            </TouchableOpacity>
        );
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
                CustomConfirmDialog.showAlert({title: 'Error', message: `Unable to open map application`});
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
        return <View style={{backgroundColor: Colors.GreyContentBackground}}>
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
                                title={""}
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
                            {this.renderProfileHeader()}
                            {this.renderOtherIcons()}
                            {this.renderLocationChip()}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    paddingVertical: 8,
                                    alignItems: 'center',
                                    backgroundColor: Colors.GreyContentBackground
                                }}>
                                {(!this.props.hideEnrol && !_.isEmpty(this.state.eligiblePrograms)) ? this.renderBasedOnProgramActions() :
                                    <View/>}
                                {this.renderGroupOptions()}
                            </View>
                        </View></>
                ) :
                (
                    <View style={[
                        this.appendedStyle({
                            flexDirection: 'column',
                            backgroundColor: Styles.greyBackground,
                            paddingVertical: Distances.ContentDistanceFromEdge
                        }),
                        // Applied last, outside appendedStyle's merge/scale step - a caller-supplied
                        // style prop (e.g. SystemRecommendationView's profile()) would otherwise
                        // override this, and appendedStyle's scaleStyle() would re-scale it by
                        // device width, undoing the fixed, device-independent value we want here.
                        {paddingHorizontal: Distances.ScaledContentDistanceFromEdge}
                    ]}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <SubjectProfilePicture size={56}
                                                   subjectType={this.props.individual.subjectType}
                                                   round={true}
                                                   individual={this.props.individual}
                                                   containerStyle={{marginRight: 24}}/>
                            <View style={{flex: 1}}>
                                <Text style={{fontSize: Styles.normalTextSize, fontWeight: '500', color: Colors.TextPrimaryDark}}>{this.props.individual.nameString}</Text>
                                {isPerson &&
                                    <Text style={{fontSize: Styles.smallTextSize, color: Colors.TextPrimaryDark, marginTop: 2}}>
                                        {this.props.individual.userProfileSubtext1(this.I18n)} • {this.props.individual.userProfileSubtext2(this.I18n)}
                                    </Text>}
                            </View>
                        </View>
                        <View style={{
                            backgroundColor: Styles.whiteColor,
                            borderRadius: 4,
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            marginTop: 12
                        }}>
                            <Text style={{fontSize: Styles.smallerTextSize, color: Colors.TextPrimaryDark, opacity: 0.7}}>{this.I18n.t('location')}</Text>
                            <Text numberOfLines={1} ellipsizeMode={'tail'}
                                  style={{fontSize: Styles.smallTextSize, color: Colors.BrandPrimary, opacity: 0.7, marginTop: 2}}>
                                {this.props.individual.fullAddress(this.I18n)}
                            </Text>
                        </View>
                    </View>
                )}
        </View>;
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_ACTION_SELECTOR);
    }
}

export default IndividualProfile;

import {View, StyleSheet, TouchableNativeFeedback} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";
import Styles from "../primitives/Styles";
import _ from "lodash";
import Colors from "../primitives/Colors";

class ProgramList extends AbstractComponent {
    static propTypes = {
        enrolments: PropTypes.array.isRequired,
        selectedEnrolment: PropTypes.object.isRequired,
        onProgramSelect: PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    static style = {
        // Matches ProgramActionsView's primaryButtonView (minHeight/borderRadius/centering) -
        // this chip sits right next to that view's "New Program Visit" button, so the two need
        // to look like the same kind of control rather than two different button styles.
        programButton: {
            self: {
                minHeight: 36,
                // A fixed minWidth (not '100%' - this row can hold several program chips side by
                // side, and 100% would force each onto its own line) so a short label like "NCD"
                // doesn't shrink-wrap to a much narrower chip than the button next to it.
                minWidth: 110,
                marginRight: DGS.resizeWidth(8),
                borderRadius: 8,
                marginTop: DGS.resizeHeight(8),
                paddingHorizontal: DGS.resizeWidth(8),
                paddingVertical: 4,
                alignItems: 'center',
                justifyContent: 'center'
            }
        },
        // Was per-program, server-configured (program.colour) - now a fixed brand teal, matching
        // the same badge elsewhere in the app (see SubjectInfoCard.js's enrolled-program chip).
        selectedProgramButton: {
            self: {
                backgroundColor: Colors.BrandPrimaryDark,
            },
            text: {
                color: '#ffffff',
                fontSize: 14
            }
        },
        unselectedProgramButton: {
            self: {
                borderWidth: 1,
                borderColor: Colors.BrandPrimaryDark,
                backgroundColor: Styles.whiteColor
            },
            text: {
                color: Colors.BrandPrimaryDark,
                fontSize: 14
            }
        }
    };

    getButtonStyle(enrolment) {
        return enrolment.uuid === this.props.selectedEnrolment.uuid ? ProgramList.style.selectedProgramButton : ProgramList.style.unselectedProgramButton;
    }

    render() {
        const sortedEnrolments = _.sortBy(this.props.enrolments, (enrolment) => enrolment.enrolmentDateTime);
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                    {sortedEnrolments.length === 0 ?
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{this.I18n.t('notEnrolledInAnyProgram')}</Text>
                        </View>
                         :
                        sortedEnrolments.map((enrolment) => {
                            const buttonStyle = this.getButtonStyle(enrolment);
                            return (
                                <TouchableNativeFeedback key={enrolment.uuid} onPress={() => this.props.onProgramSelect(enrolment)}>
                                    <View style={[ProgramList.style.programButton.self, buttonStyle.self]}>
                                        <Text style={[buttonStyle.text, {textAlign: 'center'}]} numberOfLines={1} ellipsizeMode='tail'>
                                            {this.I18n.t(enrolment.program.displayName)}
                                        </Text>
                                    </View>
                                </TouchableNativeFeedback>
                            );
                        })}
                </View>
            </View>
        );
    }
}

export default ProgramList;

const styles = StyleSheet.create({
    // This column is only as wide as half the row (shares space with ProgramActionsView next to
    // it), so the message wraps - a bounded, softly-coloured box makes that wrap read as an
    // intentional empty-state chip instead of bare text trailing off awkwardly.
    emptyContainer: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.BrandLight,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: DGS.resizeHeight(8),
    },
    emptyText: {
        color: Colors.BrandPrimaryDark,
        fontSize: Styles.smallTextSize,
    }
});

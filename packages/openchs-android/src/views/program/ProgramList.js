import {View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";
import Styles from "../primitives/Styles";
import _ from "lodash";
import Distances from "../primitives/Distances";
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
        programButton: {
            self: {
                height: 40,
                marginRight: DGS.resizeWidth(8),
                borderRadius: 2,
                marginTop: DGS.resizeHeight(8),
                paddingHorizontal: DGS.resizeWidth(4),
                width: '90%'
            }
        },
        selectedProgramButton: (colour) => { return {
            self: {
                backgroundColor: colour,
            },
            text: {
                color: '#ffffff',
                fontSize: 14
            }
        }},
        unselectedProgramButton: (colour) => { return {
            self: {
                borderWidth: 1,
                borderColor: colour,
                backgroundColor: Styles.whiteColor
            },
            text: {
                color: colour,
                fontSize: 14
            }
        }}
    };

    getButtonStyle(enrolment) {
        return enrolment.uuid === this.props.selectedEnrolment.uuid ? ProgramList.style.selectedProgramButton(enrolment.program.colour) : ProgramList.style.unselectedProgramButton(enrolment.program.colour);
    }

    render() {
        const sortedEnrolments = _.sortBy(this.props.enrolments, (enrolment) => enrolment.enrolmentDateTime);
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                    {sortedEnrolments.length === 0 ?
                        <View style={styles.container}>
                            <Text>{this.I18n.t('notEnrolledInAnyProgram')}</Text>
                        </View>
                         :
                        sortedEnrolments.map((enrolment) => {
                            const buttonStyle = this.getButtonStyle(enrolment);
                            return <Button key={enrolment.uuid}
                                           style={[ProgramList.style.programButton.self, buttonStyle.self]}
                                           onPress={() => this.props.onProgramSelect(enrolment)}><Text style={buttonStyle.text} numberOfLines={1} ellipsizeMode='tail'>{this.I18n.t(enrolment.program.displayName)}</Text></Button>
                        })}
                </View>
            </View>
        );
    }
}

export default ProgramList;

const styles = StyleSheet.create({
    container: {
        padding: Distances.ScaledContentDistanceFromEdge,
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
    }
});

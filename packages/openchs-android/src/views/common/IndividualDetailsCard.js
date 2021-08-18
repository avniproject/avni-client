import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import {Text, View, TouchableNativeFeedback} from "react-native";
import {Icon} from "native-base";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";

class IndividualDetailsCard extends AbstractComponent {

    static propTypes = {
        individual: PropTypes.object.isRequired,
        renderDraftString: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
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

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    render() {
        const i18n = this.I18n;
        return (
            <View>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    alignSelf: 'center',
                    minHeight: this.props.minHeight || 86,
                    paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge
                }}>
                    <Icon {...this.props.individual.icon()} style={{
                        color: Colors.AccentColor,
                        fontSize: this.props.iconSize || 56,
                        paddingRight: 16
                    }}/>
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
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            alignItems: 'flex-start'
                        }}>
                            <Text
                                style={Styles.userProfileSubtext}>{this.props.individual.userProfileSubtext1(i18n)}</Text>
                            <Text
                                style={Styles.userProfileSubtext}>{this.props.individual.userProfileSubtext2(i18n)}</Text>
                        </View>
                    </View>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        flex: 1
                    }}>
                        <View style={{justifyContent: 'flex-end'}}>
                            <Text
                                style={Styles.textStyle}>{this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text>
                        </View>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                        }}>
                            {_.filter(this.props.individual.nonVoidedEnrolments(), (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

export default IndividualDetailsCard

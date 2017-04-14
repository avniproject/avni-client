import {Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";

class ProgramList extends AbstractComponent {
    static propTypes = {
        enrolments: React.PropTypes.array.isRequired,
        selectedEnrolment: React.PropTypes.object.isRequired,
        onProgramSelect: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    static style = {
        programButton: {
            self: {
                height: 28,
                marginRight: DGS.resizeWidth(8),
                borderRadius: 2,
                marginTop: DGS.resizeHeight(8)
            }
        },
        selectedProgramButton: {
            self: {
                backgroundColor: '#f5a523',
            },
            text: {
                color: '#ffffff',
                fontSize: 14
            }
        },
        unselectedProgramButton: {
            self: {
                borderWidth: 1,
                borderColor: '#4990e2',
                backgroundColor: 'white'
            },
            text: {
                color: '#4a90e2',
                fontSize: 14
            }
        }
    };

    getButtonStyle(enrolment) {
        return enrolment.uuid === this.props.selectedEnrolment.uuid ? ProgramList.style.selectedProgramButton : ProgramList.style.unselectedProgramButton;
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                    {this.props.enrolments.length === 0 ? <Text>{this.I18n.t('notEnrolledInAnyProgram')}</Text> :
                        this.props.enrolments.map((enrolment) => {
                            const buttonStyle = this.getButtonStyle(enrolment);
                            return <Button key={enrolment.uuid}
                                           style={[ProgramList.style.programButton.self, buttonStyle.self]}
                                           textStyle={buttonStyle.text}
                                           onPress={() => this.props.onProgramSelect(enrolment.program)}>{this.I18n.t(enrolment.program.name)}</Button>
                        })}
                </View>
            </View>
        );
    }
}

export default ProgramList;
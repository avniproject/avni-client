import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';

class ProgramList extends AbstractComponent {
    static propTypes = {
        enrolments: React.PropTypes.object.isRequired,
        selectedProgram: React.PropTypes.object.isRequired,
        onProgramSelect: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    static style = {
        programButton: {
            self: {
                height: DGS.resizeHeight(28),
                marginRight: DGS.resizeWidth(8),
                borderRadius: 2
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

    getButtonStyle(program) {
        return program.uuid === this.props.selectedProgram.uuid ? ProgramList.style.selectedProgramButton : ProgramList.style.unselectedProgramButton;
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <Text style={{fontSize: 16, color: Colors.InputNormal}}>{this.I18n.t('programList')}</Text>
                <View style={{flexDirection: 'row', marginTop: DGS.resizeHeight(9)}}>
                    {this.props.enrolments.map((enrolment) => {
                        const buttonStyle = this.getButtonStyle(enrolment.program);
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
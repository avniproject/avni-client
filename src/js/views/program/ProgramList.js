import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';

class ProgramList extends AbstractComponent {
    static propTypes = {
        programs: React.PropTypes.array.isRequired,
        selectedProgram: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    static style = {
        programButton: {
            self: {
                height: DGS.resizeHeight(28),
                marginRight: DGS.resizeWidth(8)
            }
        },
        selectedProgramButton:  {
            self: {
                backgroundColor: '#f5a523',
            },
            text: {
                color: '#ffffff',
            }
        },
        unselectedProgramButton: {
            self: {
                borderColor: '#4990e2',
            },
            text: {
                color: '#4a90e2',
            }
        }
    };

    getButtonStyle(program) {
        return program.uuid === this.props.selectedProgram.uuid ? ProgramList.style.selectedProgramButton : ProgramList.style.programButton;
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <Text style={{fontSize: 16, color: Colors.InputNormal}}>{this.I18n.t('programList')}</Text>
                <View style={{flexDirection: 'row', marginTop: DGS.resizeHeight(9)}}>
                    {this.props.programs.map((program) => {
                        const buttonStyle = this.getButtonStyle(program);
                        return <Button key={program.name} style={[ProgramList.style.programButton.self, buttonStyle.self]}
                                       textStyle={buttonStyle.text}>{this.I18n.t(program.name)}</Button>
                })}
                </View>
            </View>
        );
    }
}

export default ProgramList;
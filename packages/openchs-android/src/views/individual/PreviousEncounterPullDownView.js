import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import IndividualProfile from "../common/IndividualProfile";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";
import {Button, Icon, Text} from "native-base";
import PreviousEncounters from "../common/PreviousEncounters";
import Separator from "../primitives/Separator";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import Styles from "../primitives/Styles";
import General from "../../utility/General";
import {Form} from 'avni-models';
import AvniIcon from "../common/AvniIcon";

class PreviousEncounterPullDownView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        encounters: PropTypes.any,
        showExpanded: PropTypes.bool.isRequired,
        actionName: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.toggleExpandCollapse = this.toggleExpandCollapse.bind(this);
    }

    viewName() {
        return 'PreviousEncounterPullDownView';
    }

    toggleExpandCollapse() {
        this.dispatchAction(this.props.actionName);
    };

    getCollapsedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                                   individual={this.props.individual}
                                   textColor={Colors.TextOnPrimaryColor}
                                   style={{
                                       backgroundColor: Colors.GreyContentBackground,
                                       paddingHorizontal: Distances.ContentDistanceFromEdge
                                   }}/>
                <Text style={{height: 11, backgroundColor: Colors.GreyContentBackground}}
                      onPress={this.toggleExpandCollapse}/>
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginRight: 10}}>
                    <Button secondary
                            rightIcon={<AvniIcon color={'#212121'} name='arrow-downward' type='MaterialIcons'/>}
                            style={{
                                position: 'absolute',
                                width: 81,
                                height: 50,
                                backgroundColor: Colors.SecondaryActionButtonColor,
                                bottom: -20,
                            }}
                            _text={{fontSize: Fonts.Normal, color: Styles.greyText}}
                            onPress={this.toggleExpandCollapse}>Expand</Button>
                </View>
                <Text style={{backgroundColor: 'transparent', height: 11}} onPress={this.toggleExpandCollapse}/>
            </View>
        );
    }

    getExpandedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{
                    backgroundColor: Colors.GreyContentBackground,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                }}>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                                       individual={this.props.individual} textColor={Colors.TextOnPrimaryColor}/>
                    <Separator style={{marginTop: DynamicGlobalStyles.resizeHeight(16)}}/>
                </View>
                <PreviousEncounters encounters={this.props.encounters}
                                    formType={Form.formTypes.Encounter}
                                    style={{
                                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                                        backgroundColor: Colors.GreyContentBackground,
                                        paddingBottom: DynamicGlobalStyles.resizeHeight(25)
                                    }} onShowMore={() => {
                }} showPartial={false}/>

                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <View style={{width: 90}}>
                        <Button rightIcon={<AvniIcon style={{color: '#212121'}} name='arrow-upward'/>}
                                style={{
                                    position: 'absolute',
                                    height: 22,
                                    backgroundColor: Colors.SecondaryActionButtonColor,
                                    bottom: -11
                                }}
                                onPress={this.toggleExpandCollapse}
                                textStyle={{color: '#212121'}}>
                            <Text style={{fontSize: Fonts.Normal}} onPress={this.toggleExpandCollapse}>Collapse</Text>
                        </Button>
                    </View>
                </View>
                <Text style={{backgroundColor: 'transparent', height: 11}} onPress={this.toggleExpandCollapse}/>
            </View>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return this.props.showExpanded ? this.getExpandedView() : this.getCollapsedView();
    }
}

export default PreviousEncounterPullDownView;

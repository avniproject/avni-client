import {View} from "react-native";
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

class PreviousEncounterPullDownView extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        encounters: React.PropTypes.any,
        showExpanded: React.PropTypes.bool.isRequired,
        actionName: React.PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return this.props.showExpanded ? this.getExpandedView() : this.getCollapsedView();
    }

    getCollapsedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.props.individual}
                                   style={{
                                       backgroundColor: Colors.GreyContentBackground,
                                       paddingHorizontal: Distances.ContentDistanceFromEdge
                                   }}/>
                <Text style={{height: 11, backgroundColor: Colors.GreyContentBackground}} onPress={this.toggleExpandCollapse}/>
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <View style={{width: 81}}>
                        <Button iconRight
                                style={{position: 'absolute', height: 22, backgroundColor: Colors.SecondaryActionButtonColor, bottom: -11}}
                                onPress={this.toggleExpandCollapse}
                                textStyle={{color: '#212121'}}>
                            <Text style={{fontSize: Fonts.Normal, color: Styles.greyText}} onPress={this.toggleExpandCollapse}>Expand</Text>
                            <Icon style={{color: '#212121', color: Styles.greyText}} name='arrow-downward'/>
                        </Button>
                    </View>
                </View>
                <Text style={{backgroundColor: 'transparent', height: 11}} onPress={this.toggleExpandCollapse}/>
            </View>
        );
    }

    getExpandedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: Colors.GreyContentBackground, paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.props.individual}/>
                    <Separator style={{marginTop: DynamicGlobalStyles.resizeHeight(16)}}/>
                </View>
                <PreviousEncounters encounters={this.props.encounters}
                                    style={{
                                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                                        backgroundColor: Colors.GreyContentBackground,
                                        paddingBottom: DynamicGlobalStyles.resizeHeight(25)
                                    }}/>
                <Text style={{height: 11, backgroundColor: Colors.GreyContentBackground}} onPress={this.toggleExpandCollapse}/>
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <View style={{width: 90}}>
                        <Button iconRight light
                                style={{position: 'absolute', height: 22, backgroundColor: Colors.SecondaryActionButtonColor, bottom: -11}}
                                onPress={this.toggleExpandCollapse}
                                textStyle={{color: '#212121'}}>
                            <Text style={{fontSize: Fonts.Normal}} onPress={this.toggleExpandCollapse}>Collapse</Text>
                            <Icon style={{color: '#212121'}} name='arrow-upward'/>
                        </Button>
                    </View>
                </View>
                <Text style={{backgroundColor: 'transparent', height: 11}} onPress={this.toggleExpandCollapse}/>
            </View>
        );
    }

    toggleExpandCollapse = () => {
        this.dispatchAction(this.props.actionName);
    };
}

export default PreviousEncounterPullDownView;
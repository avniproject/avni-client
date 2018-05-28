import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import {Actions} from "../../action/individual/IndividualProfileActions";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import General from "../../utility/General";

class FamilyProfile extends AbstractComponent {
    static propTypes = {
        family: React.PropTypes.object.isRequired,
        viewContext: React.PropTypes.string.isRequired,
        style: React.PropTypes.object
    };

    static viewContext = {
        Program: 'Program',
        General: 'General',
        Wizard: 'Wizard',
        Individual: 'Individual'
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyProfile);
    }

    componentWillMount() {
        return super.componentWillMount();
    }

    componentDidMount() {
        // setTimeout(() => this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {value: this.props.individual}), 300);
    }

    render() {
        General.logDebug('FamilyProfile', 'render');
        return (
                <View style={this.appendedStyle({
                    flexDirection: 'column', backgroundColor: Colors.defaultBackground,
                    paddingHorizontal: Distances.ContentDistanceFromEdge
                })}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={Fonts.LargeBold}>{this.props.family.headOfFamily.nameString}</Text>
                        <Text
                            style={Fonts.LargeRegular}>{this.I18n.t(this.props.family.lowestAddressLevel.name)}</Text>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={{fontSize: Fonts.Normal}}>
                            {this.I18n.t(this.props.family.typeOfFamily)}, {this.props.family.householdNumber}</Text>
                    </View>
                </View>
            );
    }

}

export default FamilyProfile;
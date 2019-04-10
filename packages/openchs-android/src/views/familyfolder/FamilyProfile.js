import {View} from "react-native";
import PropTypes from 'prop-types';
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
        family: PropTypes.object.isRequired,
        viewContext: PropTypes.string.isRequired,
        style: PropTypes.object
    };

    static viewContext = {
        Program: 'Program',
        General: 'General',
        Wizard: 'Wizard',
        Family: 'Family'
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyProfile);
    }

    render() {
        General.logDebug('FamilyProfile', 'render');
        return (
                <View style={this.appendedStyle({
                    flexDirection: 'column', backgroundColor: Colors.GreyContentBackground,
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
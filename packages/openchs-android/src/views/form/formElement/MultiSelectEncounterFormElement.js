import React from 'react';
import PropTypes from "prop-types";
import _ from "lodash";
import Distances from "../../primitives/Distances";
import {View} from "react-native";
import EncounterSelectFormElement from "./EncounterSelectFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import UserInfoService from "../../../service/UserInfoService";

class MultiSelectEncounterFormElement extends EncounterSelectFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        subjectUUID: PropTypes.string,
    };

    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const encounterUUIDs = _.get(this.props.value, 'answer');
        const valueLabelPairs = this.getValueLabelPairs();
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                <SelectableItemGroup
                    multiSelect={true}
                    inPairs={true}
                    locale={currentLocale}
                    I18n={this.I18n}
                    onPress={(value) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={(encounterUUID) => _.isEmpty(encounterUUIDs) ? false : _.includes(encounterUUIDs, encounterUUID)}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                    skipLabel={true}
                />
            </View>
        )
    }


}

export default MultiSelectEncounterFormElement;

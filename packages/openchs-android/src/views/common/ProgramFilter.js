import PropTypes from 'prop-types';
import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import General from "../../utility/General";
import {RadioLabelValue} from "../primitives/RadioGroup";

import Styles from "../primitives/Styles";
import RadioGroup from "../primitives/RadioGroup";
import FormMappingService from "../../service/FormMappingService";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";

class ProgramFilter extends AbstractComponent {
    static propTypes = {
        multiSelect: PropTypes.bool,
        onToggle: PropTypes.func,
    };

    viewName() {
        return 'ProgramFilter';
    }

    constructor(props, context) {
        super(props, context);
        this.formMappingService = context.getService(FormMappingService);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const valueLabelPairs = this.props.visits.map(({
                                                           uuid,
                                                           operationalProgramName,
                                                           operationalEncounterTypeName,
                                                           name
                                                       }) => new RadioLabelValue(operationalProgramName || operationalEncounterTypeName || name, uuid, false));
        return (
            <SelectableItemGroup
                multiSelect={this.props.multiSelect}
                style={{
                    marginTop: Styles.VerticalSpacingBetweenInGroupFormElements,
                    marginBottom: Styles.VerticalSpacingBetweenInGroupFormElements
                }}
                borderStyle={{borderWidth: 0}}
                inPairs={true}
                onPress={(value, label) => this.props.onToggle(label, value)}
                selectionFn={(value) => this.props.selectionFn(value)}
                labelKey={this.props.name}
                mandatory={false}
                locale={locale}
                I18n={this.I18n}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default ProgramFilter

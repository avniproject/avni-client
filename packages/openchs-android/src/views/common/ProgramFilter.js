import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import General from "../../utility/General";
import {RadioLabelValue} from "../primitives/RadioGroup";

import Styles from "../primitives/Styles";
import RadioGroup from "../primitives/RadioGroup";
import FormMappingService from "../../service/FormMappingService";

class ProgramFilter extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        onToggle: React.PropTypes.func,
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
        const valueLabelPairs = this.props.visits.map(({uuid, name}) => new RadioLabelValue(name, uuid, false));
        return (
            <RadioGroup
                multiSelect={this.props.multiSelect}
                style={{
                    marginTop: Styles.VerticalSpacingBetweenInGroupFormElements,
                    marginBottom: Styles.VerticalSpacingBetweenInGroupFormElements
                }}
                borderStyle={{borderWidth: 0}}
                inPairs={true}
                onPress={({label, value}) => this.props.onToggle(label, value)}
                selectionFn={(value) => this.props.selectionFn(value)}
                labelKey={this.props.name}
                mandatory={false}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default ProgramFilter

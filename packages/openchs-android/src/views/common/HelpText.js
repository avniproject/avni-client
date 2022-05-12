import React, {useState, useCallback, Fragment} from 'react';
import _ from 'lodash';
import Styles from "../primitives/Styles";
import {Text} from "native-base";
import Colors from "../primitives/Colors";

export const HelpText = ({text, t}) => {

    const [textShown, setTextShown] = useState(false);
    const [lengthMore, setLengthMore] = useState(false);

    const toggleNumberOfLines = () => setTextShown(!textShown);
    const onTextLayout = useCallback(e => {
        setLengthMore(e.nativeEvent.lines.length >= 2);
    }, []);

    const renderText = () => (
        <Fragment>
            <Text
                onTextLayout={onTextLayout}
                numberOfLines={textShown ? undefined : 2}
                style={Styles.helpText}>
                {t(text)}
            </Text>
            {lengthMore ?
                <Text
                    onPress={toggleNumberOfLines}
                    style={[Styles.helpText, {color: Colors.Complimentary}]}>{textShown ? t('readLess') : t('readMore')}</Text>
                : null
            }
        </Fragment>
    );

    return _.isEmpty(text) ? null : renderText()
};

import React from "react";
import IconFactory from "./IconFactory";

export default function ({type, name, color}) {
    const IconType = IconFactory.getIcon(type);
    return <IconType name={name} color={color}/>;
}

//initial code from : https://javascript.plainenglish.io/create-your-own-implementation-of-json-stringify-simiplied-version-8ab6746cdd1
import _ from 'lodash';
import {BaseEntity} from 'openchs-models';

const isArray = function (value) {
    return Array.isArray(value) && typeof value === 'object';
};

const isObject = function (value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isString = function (value) {
    return typeof value === 'string';
};

const isBoolean = function (value) {
    return typeof value === 'boolean';
};

const isNumber = function (value) {
    return typeof value === 'number';
};

// Common check for number, string and boolean value
const restOfDataTypes = function (value) {
    return isNumber(value) || isString(value) || isBoolean(value);
};

// This function will be used to remove extra comma from the arrays and object
const removeComma = function (str) {
    const tempArr = str.split('');
    tempArr.pop();
    return tempArr.join('');
};

const duckCheckNativeRealmCollection = function (obj) {
    return (typeof obj === "object"
        && !_.isNil(_.get(obj, "removeAllListeners"))
        && !_.isNil(_.get(obj, "snapshot")));
}

const JSONStringifyInternal = function (obj, depth, objectMap: Map, arrayWidth, objectKey) {
    if (depth === 0)
        return undefined;
    // Boolean and Number behave in a same way and String we need to add extra quotes
    if (restOfDataTypes(obj)) {
        const passQuotes = isString(obj) ? `"` : '';
        return `${passQuotes}${obj}${passQuotes}`;
    }

    // Recursive function call for Arrays to handle nested arrays
    if (isArray(obj)) {
        let arrStr = '';
        obj.forEach((eachValue, index) => {
            if (index === arrayWidth) arrStr += "....";
            if (index >= arrayWidth) return;
            arrStr += JSONStringifyInternal(eachValue, depth - 1, objectMap, arrayWidth);
            arrStr += ','
        });

        return `[` + removeComma(arrStr) + `]`;
    }

    if (duckCheckNativeRealmCollection(obj, objectKey)) {
        return "<realm-collection>";
    }

    // Recursive function call for Object to handle nested Object
    if (isObject(obj) && _.isNil(objectMap.get(obj))) {
        objectMap.set(obj, true);
        let objStr = '';
        const objKeys = Object.keys(obj);
        objKeys.forEach((eachKey) => {
            const eachValue = obj[eachKey];
            objStr += `"${eachKey}":${JSONStringifyInternal(eachValue, depth - 1, objectMap, arrayWidth, eachKey)},`;
        });
        return `{` + removeComma(objStr) + `}`;
    } else if (!_.isNil(objectMap.get(obj))) {
        return "<object_repeated>";
    }
};

// This class is not meant for production purposes, it is to be used for developer assistance like logging.
// It supports recursive object structure, native realm collection, restricting array width (number of elements that can be stringified), and object tree depth
export const JSONStringify = function (obj, objectTreeDepth = 3, arrayWidth = 4) {
    const objectMap = new Map();
    return JSONStringifyInternal(obj, objectTreeDepth, objectMap, arrayWidth);
}

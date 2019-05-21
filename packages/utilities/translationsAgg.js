const input = process.argv[2];
const csv = require('csvtojson');

csv()
    .fromFile(input)
    .then((jsonObj) => {
        const all = {};
        jsonObj.forEach((lineItem) => {
            all[lineItem[0].key] = lineItem.Marathi;
        });
        return all;
    })
    .then((aggJson) => {
        console.log(JSON.stringify(aggJson, null, 2));
    });

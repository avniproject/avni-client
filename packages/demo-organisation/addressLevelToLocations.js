const catchments = require('./catchments.json');
const locations = [];

catchments.catchments.forEach(catchment => {
    catchment.locations = [];
    catchment.addressLevels.forEach(addressLevel => {
        catchment.locations.push({uuid: addressLevel.uuid, comment: addressLevel.name});
        locations.push(addressLevel);
        addressLevel.parents = [];
    });
    delete catchment.addressLevels;
});
console.log(JSON.stringify(catchments, null, 2));
console.error(JSON.stringify(locations, null, 2));

/*
node addressLevelToLocations.js > /tmp/c 2> /tmp/l
mv /tmp/c ./catchments.json
mv /tmp/l ./locations.json
*/
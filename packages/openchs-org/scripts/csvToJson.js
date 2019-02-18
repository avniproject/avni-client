let uuidv4 = require('uuid/v4');
let fs = require('fs');
let _ = require('lodash');

let maps = {
    Pushparajgarh: '4af73b4f-c726-4e0b-8236-fe4168b60fe1',
    Jaithari: '03d77e2f-bdf4-4468-bb1d-f2fe0a54c471',
    Anuppur: '879922ce-d382-45d4-a488-6dcb97dcadd9',
    Kotma: 'c3110c85-683a-4fa1-bd24-537f8a3ee566'
};

let csvfile = fs.readFileSync('~/Downloads/Village-Comparison_database and Updated list - Sheet7.csv').toString();
let processed = csvfile.split('\r\n').slice(1)
    .map(row => row.trim().split(','))
    .map(([village, block]) => ({
        uuid: uuidv4(),
        name: village.trim(),
        level: 1,
        type: 'Village',
        parents: [{comment: block, uuid: maps[block]}]
    }));

fs.writeFileSync('~/Downloads/Village-Comparison_database and Updated list - Sheet7.json', JSON.stringify(processed, null, 2));

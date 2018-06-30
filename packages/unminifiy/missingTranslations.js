const fs = require('fs');
const path = require('path');

const translationCode = "hi_IN";

const walkSync = function (dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        }
        else if (file.toLowerCase().includes("messages") &&
            file.toLowerCase().endsWith(".json") &&
            !path.join(dir, file).toLowerCase().includes("node_modules")) {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};

let translatedWords = walkSync("../", []).map(file => {
    let words = [];
    if (file.includes(translationCode)) {
        words = words.concat(Object.keys(require(file)));
    } else if (require(file)[translationCode] !== undefined) {
        words = words.concat(Object.keys(require(file)[translationCode]));
    }
    return words
}).reduce((acc, curr) => acc.concat(curr), [])
    .filter(v => v !== undefined && v !== null && v.length > 0)
    .map(w => `'${w}'`).join(',');

console.log(`select *, '' "Translation" from (
select distinct unnest(array[p.name, f.name, feg.name, fe.name, c.name]) as all_names from program p
inner join form_mapping fm on fm.entity_id=p.id
inner join form f on fm.form_id=f.id
inner join form_element_group feg on feg.form_id=f.id
inner join form_element fe on fe.form_element_group_id=feg.id
inner join concept c on fe.concept_id=c.id
inner join concept_answer ca on ca.concept_id=c.id
inner join concept c2 on ca.answer_concept_id=c2.id) as all_names where all_names not in (${translatedWords});`);
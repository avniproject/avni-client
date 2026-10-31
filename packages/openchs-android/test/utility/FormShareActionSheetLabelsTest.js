/**
 * #2044: every label the share sheet asks for must exist in en.json, or the sheet prints the raw key
 * (MessageService falls back to the key itself, and to en for other locales).
 *
 * Run: npx jest test/utility/FormShareActionSheetLabelsTest.js --selectProjects unit
 */
const fs = require('fs');
const path = require('path');
const en = require('../../translations/en.json').translations;

const source = fs.readFileSync(path.join(__dirname, '../../src/views/common/FormShareActionSheet.js'), 'utf8');
const keys = [...source.matchAll(/(?:I18n\.t\(|this\._row\("[^"]+",\s*)"([^"]+)"/g)].map((m) => m[1]);

describe('FormShareActionSheet labels', () => {
    it('finds the labels it asks for', () => {
        expect(keys).toEqual(expect.arrayContaining(['share', 'formShare.asPdf', 'formShare.asText']));
    });

    it.each(keys)('en.json has "%s"', (key) => {
        expect(en[key]).toBeTruthy();
    });
});

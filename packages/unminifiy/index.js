if(process.argv.length != 5) {
	console.log("\x1b[36m%s\x1b[0m","Usage: npm start {relative path of source map} {error line number} {error column number}");
	process.exit();
}
const SourceMap = require("source-map");
const fs = require("fs");

const cliArgs = process.argv.slice(2);
const [sourceMapFilePath, lineNumber, columnNumber] = cliArgs;

const sourceMapFileContents = fs.readFileSync(sourceMapFilePath);

const mapConsumer = new SourceMap.SourceMapConsumer(JSON.parse(sourceMapFileContents));

console.log(mapConsumer.originalPositionFor({line: lineNumber, column: columnNumber}));

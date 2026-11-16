import * as fs from 'node:fs';
import { parse } from './parse.js';

// The optional path arguments support local verification without consulting
// the environment or changing rendering according to the execution host.
const inputFile = process.argv[2] ?? '/input/cases.json';
const outputFile = process.argv[3] ?? '/output/html.json';
const documents = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const rendered = new Array(documents.length);
for (let index = 0; index < documents.length; index++) {
  rendered[index] = parse(documents[index].markdown);
}
fs.writeFileSync(outputFile, JSON.stringify(rendered));

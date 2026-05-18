import fs from 'fs';
import path from 'path';
import * as diff from 'diff';

const oldFile = process.argv[2];
const newFile = process.argv[3];

const oldC = fs.readFileSync(oldFile, 'utf8');
const newC = fs.readFileSync(newFile, 'utf8');

const patch = diff.createPatch(path.basename(oldFile), oldC, newC);
console.log(patch);

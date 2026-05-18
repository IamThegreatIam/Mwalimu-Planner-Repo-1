import fs from 'fs';
import path from 'path';

const srcDir = './src';
const newDir = './lessonplannerjs-main/src';

function walk(dir: string): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(file));
      } else {
        results.push(file);
      }
    });
  } catch (e) {}
  return results;
}

const oldFiles = walk(srcDir);
const newFiles = walk(newDir);

console.log('--- CHANGED FILES ---');
oldFiles.forEach(f => {
  const rel = path.relative(srcDir, f);
  const newF = path.join(newDir, rel);
  if (fs.existsSync(newF)) {
    const oldC = fs.readFileSync(f, 'utf8');
    const newC = fs.readFileSync(newF, 'utf8');
    if (oldC !== newC) {
      console.log(rel);
    }
  }
});

console.log('--- ADDED FILES ---');
newFiles.forEach(f => {
  const rel = path.relative(newDir, f);
  const oldF = path.join(srcDir, rel);
  if (!fs.existsSync(oldF)) {
    console.log(rel);
  }
});

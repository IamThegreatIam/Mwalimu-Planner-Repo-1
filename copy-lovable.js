import fs from 'fs';
import path from 'path';

const srcDir = './src';
const newDir = './lessonplannerjs-main/src';

function walk(dir) {
  let results = [];
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
  } catch(e){}
  return results;
}

const newFiles = walk(newDir);

newFiles.forEach(f => {
  const rel = path.relative(newDir, f);
  const target = path.join(srcDir, rel);
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(f, target);
});
console.log("Copied all files from lessonplannerjs-main/src to src");

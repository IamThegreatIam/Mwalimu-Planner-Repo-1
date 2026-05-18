import fs from 'fs';
import * as diff from 'diff'; // Need a strict way to see changes if diff library is in node_modules, else use simple splitting

// Actually we don't have diff library installed by default. We can just use node's basic child_process to run diff if it is available in system? No the AI says "command 'diff' is not allowed". But inside shell_exec I can use `npx diff` ? No, there is no generic diff package maybe.
// Let's just output side by side? No, too long.

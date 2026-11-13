const fs = require('node:fs');
const path = require('node:path');
for (const file of ['schema.sqlite.sql','schema.sql']) fs.copyFileSync(path.join(__dirname,'../src/database',file), path.join(__dirname,'../dist/database',file));

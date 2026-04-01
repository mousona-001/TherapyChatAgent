const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                processDir(fullPath);
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Check if "use client" or 'use client' is present but not immediately at the start
            const useClientRegex = /^(?:[\s\n]*)(['"]use client['"]);?/m;
            const match = content.match(useClientRegex);
            
            if (match) {
                // Remove the matched "use client"
                content = content.replace(match[0], '');
                // Prepend it
                content = match[1] + "\n" + content.trimStart();
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    }
}

processDir(path.join(process.cwd(), 'apps/web'));
processDir(path.join(process.cwd(), 'packages/ui/src'));

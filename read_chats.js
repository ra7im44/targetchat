const fs = require('fs');
try {
    const content = fs.readFileSync('chats_output.txt', 'utf8'); // Try utf8 first
    console.log(content);
} catch (e) {
    try {
        const content = fs.readFileSync('chats_output.txt', 'ucs2'); // Try ucs2 (utf16le)
        console.log(content);
    } catch (e2) {
        console.error('Failed to read file');
    }
}

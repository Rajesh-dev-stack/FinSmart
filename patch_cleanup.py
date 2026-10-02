import re

with open('src/utils/tokenTransfer.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('export async function cleanExpiredTokens() {', 'export async function cleanExpiredTokens(userId) {')
code = code.replace("where('status', '==', 'pending'),", "where('senderId', '==', userId),\n    where('status', '==', 'pending'),")

with open('src/utils/tokenTransfer.js', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace('setInterval(cleanExpiredTokens, 300000);', 'setInterval(() => cleanExpiredTokens(user.uid), 300000);')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('Fixed cleanup')

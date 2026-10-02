with open('src/firebase/dbFunctions.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import { runTransaction, onSnapshot } from 'firebase/firestore';", '')
with open('src/firebase/dbFunctions.js', 'w', encoding='utf-8') as f:
    f.write(code)

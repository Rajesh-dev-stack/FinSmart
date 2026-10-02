import re

with open('src/pages/Transfer.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import { getUserByFinSmartId, getUser } from '../firebase/dbFunctions';", "import { getUserByFinSmartId } from '../firebase/dbFunctions';")

with open('src/pages/Transfer.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Import fixed")

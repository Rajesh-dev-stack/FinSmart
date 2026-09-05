import re

with open('src/pages/Transfer.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove INITIAL_BRANDS and brands state
code = re.sub(r'const INITIAL_BRANDS = \[.*?\];\n\n', '', code, flags=re.DOTALL)
code = code.replace('const [brands, setBrands] = useState(INITIAL_BRANDS);', '')

# 2. Remove brand logic from fetchWalletAndPayees
code = code.replace("const customBrands = savedPayees.filter(p => p.type === 'brand');\n          ", '')
code = code.replace('setBrands([...customBrands, ...INITIAL_BRANDS]);', '')

# 3. Remove brand logic from handleAddPayee
code = re.sub(r"if \(newPayeeType === 'contact'\) \{.*?\} else \{.*?\}", 'setContacts([savedPayee, ...contacts]);\n      showToast(`Added contact ${newPayeeName}`);', code, flags=re.DOTALL)

# 4. Remove brand logic from handleDeletePayee
code = re.sub(r"if \(payee\.type === 'contact'\) \{.*?\} else \{.*?\}", 'setContacts(contacts.filter(c => c.id !== payee.id));', code, flags=re.DOTALL)

# 5. Remove Brands section from UI
code = re.sub(r'\{/\* Brands \*/\}.*?(?=\{/\* Send Modal \*/\})', '', code, flags=re.DOTALL)

# 6. Remove Type dropdown from Add Payee Modal
code = re.sub(r'<div className="form-group">\s*<label>Type</label>\s*<select.*?</select>\s*</div>', '', code, flags=re.DOTALL)

# 7. Update placeholders
code = code.replace('{newPayeeType === \'contact\' ? "e.g., Alex Johnson" : "e.g., Hulu"}', '"e.g., Alex Johnson"')
code = code.replace('{newPayeeType === \'contact\' ? "alex@example.com" : "Subscription ID"}', '"alex@example.com"')
code = code.replace('{processing ? \'Saving...\' : `Add ${newPayeeType === \'contact\' ? \'Contact\' : \'Brand\'}`}', '{processing ? \'Saving...\' : \'Add Contact\'}')

with open('src/pages/Transfer.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

import os

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace("import { listenForIncomingTransfer, cleanExpiredTokens } from './utils/tokenTransfer';\n", '')
app = app.replace("  const [transferMsg, setTransferMsg] = useState(null);\n", '')

effect_start = app.find('    // Listen for incoming transfers')
effect_end = app.find('  }, [user]);')
if effect_start != -1 and effect_end != -1:
    app = app[:effect_start] + app[effect_end:]

toast_start = app.find('{/* Incoming Transfer Toast */}')
toast_end = app.find('      )}', toast_start)
if toast_start != -1 and toast_end != -1:
    app = app[:toast_start] + app[toast_end + 9:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app)

if os.path.exists('src/utils/tokenTransfer.js'):
    os.remove('src/utils/tokenTransfer.js')

print('Cleaned up')

with open('src/components/SendMoneyModal.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('const SendMoneyModal = ({ senderUid, senderBalance, onClose, onSuccess }) => {', 'const SendMoneyModal = ({ senderUid, senderBalance, initialFinSmartId, onClose, onSuccess }) => {')
code = code.replace("const [finSmartId, setFinSmartId] = useState('');", "const [finSmartId, setFinSmartId] = useState(initialFinSmartId || '');")

with open('src/components/SendMoneyModal.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/pages/Transfer.jsx', 'r', encoding='utf-8') as f:
    transfer = f.read()

# Replace the complicated Modal logic in Transfer.jsx with a simple call to SendMoneyModal
# Since SendMoneyModal handles searching and sending, we just need to pass senderUid, senderBalance, initialFinSmartId.

start_modal = transfer.find('{/* Send Modal Step 1 */}')
end_modal = transfer.find('{/* Add Payee Modal */}')
if start_modal != -1 and end_modal != -1:
    new_modal = """      {/* Send Modal */}
      {showSendModal && (
        <SendMoneyModal 
          senderUid={auth.currentUser.uid}
          senderBalance={balance}
          initialFinSmartId={selectedPayee?.detail}
          onClose={() => {
            setShowSendModal(false);
            setSelectedPayee(null);
          }}
          onSuccess={(amt) => {
            setShowSendModal(false);
            setSelectedPayee(null);
            showToast(`Successfully sent ₹${amt}!`);
            // balance updates automatically in Wallet, but in Transfer we manually fetch on mount.
            // Let's just update local balance manually.
            setBalance(prev => prev - Number(amt));
          }}
        />
      )}
      
"""
    transfer = transfer[:start_modal] + new_modal + transfer[end_modal:]

# We can also clean up receiverUser, currentUserDoc, handleInitiateSend etc which are no longer needed
start_junk = transfer.find('const [receiverUser, setReceiverUser] = useState(null);')
end_junk = transfer.find('const handleAddPayee = async (e) => {')
if start_junk != -1 and end_junk != -1:
    transfer = transfer[:start_junk] + transfer[end_junk:]

with open('src/pages/Transfer.jsx', 'w', encoding='utf-8') as f:
    f.write(transfer)

print('Updated Transfer.jsx and SendMoneyModal.jsx')

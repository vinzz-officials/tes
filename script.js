document.getElementById('formPesan').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pesanInput = document.getElementById('pesan');
  const userInput = document.getElementById('user');
  const fromInput = document.getElementById('from');
  const pesan = pesanInput.value.trim();
  const target = userInput.value.trim();
  const from = fromInput.value.trim();
  if (!pesan) return;

  const token = '8077126658:AAEXbQIPzELdHj_FuOHB9dQjGU30_n7Sdy8';
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: target,
        text: `Hi ada yang confess nih:\npesan: ${pesan}\nDari: ${from}\nWeb: https://Confess-telegram.netlify.app`
      })
    });

    pesanInput.value = '';
    userInput.value = '';
    fromInput.value = '';

    const notif = document.getElementById('notifikasi');
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 2000);

  } catch (err) {
    alert('Gagal mengirim pesan.');
  }
})

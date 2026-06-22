(function bootWallet() {
  'use strict';

  var state = {
    authMode: 'login',
    phone: window.sessionStorage.getItem('walletPhone') || '',
    balance: 0
  };

  var authView = document.getElementById('authView');
  var dashboardView = document.getElementById('dashboardView');
  var authForm = document.getElementById('authForm');
  var transferForm = document.getElementById('transferForm');
  var authMessage = document.getElementById('authMessage');
  var transferMessage = document.getElementById('transferMessage');
  var authSubmit = document.getElementById('authSubmit');
  var transferSubmit = document.getElementById('transferSubmit');
  var toast = document.getElementById('toast');

  var post = async function(url, body) {
    var response = await window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {})
    });

    return response.json();
  };

  var setLoading = function(button, loading, label) {
    button.disabled = loading;
    button.textContent = loading ? 'Please wait...' : label;
  };

  var setMessage = function(element, message, success) {
    element.textContent = message || '';
    element.classList.toggle('success', Boolean(success));
  };

  var showToast = function(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  };

  var formatMoney = function(value) {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  };

  var formatDate = function(timestamp) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  var updateAccount = function() {
    var phone = state.phone || 'Wallet user';
    document.getElementById('accountPhone').textContent = phone;
    document.getElementById('accountAvatar').textContent = phone.slice(-2).toUpperCase();
    document.getElementById('balanceValue').textContent = formatMoney(state.balance);
  };

  var showAuth = function() {
    dashboardView.classList.add('hidden');
    authView.classList.remove('hidden');
  };

  var showDashboard = function() {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    updateAccount();
  };

  var renderHistory = function(transactions) {
    var list = document.getElementById('transactionList');
    list.replaceChildren();

    if (!transactions.length) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<span>↔</span><strong>No transactions yet</strong><p>Your wallet activity will appear here.</p>';
      list.appendChild(empty);
      return;
    }

    transactions.forEach((transaction) => {
      var incoming = transaction.direction === 'IN';
      var row = document.createElement('div');
      var icon = document.createElement('span');
      var copy = document.createElement('div');
      var title = document.createElement('strong');
      var meta = document.createElement('span');
      var amount = document.createElement('span');

      row.className = 'transaction-row';
      icon.className = 'transaction-icon ' + (incoming ? 'in' : 'out');
      icon.textContent = incoming ? '↙' : '↗';
      copy.className = 'transaction-copy';
      title.textContent = (incoming ? 'From ' : 'To ') + (transaction.counterpartyPhone || 'Unknown');
      meta.textContent = (transaction.note || 'Transfer') + ' · ' + formatDate(transaction.createdAt);
      amount.className = 'transaction-amount ' + (incoming ? 'in' : 'out');
      amount.textContent = (incoming ? '+' : '-') + formatMoney(transaction.amount);

      copy.appendChild(title);
      copy.appendChild(meta);
      row.appendChild(icon);
      row.appendChild(copy);
      row.appendChild(amount);
      list.appendChild(row);
    });
  };

  var loadBalance = async function() {
    var data = await post('/api/v1/pocket/balance');
    if (data.err !== 200) {
      return false;
    }
    state.balance = data.pocket.balance;
    updateAccount();
    return true;
  };

  var loadHistory = async function() {
    var data = await post('/api/v1/transaction/history');
    if (data.err === 200) {
      renderHistory(data.transactions);
    }
  };

  var enterDashboard = async function() {
    showDashboard();
    await Promise.all([loadBalance(), loadHistory()]);
  };

  document.querySelectorAll('[data-auth-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.authMode = tab.dataset.authMode;
      document.querySelectorAll('[data-auth-mode]').forEach((item) => {
        item.classList.toggle('active', item === tab);
      });
      document.getElementById('authEyebrow').textContent = state.authMode === 'login' ? 'WELCOME BACK' : 'GET STARTED';
      document.getElementById('authTitle').textContent = state.authMode === 'login' ? 'Sign in to your wallet' : 'Create your wallet';
      authSubmit.textContent = state.authMode === 'login' ? 'Sign in' : 'Create account';
      document.getElementById('authPassword').autocomplete = state.authMode === 'login' ? 'current-password' : 'new-password';
      setMessage(authMessage, '');
    });
  });

  document.getElementById('passwordToggle').addEventListener('click', (event) => {
    var input = document.getElementById('authPassword');
    var reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  });

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    var phone = document.getElementById('authPhone').value.trim();
    var password = document.getElementById('authPassword').value;
    var finalLabel = state.authMode === 'login' ? 'Sign in' : 'Create account';

    if (!phone || !password) {
      setMessage(authMessage, 'Phone number and password are required.');
      return;
    }

    setLoading(authSubmit, true, finalLabel);
    setMessage(authMessage, '');

    try {
      var endpoint = state.authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      var data = await post(endpoint, { phone: phone, password: password });

      if (data.err !== 200) {
        setMessage(authMessage, data.message);
        return;
      }

      if (state.authMode === 'register') {
        var loginData = await post('/api/v1/auth/login', { phone: phone, password: password });
        if (loginData.err !== 200) {
          setMessage(authMessage, loginData.message);
          return;
        }
      }

      state.phone = phone;
      window.sessionStorage.setItem('walletPhone', phone);
      await enterDashboard();
      showToast(state.authMode === 'register' ? 'Wallet created successfully.' : 'Signed in successfully.');
      authForm.reset();
    } catch (unusedErr) {
      setMessage(authMessage, 'Unable to connect to the wallet service.');
    } finally {
      setLoading(authSubmit, false, finalLabel);
    }
  });

  transferForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    var receiverPhone = document.getElementById('receiverPhone').value.trim();
    var amount = Number(document.getElementById('transferAmount').value);
    var note = document.getElementById('transferNote').value.trim();

    if (!receiverPhone || !Number.isSafeInteger(amount) || amount <= 0) {
      setMessage(transferMessage, 'Enter a recipient and a valid amount.');
      return;
    }

    setLoading(transferSubmit, true, 'Send money');
    setMessage(transferMessage, '');

    try {
      var data = await post('/api/v1/transaction/transfer', {
        receiverPhone: receiverPhone,
        amount: amount,
        note: note
      });

      if (data.err !== 200) {
        setMessage(transferMessage, data.message);
        return;
      }

      state.balance = data.balance;
      updateAccount();
      transferForm.reset();
      await loadHistory();
      showToast('Transfer completed successfully.');
      document.getElementById('activitySection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (unusedErr) {
      setMessage(transferMessage, 'Unable to complete this transfer.');
    } finally {
      setLoading(transferSubmit, false, 'Send money');
    }
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    await post('/api/v1/auth/logout');
    state.phone = '';
    state.balance = 0;
    window.sessionStorage.removeItem('walletPhone');
    showAuth();
  });

  document.getElementById('refreshHistory').addEventListener('click', loadHistory);
  document.getElementById('quickTransferButton').addEventListener('click', () => {
    document.getElementById('receiverPhone').focus();
    document.getElementById('transferSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-section]').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      document.getElementById(button.dataset.section + 'Section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  loadBalance().then((authenticated) => {
    if (authenticated) {
      enterDashboard();
    } else {
      showAuth();
    }
  }).catch(showAuth);
})();

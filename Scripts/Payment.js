// User session
  // User session will be handled by backend API
  const currentUser = { name: 'User', email: 'user@gofast.com' };
  document.getElementById('userWelcome').innerHTML = `👋 Welcome, <strong>${currentUser.name || currentUser.email}</strong>`;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    // Logout will be handled by backend API
    window.location.href = 'gofast-login.html';
  });

  // Load booking from backend API
  let booking = null;
  if (!booking) {
    alert('No booking payment found. Please start a new booking.');
    window.location.href = 'gofast-booking.html';
  }

  function renderSummary(booking) {
    const container = document.getElementById('summaryContent');
    const formattedDate = new Date(booking.departureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    container.innerHTML = `
      <div class="summary-box">
        <div class="summary-row">
          <span class="summary-label">Passenger</span>
          <span class="summary-value">${escapeHtml(booking.fullName)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Route</span>
          <span class="summary-value">${escapeHtml(booking.origin)} → ${escapeHtml(booking.destination)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Departure</span>
          <span class="summary-value">${formattedDate} at ${escapeHtml(booking.departureTime)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Seat</span>
          <span class="summary-value">${booking.selectedSeat}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-row">
          <span class="summary-label">Total to pay</span>
          <span class="total-price">${(booking.price || 0).toLocaleString()} CFA</span>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Payment method selection
  let selectedMethod = null;
  const mtnOption = document.getElementById('methodMtn');
  const orangeOption = document.getElementById('methodOrange');
  const mtnPhoneDiv = document.getElementById('mtnPhone');
  const orangePhoneDiv = document.getElementById('orangePhone');

  function clearSelection() {
    mtnOption.classList.remove('selected');
    orangeOption.classList.remove('selected');
    mtnPhoneDiv.classList.remove('active');
    orangePhoneDiv.classList.remove('active');
  }

  mtnOption.addEventListener('click', () => {
    clearSelection();
    selectedMethod = 'mtn';
    mtnOption.classList.add('selected');
    mtnPhoneDiv.classList.add('active');
  });

  orangeOption.addEventListener('click', () => {
    clearSelection();
    selectedMethod = 'orange';
    orangeOption.classList.add('selected');
    orangePhoneDiv.classList.add('active');
  });

  // Cancel button - go back to working page or booking?
  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel this payment? Your booking will still be saved as draft.')) {
      window.location.href = 'gofast-working.html';
    }
  });

  // Pay button
  document.getElementById('payBtn').addEventListener('click', () => {
    if (!selectedMethod) {
      alert('Please select a payment method (MTN Mobile Money or Orange Money).');
      return;
    }
    let phoneNumber = '';
    if (selectedMethod === 'mtn') {
      phoneNumber = document.getElementById('mtnNumber').value.trim();
      if (!phoneNumber) {
        alert('Please enter your MTN Mobile Money number.');
        return;
      }
      if (!/^[6]{1}[0-9]{8}$/.test(phoneNumber) && !/^[65]{1}[0-9]{8}$/.test(phoneNumber)) {
        alert('Please enter a valid MTN number (e.g., 6XXXXXXXX).');
        return;
      }
    } else if (selectedMethod === 'orange') {
      phoneNumber = document.getElementById('orangeNumber').value.trim();
      if (!phoneNumber) {
        alert('Please enter your Orange Money number.');
        return;
      }
      if (!/^[6]{1}[0-9]{8}$/.test(phoneNumber) && !/^[65]{1}[0-9]{8}$/.test(phoneNumber)) {
        alert('Please enter a valid Orange number (e.g., 6XXXXXXXX).');
        return;
      }
    }

    // Simulate payment processing
    const payBtn = document.getElementById('payBtn');
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    
    setTimeout(() => {
      // Mark booking as paid
      booking.status = 'paid';
      booking.paymentMethod = selectedMethod === 'mtn' ? 'MTN Mobile Money' : 'Orange Money';
      booking.paymentPhone = phoneNumber;
      booking.paidAt = new Date().toISOString();
      
      // Payment and booking confirmation will be handled by backend API
      alert(`✅ Payment successful! Your ticket has been confirmed.`);
      window.location.href = 'gofast-working.html';
    }, 1500);
  });
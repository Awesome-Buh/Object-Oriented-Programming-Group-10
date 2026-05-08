// ------ User session ------
  // User session will be handled by backend API
  const currentUser = { name: 'User', email: 'user@gofast.com' };
  document.getElementById('userWelcome').innerHTML = `👋 Welcome, <strong>${currentUser.name || currentUser.email}</strong>`;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    // Logout will be handled by backend API
    window.location.href = 'gofast-login.html';
  });

  // Booking data will be fetched from backend API
  let bookingData = null;

  // if (!bookingData) {
  //   alert('No booking found. Please start a new booking.');
  //   window.location.href = 'gofast-booking.html';
  // }

  function renderReview(data) {
    const container = document.getElementById('reviewContent');
    // Format date nicely
    const dateObj = new Date(data.departureDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    container.innerHTML = `
      <div class="info-group">
        <div class="info-label">Passenger name</div>
        <div class="info-value">${escapeHtml(data.fullName)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Phone number</div>
        <div class="info-value">${escapeHtml(data.phone)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Route</div>
        <div class="info-value">${escapeHtml(data.origin)} → ${escapeHtml(data.destination)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Departure</div>
        <div class="info-value">${formattedDate} at ${escapeHtml(data.departureTime)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Seat number</div>
        <div class="info-value">Seat ${data.selectedSeat} (${getSeatPosition(data.selectedSeat)})</div>
      </div>
      <div class="price-highlight">
        <div class="info-label" style="color: var(--muted);">Total amount</div>
        <div class="amount">${(data.price || 0).toLocaleString()} CFA</div>
      </div>
    `;
  }

  // Helper: seat position based on number (1-16) and bus layout
  function getSeatPosition(seatNum) {
    const row = Math.ceil(seatNum / 4);
    const posInRow = ((seatNum - 1) % 4) + 1;
    let side = '';
    if (posInRow === 1 || posInRow === 2) side = 'Left side';
    else side = 'Right side';
    return `${side}, Row ${row}`;
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

  // ------ Edit button: go back to booking page with resume flag ------
  document.getElementById('editBtn').addEventListener('click', () => {
    // Keep pendingBooking as is, just redirect
    window.location.href = 'gofast-booking.html?resume=true';
  });

  // ------ Confirm button: finalize booking, send to backend, then go to payment ------
  document.getElementById('confirmBtn').addEventListener('click', () => {
    if (!bookingData) return;
    // Generate a unique booking ID
    const bookingId = 'GF' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const finalBooking = {
      ...bookingData,
      bookingId: bookingId,
      status: 'pending_payment',
      bookedAt: new Date().toISOString(),
      userEmail: currentUser.email
    };
    // Booking will be saved to backend API
    // Redirect to payment page
    window.location.href = 'gofast-payment.html';
  });
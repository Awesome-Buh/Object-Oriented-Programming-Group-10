// ------------------- USER SESSION -------------------
// User session will be handled by backend API
const currentUser = { name: 'User', email: 'user@gofast.com' };
document.getElementById('userWelcome').innerHTML = ` Welcome, <strong>${currentUser.name || currentUser.email}</strong>`;

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  // Logout will be handled by backend API
  window.location.href = 'gofast-login.html';
});



// ------------------- PERSISTENT BOOKING STATE -------------------
// Pending booking state will be handled by backend API
let pendingBooking = null;
const floatingBtn = document.getElementById('floatingBookingBtn');
const resumeBtn = document.getElementById('resumeBookingBtn');
const cancelBtn = document.getElementById('cancelBookingBtn');

function updateFloatingButton() {
  if (pendingBooking) {
    floatingBtn.classList.remove('hidden');
  } else {
    floatingBtn.classList.add('hidden');
  }
}

// Cancel pending booking
function cancelPendingBooking() {
  // Booking cancellation will be handled by backend API
  pendingBooking = null;
  updateFloatingButton();
  alert('Incomplete booking has been cancelled.');
}

// Resume booking: redirect to booking page
function resumeBooking() {
  if (pendingBooking) {
    window.location.href = 'gofast-booking.html?resume=true';
  } else {
    cancelPendingBooking();
  }
}

cancelBtn.addEventListener('click', cancelPendingBooking);
resumeBtn.addEventListener('click', resumeBooking);
updateFloatingButton();

// ------------------- NAVIGATION TO BOOKING PAGE -------------------
// The booking page (to be built) will collect passenger info, seat selection, etc.
// We'll set a session flag to indicate new booking.
function initiateBooking() {
  // Clear any existing incomplete booking (or you can ask to resume)
  if (pendingBooking) {
    if (confirm('You have an incomplete booking. Do you want to resume it?')) {
      resumeBooking();
    } else {
      cancelPendingBooking();
      startFreshBooking();
    }
  } else {
    startFreshBooking();
  }
}

function startFreshBooking() {
  // Redirect to booking page for new booking
  window.location.href = 'gofast-booking.html';
}

document.getElementById('startBookingBtn').addEventListener('click', initiateBooking);
document.getElementById('bigBookBtn').addEventListener('click', initiateBooking);
// Admin authentication will be handled by backend API
  const adminVerified = true;

  // Load bookings from backend API
  function loadPaidBookings() {
    return [];
  }

  // ------------------- Render stats -------------------
  function renderStats(bookings) {
    const total = bookings.length;
    const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const uniqueRoutes = new Set(bookings.map(b => `${b.origin} → ${b.destination}`)).size;
    document.getElementById('totalBookings').innerText = total;
    document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
    document.getElementById('uniqueRoutes').innerText = uniqueRoutes;
  }

  // ------------------- Populate route filter dropdown -------------------
  function populateRouteFilter(bookings) {
    const routesSet = new Set();
    bookings.forEach(b => {
      routesSet.add(`${b.origin} → ${b.destination}`);
    });
    const select = document.getElementById('filterRoute');
    select.innerHTML = '<option value="">All routes</option>';
    [...routesSet].sort().forEach(route => {
      const option = document.createElement('option');
      option.value = route;
      option.textContent = route;
      select.appendChild(option);
    });
  }

  // ------------------- Apply filters and display table -------------------
  let currentFilteredBookings = [];

  function applyFilterAndRender() {
    const allBookings = loadPaidBookings();
    const routeFilter = document.getElementById('filterRoute').value;
    const dateFilter = document.getElementById('filterDate').value;
    
    let filtered = allBookings;
    if (routeFilter) {
      filtered = filtered.filter(b => `${b.origin} → ${b.destination}` === routeFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(b => b.departureDate === dateFilter);
    }
    currentFilteredBookings = filtered;
    renderTable(filtered);
    renderStats(allBookings); // stats always show total, not filtered
    return filtered;
  }

  function renderTable(bookings) {
    const tbody = document.getElementById('tableBody');
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7">No paid bookings match the current filter.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    bookings.forEach(b => {
      const row = tbody.insertRow();
      row.insertCell(0).innerText = b.bookingId;
      row.insertCell(1).innerText = b.fullName;
      row.insertCell(2).innerText = b.phone;
      row.insertCell(3).innerText = `${b.origin} → ${b.destination}`;
      row.insertCell(4).innerText = `${b.departureDate} at ${b.departureTime}`;
      row.insertCell(5).innerText = b.selectedSeat;
      row.insertCell(6).innerHTML = '<span class="badge-paid">Paid</span>';
    });
  }

  // ------------------- Download passenger manifest (names + seats) for the filtered bus -------------------
  function downloadManifest() {
    if (currentFilteredBookings.length === 0) {
      alert('No passengers match the selected route and date. Cannot download empty manifest.');
      return;
    }
    // Prepare CSV content
    const headers = ['Passenger Name', 'Phone', 'Seat Number', 'Ticket ID', 'Route', 'Departure Date', 'Departure Time'];
    const rows = currentFilteredBookings.map(b => [
      b.fullName,
      b.phone,
      b.selectedSeat,
      b.bookingId,
      `${b.origin} → ${b.destination}`,
      b.departureDate,
      b.departureTime
    ]);
    const csvLines = [];
    csvLines.push(headers.map(h => `"${h}"`).join(','));
    rows.forEach(row => {
      csvLines.push(row.map(cell => `"${cell}"`).join(','));
    });
    const csvContent = csvLines.join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    const routeText = document.getElementById('filterRoute').value || 'all_routes';
    const dateText = document.getElementById('filterDate').value || 'any_date';
    link.setAttribute('download', `GoFast_manifest_${routeText}_${dateText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ------------------- Initial load and event handlers -------------------
  function refreshAll() {
    const allPaid = loadPaidBookings();
    populateRouteFilter(allPaid);
    applyFilterAndRender();
  }

  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('applyFilterBtn').addEventListener('click', () => {
    applyFilterAndRender();
  });
  document.getElementById('downloadManifestBtn').addEventListener('click', downloadManifest);

  // Initial run
  refreshAll();

  // Optional: if admin wants to logout (clear session)
  // You can add a logout button if needed, but not required.
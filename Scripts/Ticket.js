// Admin authentication will be handled by backend API
  const adminVerified = true;

  function loadAllBookings() {
    // Load bookings from backend API
    return [];
  }

  function renderStats(bookings) {
    const total = bookings.length;
    const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
    document.getElementById('totalBookings').innerText = total;
    document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  }

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

  function applyFilter() {
    const allBookings = loadAllBookings();
    const routeFilter = document.getElementById('filterRoute').value;
    const dateFilter = document.getElementById('filterDate').value;
    let filtered = allBookings;
    if (routeFilter) {
      filtered = filtered.filter(b => `${b.origin} → ${b.destination}` === routeFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(b => b.departureDate === dateFilter);
    }
    renderTable(filtered);
    renderStats(filtered);
    return filtered;
  }

  function renderTable(bookings) {
    const tbody = document.getElementById('tableBody');
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No bookings match the filter.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    bookings.forEach(b => {
      const row = tbody.insertRow();
      row.insertCell(0).innerText = b.bookingId;
      row.insertCell(1).innerText = b.fullName;
      row.insertCell(2).innerText = `${b.origin} → ${b.destination}`;
      row.insertCell(3).innerText = `${b.departureDate} ${b.departureTime}`;
      row.insertCell(4).innerText = b.selectedSeat;
      row.insertCell(5).innerHTML = '<span class="badge">Paid</span>';
      // Add data-label for responsive
      for (let i = 0; i < row.cells.length; i++) {
        row.cells[i].setAttribute('data-label', ['Ticket ID','Passenger','Route','Departure','Seat','Status'][i]);
      }
    });
  }

  // Download CSV (passenger manifest for selected filter)
  function downloadManifest() {
    const filtered = applyFilter(); // re-apply filter to get current list
    if (filtered.length === 0) {
      alert('No passengers to export for this filter.');
      return;
    }
    // Prepare CSV
    const headers = ['Ticket ID', 'Passenger Name', 'Phone', 'Route', 'Departure Date', 'Departure Time', 'Seat Number', 'Amount (CFA)'];
    const rows = filtered.map(b => [
      b.bookingId, b.fullName, b.phone, `${b.origin} → ${b.destination}`,
      b.departureDate, b.departureTime, b.selectedSeat, b.price
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `goFast_manifest_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Initial load
  let allPaid = loadAllBookings();
  renderStats(allPaid);
  populateRouteFilter(allPaid);
  renderTable(allPaid);

  document.getElementById('refreshBtn').addEventListener('click', () => {
    allPaid = loadAllBookings();
    populateRouteFilter(allPaid);
    applyFilter();
  });
  document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
  document.getElementById('downloadManifestBtn').addEventListener('click', downloadManifest);
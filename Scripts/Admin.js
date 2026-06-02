
      // ==================== SAMPLE DATA (Replace with API calls later) ====================
      // This matches your backend structure from the doc

      let sampleBookings = [
        {
          bookingId: "GF001",
          fullName: "John Doe",
          phone: "677123456",
          origin: "Douala",
          destination: "Yaoundé",
          departureDate: "2026-06-15",
          departureTime: "08:00",
          selectedSeat: "A1",
          price: 4500,
          status: "paid",
        },
        {
          bookingId: "GF002",
          fullName: "Jane Smith",
          phone: "677234567",
          origin: "Douala",
          destination: "Bafoussam",
          departureDate: "2026-06-15",
          departureTime: "14:00",
          selectedSeat: "B3",
          price: 5500,
          status: "paid",
        },
        {
          bookingId: "GF003",
          fullName: "Paul Biya",
          phone: "677345678",
          origin: "Yaoundé",
          destination: "Garoua",
          departureDate: "2026-06-16",
          departureTime: "22:00",
          selectedSeat: "C2",
          price: 7500,
          status: "paid",
        },
        {
          bookingId: "GF004",
          fullName: "Marie Claire",
          phone: "677456789",
          origin: "Douala",
          destination: "Yaoundé",
          departureDate: "2026-06-16",
          departureTime: "08:00",
          selectedSeat: "A4",
          price: 4500,
          status: "paid",
        },
        {
          bookingId: "GF005",
          fullName: "François Ngosso",
          phone: "677567890",
          origin: "Douala",
          destination: "Yaoundé",
          departureDate: "2026-06-17",
          departureTime: "08:00",
          selectedSeat: "B2",
          price: 4500,
          status: "paid",
        },
      ];

      let sampleBuses = [
        {
          name: "Express 101",
          licensePlate: "LT 001 AB",
          capacity: 16,
          status: "active",
        },
        {
          name: "City Shuttle",
          licensePlate: "LT 002 CD",
          capacity: 32,
          status: "active",
        },
        {
          name: "Night Rider",
          licensePlate: "LT 003 EF",
          capacity: 24,
          status: "maintenance",
        },
      ];

      // Store assignments (simulates audit log from your backend doc)
      let driverAssignments = JSON.parse(
        localStorage.getItem("driverAssignments") || "[]",
      );

      // ==================== Helper Functions ====================
      function loadPaidBookings() {
        return sampleBookings.filter((b) => b.status === "paid");
      }

      function renderStats(bookings) {
        document.getElementById("totalBookings").innerText = bookings.length;
        document.getElementById("totalRevenue").innerText = bookings
          .reduce((s, b) => s + (b.price || 0), 0)
          .toLocaleString();
        document.getElementById("uniqueRoutes").innerText = new Set(
          bookings.map((b) => `${b.origin}→${b.destination}`),
        ).size;
        document.getElementById("uniquePassengers").innerText = new Set(
          bookings.map((b) => b.fullName),
        ).size;
      }

      function populateRouteFilter(bookings) {
        const routes = [
          ...new Set(bookings.map((b) => `${b.origin} → ${b.destination}`)),
        ];
        const select = document.getElementById("filterRoute");
        select.innerHTML = '<option value="">All routes</option>';
        routes.sort().forEach((r) => {
          let opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          select.appendChild(opt);
        });
      }

      // Render bus management table
      function renderBusTable() {
        const tbody = document.getElementById("busTableBody");
        if (!sampleBuses.length) {
          tbody.innerHTML = '<tr><td colspan="4">No buses</td></tr>';
          return;
        }
        tbody.innerHTML = "";
        sampleBuses.forEach((bus) => {
          let row = tbody.insertRow();
          row.insertCell(0).innerText = bus.name;
          row.insertCell(1).innerText = bus.licensePlate;
          row.insertCell(2).innerText = bus.capacity;
          row.insertCell(3).innerHTML =
            `<span style="color: ${bus.status === "active" ? "#2ecc71" : "#e74c3c"}">${bus.status}</span>`;
        });
        // Populate bus dropdown for assignment
        const busSelect = document.getElementById("assignBusSelect");
        busSelect.innerHTML = '<option value="">-- Select Bus --</option>';
        sampleBuses.forEach((bus) => {
          let opt = document.createElement("option");
          opt.value = bus.name;
          opt.textContent = `${bus.name} (${bus.licensePlate})`;
          busSelect.appendChild(opt);
        });
      }

      // Add bus (simulates POST /api/admin/buses)
      function addBus(name, capacity) {
        if (!name || capacity < 4) {
          alert("Bus name required, capacity min 4");
          return false;
        }
        let newBus = {
          name: name,
          licensePlate: `LT ${Math.floor(Math.random() * 900) + 100} XX`,
          capacity: capacity,
          status: "active",
        };
        sampleBuses.push(newBus);
        renderBusTable();
        alert(`Bus "${name}" added successfully!`);
        return true;
      }

      // Assign driver (simulates use case from your diagram)
      function assignDriver(busName, driverName) {
        if (!busName) {
          alert("Please select a bus");
          return false;
        }
        driverAssignments.push({
          bus: busName,
          driver: driverName,
          assignedAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "driverAssignments",
          JSON.stringify(driverAssignments),
        );
        document.getElementById("assignmentResult").innerHTML =
          `✅ Assigned ${driverName} to ${busName} at ${new Date().toLocaleTimeString()}`;
        setTimeout(() => {
          document.getElementById("assignmentResult").innerHTML = "";
        }, 3000);
        return true;
      }

      // Chart rendering
      let revenueChart;
      function renderChart(bookings) {
        const last7Days = [...Array(7).keys()]
          .map((i) => {
            let d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split("T")[0];
          })
          .reverse();
        const dailyRevenue = last7Days.map((date) =>
          bookings
            .filter((b) => b.departureDate === date)
            .reduce((s, b) => s + (b.price || 0), 0),
        );
        if (revenueChart) revenueChart.destroy();
        const ctx = document.getElementById("revenueChart").getContext("2d");
        revenueChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: last7Days.map((d) => d.slice(5)),
            datasets: [
              {
                label: "Revenue (CFA)",
                data: dailyRevenue,
                backgroundColor: "#ff5c1a",
                borderRadius: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: "#f5f4f0" } } },
          },
        });
      }

      // Filter and render table
      let currentFiltered = [];
      function applyFilterAndRender() {
        const all = loadPaidBookings();
        const routeFilter = document.getElementById("filterRoute").value;
        const dateFilter = document.getElementById("filterDate").value;
        let filtered = all;
        if (routeFilter)
          filtered = filtered.filter(
            (b) => `${b.origin} → ${b.destination}` === routeFilter,
          );
        if (dateFilter)
          filtered = filtered.filter((b) => b.departureDate === dateFilter);
        currentFiltered = filtered;
        const tbody = document.getElementById("tableBody");
        if (!filtered.length) {
          tbody.innerHTML =
            '<tr><td colspan="7">No bookings match filter</td></tr>';
          renderStats(all);
          renderChart(all);
          return;
        }
        tbody.innerHTML = "";
        filtered.forEach((b) => {
          let row = tbody.insertRow();
          row.insertCell(0).innerText = b.bookingId;
          row.insertCell(1).innerText = b.fullName;
          row.insertCell(2).innerText = b.phone;
          row.insertCell(3).innerText = `${b.origin} → ${b.destination}`;
          row.insertCell(4).innerText = `${b.departureDate} ${b.departureTime}`;
          row.insertCell(5).innerText = b.selectedSeat;
          row.insertCell(6).innerHTML = '<span class="badge-paid">Paid</span>';
        });
        renderStats(all);
        renderChart(all);
      }

      function downloadManifest() {
        if (!currentFiltered.length) {
          alert("No passengers to export");
          return;
        }
        const headers = [
          "Passenger",
          "Phone",
          "Seat",
          "Ticket ID",
          "Route",
          "Date",
          "Time",
        ];
        const rows = currentFiltered.map((b) => [
          b.fullName,
          b.phone,
          b.selectedSeat,
          b.bookingId,
          `${b.origin}→${b.destination}`,
          b.departureDate,
          b.departureTime,
        ]);
        let csv = [headers.map((h) => `"${h}"`).join(",")];
        rows.forEach((r) => csv.push(r.map((c) => `"${c}"`).join(",")));
        const blob = new Blob(["\uFEFF" + csv.join("\n")], {
          type: "text/csv",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `GoFast_manifest_${document.getElementById("filterRoute").value || "all"}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      async function fetchPaidBookingsFromApi() {
        const token = localStorage.getItem('accessToken');
        try {
          const resp = await fetch('http://localhost:5500/api/admin/bookings/paid', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!resp.ok) {
            console.warn('Could not fetch paid bookings from API:', resp.status);
            return [];
          }
          return await resp.json();
        } catch (err) {
          console.error('Error fetching paid bookings:', err);
          return [];
        }
      }

      async function refreshAll() {
        const apiBookings = await fetchPaidBookingsFromApi();
        if (apiBookings && apiBookings.length) {
          // Map API DTO to UI sample format
          sampleBookings = apiBookings.map((b) => ({
            bookingId: b.bookingId,
            fullName: b.fullName,
            phone: b.phone,
            origin: b.origin,
            destination: b.destination,
            departureDate: b.departureDate,
            departureTime: b.departureTime,
            selectedSeat: b.selectedSeat || '',
            price: b.price,
            status: 'paid',
          }));
        }

        const all = loadPaidBookings();
        populateRouteFilter(all);
        applyFilterAndRender();
        renderBusTable();
      }

      // Logout
      function logout() {
        localStorage.removeItem("goFastAdminLoggedIn");
        window.location.href = "gofast-landing.html";
      }

      // ==================== Event Listeners ====================
      document
        .getElementById("refreshBtn")
        ?.addEventListener("click", refreshAll);
      document
        .getElementById("applyFilterBtn")
        ?.addEventListener("click", applyFilterAndRender);
      document
        .getElementById("downloadManifestBtn")
        ?.addEventListener("click", downloadManifest);
      document.getElementById("logoutBtn")?.addEventListener("click", logout);
      document.getElementById("addBusBtn")?.addEventListener("click", () => {
        let name = document.getElementById("newBusName").value;
        let cap = parseInt(document.getElementById("newBusCapacity").value);
        addBus(name, cap);
        document.getElementById("newBusName").value = "";
        document.getElementById("newBusCapacity").value = "";
      });
      document
        .getElementById("assignDriverBtn")
        ?.addEventListener("click", () => {
          let bus = document.getElementById("assignBusSelect").value;
          let driver = document.getElementById("assignDriverSelect").value;
          assignDriver(bus, driver);
        });

      // ==================== Admin Auth Check (disabled) ====================
      /*
      if (!localStorage.getItem("goFastAdminLoggedIn")) {
        let pwd = prompt("🔐 Admin access required:");
        if (pwd === "admin123")
          localStorage.setItem("goFastAdminLoggedIn", "true");
        else {
          alert("Unauthorized");
          window.location.href = "gofast-landing.html";
        }
      }
      */
      refreshAll();
    
// Session & logout same as before
      // User session will be handled by backend API
      const currentUser = { name: 'User', email: 'user@gofast.com' };
      document.getElementById("userWelcome").innerHTML =
        `👋 Welcome, <strong>${currentUser.name || currentUser.email}</strong>`;
      document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        // Logout will be handled by backend API
        window.location.href = "gofast-login.html";
      });

      // DOM elements
      const originSelect = document.getElementById("origin");
      const destSelect = document.getElementById("destination");
      const dateInput = document.getElementById("departureDate");
      const timeSelect = document.getElementById("departureTime");
      const busSelect = document.getElementById("busSelect");
      let selectedSeat = null;

      // Dynamic bus options based on route/date/time (mock)
      function updateBusOptions() {
        const origin = originSelect.value;
        const dest = destSelect.value;
        const date = dateInput.value;
        const time = timeSelect.value;
        if (!origin || !dest || !date || !time) {
          busSelect.disabled = true;
          busSelect.innerHTML =
            '<option value="">First choose route, date & time</option>';
          return;
        }
        // Mock bus availability (in real app would fetch from server)
        const busOptions = [
          { id: "BUS101", name: "Bus 101 - Executive", capacity: 16 },
          { id: "BUS102", name: "Bus 102 - Standard AC", capacity: 16 },
          { id: "BUS103", name: "Bus 103 - Luxury", capacity: 16 },
        ];
        busSelect.disabled = false;
        busSelect.innerHTML = '<option value="">-- Select a bus --</option>';
        busOptions.forEach((bus) => {
          const option = document.createElement("option");
          option.value = bus.id;
          option.textContent = `${bus.name} (${bus.capacity} seats)`;
          busSelect.appendChild(option);
        });
        // Reset seat selection when bus changes
        busSelect.value = "";
        selectedSeat = null;
        generateSeats();
      }

      originSelect.addEventListener("change", updateBusOptions);
      destSelect.addEventListener("change", updateBusOptions);
      dateInput.addEventListener("change", updateBusOptions);
      timeSelect.addEventListener("change", updateBusOptions);
      busSelect.addEventListener("change", generateSeats);

      // Seat generation (same layout for all buses)
      function generateSeats() {
        const container = document.getElementById("seatRowsContainer");
        container.innerHTML = "";
        const rows = 4;
        let seatNum = 1;
        for (let row = 0; row < rows; row++) {
          const rowDiv = document.createElement("div");
          rowDiv.className = "seat-row";
          const leftGroup = document.createElement("div");
          leftGroup.className = "seat-group";
          for (let i = 0; i < 2; i++)
            leftGroup.appendChild(createSeatElement(seatNum++));
          const aisle = document.createElement("div");
          aisle.className = "aisle-marker";
          aisle.textContent = "🟫";
          const rightGroup = document.createElement("div");
          rightGroup.className = "seat-group";
          for (let i = 0; i < 2; i++)
            rightGroup.appendChild(createSeatElement(seatNum++));
          rowDiv.appendChild(leftGroup);
          rowDiv.appendChild(aisle);
          rowDiv.appendChild(rightGroup);
          container.appendChild(rowDiv);
        }
        // Disable seat selection until bus selected
        const seats = document.querySelectorAll(".seat");
        if (!busSelect.value || busSelect.disabled) {
          seats.forEach((s) => (s.style.pointerEvents = "none"));
        } else {
          seats.forEach((s) => (s.style.pointerEvents = "auto"));
        }
      }

      function createSeatElement(seatNumber) {
        const seatDiv = document.createElement("div");
        seatDiv.className = "seat";
        seatDiv.textContent = seatNumber;
        seatDiv.dataset.seat = seatNumber;
        seatDiv.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!busSelect.value) {
            alert("Please select a bus first.");
            return;
          }
          if (selectedSeat)
            document
              .querySelector(`.seat[data-seat='${selectedSeat}']`)
              .classList.remove("selected");
          selectedSeat = seatNumber;
          seatDiv.classList.add("selected");
        });
        return seatDiv;
      }

      // Price matrix (same as before)
      const priceMatrix = {
        "Douala→Yaoundé": 4500,
        "Yaoundé→Douala": 4500,
        "Douala→Bafoussam": 5500,
        "Bafoussam→Douala": 5500,
        "Douala→Bamenda": 7000,
        "Bamenda→Douala": 7000,
        "Douala→Buea": 3500,
        "Buea→Douala": 3500,
        "Douala→Limbe": 3500,
        "Limbe→Douala": 3500,
        "Douala→Kribi": 4000,
        "Kribi→Douala": 4000,
        "Douala→Garoua": 12000,
        "Garoua→Douala": 12000,
        "Yaoundé→Bafoussam": 5000,
        "Bafoussam→Yaoundé": 5000,
        "Yaoundé→Bamenda": 7500,
        "Bamenda→Yaoundé": 7500,
        "Yaoundé→Buea": 6000,
        "Buea→Yaoundé": 6000,
        "Yaoundé→Limbe": 6500,
        "Limbe→Yaoundé": 6500,
        "Yaoundé→Garoua": 11500,
        "Garoua→Yaoundé": 11500,
        "Bafoussam→Bamenda": 2500,
        "Bamenda→Bafoussam": 2500,
        "Buea→Limbe": 2000,
        "Limbe→Buea": 2000,
        "Buea→Kribi": 5000,
        "Kribi→Buea": 5000,
        "Garoua→Ngaoundéré": 4000,
        "Ngaoundéré→Garoua": 4000,
      };
      function getRoutePrice(origin, dest) {
        if (!origin || !dest) return null;
        if (origin === dest) return 0;
        const key = `${origin}→${dest}`;
        return priceMatrix[key] || priceMatrix[`${dest}→${origin}`] || 6500;
      }
      function updatePriceDisplay() {
        const price = getRoutePrice(originSelect.value, destSelect.value);
        const span = document.getElementById("priceSummary");
        if (
          price &&
          originSelect.value &&
          destSelect.value &&
          originSelect.value !== destSelect.value
        )
          span.innerHTML = `💰 Total: ${price.toLocaleString()} CFA`;
        else if (
          originSelect.value &&
          destSelect.value &&
          originSelect.value === destSelect.value
        )
          span.innerHTML = `⚠️ Origin and destination cannot be the same`;
        else span.innerHTML = `💰 Total: -- CFA (select origin & destination)`;
      }
      originSelect.addEventListener("change", updatePriceDisplay);
      destSelect.addEventListener("change", updatePriceDisplay);
      updatePriceDisplay();

      function getFormData() {
        return {
          fullName: document.getElementById("fullName").value,
          phone: document.getElementById("phone").value,
          origin: originSelect.value,
          destination: destSelect.value,
          departureDate: dateInput.value,
          departureTime: timeSelect.value,
          selectedBus: busSelect.value,
          selectedSeat: selectedSeat,
          price: getRoutePrice(originSelect.value, destSelect.value),
          timestamp: new Date().toISOString(),
        };
      }

      function saveDraft() {
        const data = getFormData();
        if (
          !data.origin ||
          !data.destination ||
          !data.departureDate ||
          !data.departureTime ||
          !data.selectedBus
        ) {
          alert(
            "Please fill route, date, time, and select a bus before saving draft.",
          );
          return;
        }
        // Draft will be saved to backend API
        alert("Booking draft saved!");
      }
      document
        .getElementById("saveDraftBtn")
        .addEventListener("click", saveDraft);

      document.getElementById("bookingForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const data = getFormData();
        if (
          !data.fullName ||
          !data.phone ||
          !data.origin ||
          !data.destination ||
          !data.departureDate ||
          !data.departureTime ||
          !data.selectedBus ||
          !data.selectedSeat
        ) {
          alert("Please fill all fields, select a bus, and choose a seat.");
          return;
        }
        if (data.origin === data.destination) {
          alert("Origin and destination cannot be the same.");
          return;
        }
        if (!data.price) {
          alert("Invalid route.");
          return;
        }
        // Booking data will be sent to backend API
        window.location.href = "gofast-review.html";
      });

      // Resume draft will be handled by backend API
      generateSeats();
      document
        .getElementById("departureDate")
        .setAttribute("min", new Date().toISOString().split("T")[0]);
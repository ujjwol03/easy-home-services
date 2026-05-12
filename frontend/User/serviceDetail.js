document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");

    // Remove top-level redirect to allow unauthenticated users to view the page
    const userInfo = document.querySelector(".user-info");
    if (!token && userInfo) {
        userInfo.style.display = "none";
    }

    // Logout logic with confirmation
    if (logoutLink) {
        logoutLink.addEventListener("click", function (e) {
            e.preventDefault();

            Swal.fire({
                title: 'Are you sure you want to logout?',
                text: "You will be logged out of your account.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Logout',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userRole");
                    Swal.fire(
                        'Logged Out!',
                        'You have been logged out successfully.',
                        'success'
                    ).then(() => {
                        window.location.href = "../index.html";
                    });
                }
            });
        });
    }

    // Get the current date and format it
    const currentDateElement = document.getElementById("current-date");
    const optionsForCurrentDate = { weekday: "short", month: "short", day: "numeric" };
    const bookingDateInput = document.getElementById("booking-date");

    function getTodayStr() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateSelectedDateText(dateStr) {
        if (!dateStr) return;
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(y, m - 1, d);
        currentDateElement.textContent = `Selected: ${dateObj.toLocaleDateString("en-US", optionsForCurrentDate)}`;
    }

    function initDatePicker() {
        const todayStr = getTodayStr();
        if (bookingDateInput) {
            bookingDateInput.min = todayStr;
            bookingDateInput.value = todayStr;
            updateSelectedDateText(todayStr);

            bookingDateInput.addEventListener("change", function () {
                if (this.value) {
                    updateSelectedDateText(this.value);
                    if (this.value === todayStr) {
                        disablePastTimeSlots();
                    } else {
                        enableAllTimeSlots();
                    }
                }
            });
        }
    }

    function disablePastTimeSlots() {
        if (bookingDateInput && bookingDateInput.value !== getTodayStr()) return;

        const now = new Date();
        const startTimeInput = document.getElementById("start-time");
        
        // Add minimal buffer (e.g. 1 hour from now)
        const bufferHour = (now.getHours() + 1) % 24;
        const bufferTime = `${String(bufferHour).padStart(2, '0')}:00`;
        
        if (startTimeInput) {
            startTimeInput.min = bufferTime;
            // Clear start time if it is before minimum
            if (startTimeInput.value && startTimeInput.value < bufferTime) {
                startTimeInput.value = '';
            }
        }
    }

    function enableAllTimeSlots() {
        const startTimeInput = document.getElementById("start-time");
        if (startTimeInput) {
            startTimeInput.removeAttribute("min");
        }
    }

    // Fetch service details and display
    async function fetchServiceDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get("id");

        if (!serviceId) {
            console.error("Service ID is missing from the URL.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/service/${serviceId}`);
            if (!response.ok) throw new Error("Failed to fetch service details.");

            const service = await response.json();
            displayServiceDetails(service);
            fetchStaffByCategory(service.category); // Fetch staff based on service category
        } catch (error) {
            console.error("Error fetching service details:", error);
            alert("Failed to load service details.");
        }
    }

    // Fallback images from /image folder mapped by category name
    const categoryFallbackImages = {
        "plumbing":     "/image/plumbing.jpg",
        "cleaning":     "/image/cleaning.jpg",
        "carpentry":    "/image/carpenting.jpg",
        "carpenting":   "/image/carpenting.jpg",
        "maintenance":  "/image/Maintenance.jpg",
        "installation": "/image/installation.jpg",
        "electrical":   "/image/installation.jpg",
        "painting":     "/image/carpenting.jpg",
    };

    function getFallbackImage(category) {
        const key = (category || "").toLowerCase();
        return categoryFallbackImages[key] || "/image/Repair.jpg";
    }

    // Display service details
    function displayServiceDetails(service) {
        document.querySelector(".service-name").textContent = service.name;
        document.querySelector(".service-category").textContent = service.category;
        document.querySelector(".service-description").textContent = service.description;
        
        // Use local category image directly (backend images are all the same placeholder)
        const imageUrl = getFallbackImage(service.category);
        document.querySelector(".service-image").src = imageUrl;

        const servicePriceElement = document.querySelector(".service-price");
        servicePriceElement.textContent = `Rs. ${service.price}`;
        servicePriceElement.setAttribute("data-price", service.price);
    }

    // Fetch staff based on service category
    async function fetchStaffByCategory(category) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/staff`);
            if (!response.ok) throw new Error("Failed to fetch staff details.");

            const staffList = await response.json();
            const filteredStaff = staffList.filter(staff => staff.category === category);
            populateStaffDropdown(filteredStaff);
        } catch (error) {
            console.error("Error fetching staff:", error);
            alert("Failed to load staff details.");
        }
    }

    // Populate staff dropdown
    function populateStaffDropdown(staffList) {
        const staffDropdown = document.querySelector("#staff-dropdown");
        staffDropdown.innerHTML = ""; // Clear previous options

        if (staffList.length === 0) {
            const option = document.createElement("option");
            option.textContent = "No staff available";
            staffDropdown.appendChild(option);
            return;
        }

        staffList.forEach(staff => {
            const option = document.createElement("option");
            option.value = staff._id;
            option.textContent = staff.name;
            staffDropdown.appendChild(option);
        });
    }

    // Custom Time Helper
    function formatTo12Hour(time24) {
        if (!time24) return "";
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${period}`;
    }

    const startTimeInput = document.getElementById("start-time");
    const endTimeInput = document.getElementById("end-time");

    // Payment modal and booking process
    const paymentModal = document.getElementById("payment-modal");
    const closeModal = paymentModal.querySelector(".close-btn");
    const confirmPayment = paymentModal.querySelector(".confirm-payment");

    // Book Now button event listener with validation for selected date, time, and staff
    document.querySelector(".book-button").addEventListener("click", () => {
        if (!token) {
            Swal.fire({
                icon: 'info',
                title: 'Login Required',
                text: 'Please login first to book a service.',
                confirmButtonText: 'Login'
            }).then(() => {
                window.location.href = "../index.html?action=login";
            });
            return;
        }

        const selectedDate = currentDateElement.textContent.replace("Selected: ", "").trim();
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const selectedStaff = document.querySelector("#staff-dropdown").value;

        if (selectedDate && startTime && endTime && selectedStaff) {
            // Validation: End time must be after start time
            if (startTime >= endTime) {
                Swal.fire({
                    icon: "warning",
                    title: "Invalid Time Range",
                    text: "The 'To' time must be after the 'From' time.",
                });
                return;
            }
            paymentModal.style.display = "flex";
        } else {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Selection",
                text: "Please select a date, custom time range, and staff before proceeding with the booking.",
            });
        }
    });

    // Close payment modal
    closeModal.addEventListener("click", () => paymentModal.style.display = "none");

    window.addEventListener("click", (event) => {
        if (event.target === paymentModal) {
            paymentModal.style.display = "none";
        }
    });

    // Confirm payment
    confirmPayment.addEventListener("click", async () => {
        const selectedDateText = currentDateElement.textContent.replace("Selected: ", "").trim();
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const selectedStaff = document.querySelector("#staff-dropdown").value;
        const serviceId = new URLSearchParams(window.location.search).get("id");

        const formattedTimeSlot = `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;

        const paymentData = {
            serviceId,
            userId: localStorage.getItem("userId"),
            date: selectedDateText,
            timeSlot: formattedTimeSlot,
            staffId: selectedStaff
        };

        try {
            // Show a loading state on the button
            const originalButtonText = confirmPayment.textContent;
            confirmPayment.textContent = "Initiating Payment...";
            confirmPayment.disabled = true;

            const response = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentData),
            });

            const result = await response.json();

            if (response.ok && result.payment_url) {
                // Redirect to Khalti payment page
                window.location.href = result.payment_url;
            } else {
                // Show backend error message and close modal
                confirmPayment.textContent = originalButtonText;
                confirmPayment.disabled = false;
                Swal.fire({
                    icon: "error",
                    title: "Payment Initiation Failed",
                    text: result.error || "An error occurred while initiating your payment.",
                }).then(() => {
                    paymentModal.style.display = "none";
                });
            }
        } catch (err) {
            // Show network error and close modal
            confirmPayment.textContent = "Proceed to Pay";
            confirmPayment.disabled = false;
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to connect to the payment server. Please try again later.",
            }).then(() => {
                paymentModal.style.display = "none";
            });
        }
    });

    // Ensure payment status is checked when page is loaded
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const serviceName = urlParams.get("serviceName");
    const timeSlot = urlParams.get("timeSlot");
    const date = urlParams.get("date");

    if (paymentStatus === "success" && serviceName && timeSlot && date) {
        setTimeout(() => {
            Swal.fire({
                icon: "success",
                title: "Payment Successful!",
                html:
                    `<p><strong>Service:</strong> ${decodeURIComponent(serviceName)}</p>
                    <p><strong>Date:</strong> ${decodeURIComponent(date)}</p>
                    <p><strong>Time Slot:</strong> ${decodeURIComponent(timeSlot)}</p>
                    <p>Your booking has been confirmed.</p>`,
                confirmButtonText: "OK"
            }).then(() => {
                // Redirect to userBooking.html after clicking OK
                window.location.href = "userBookings.html";
            });
        }, 500);
    } else if (paymentStatus === "failed") {
        setTimeout(() => {
            Swal.fire({
                icon: "error",
                title: "Payment Failed!",
                text: "Something went wrong. Please try again.",
                confirmButtonText: "OK"
            }).then(() => {
                // Redirect to userBooking.html even on failure
                window.location.href = "userBookings.html";
            });
        }, 500);
    }

    // Ensure back button doesn't redirect to the payment page again
    window.history.pushState({}, document.title, window.location.pathname + `?id=${urlParams.get("id")}`);

    initDatePicker();
    disablePastTimeSlots();
    fetchServiceDetails();
});
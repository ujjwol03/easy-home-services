document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector(".search-input");
    const statusFilter = document.getElementById("statusFilter");
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");
    const API_BASE_URL = "http://localhost:3000";

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function fetchWithRetry(url, options = {}, retries = 3, timeout = 5000) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        Authorization: `Bearer ${token}`
                    },
                    signal: controller.signal,
                });
                clearTimeout(id);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `Server error: ${response.status}`);
                return data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    function showAlert(title, onConfirm = null) {
        if (onConfirm) {
            Swal.fire({
                title: title,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) onConfirm();
            });
        } else {
            Swal.fire({ title: title, icon: 'info' });
        }
    }

    let currentStaffId = null;
    let existingImagePath = "";
    let currentPage = 1;
    const staffPerPage = 4;
    let isFetching = false;

    // Redirect if no token found with SweetAlert
    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = "../index.html";
        });
        return;
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

    // Debounced search
    const debouncedFetchStaff = debounce(() => {
        fetchStaff();
    }, 300);

    searchInput.addEventListener("input", function () {
        currentPage = 1;
        debouncedFetchStaff();
    });

    statusFilter.addEventListener("change", function () {
        currentPage = 1;
        fetchStaff();
    });

    // Fetch staff
    async function fetchStaff() {
        if (isFetching) return;
        isFetching = true;

        const searchQuery = searchInput.value.trim().toLowerCase();
        const filterStatus = statusFilter.value; // 'approved' or 'pending'

        try {
            const staff = await fetchWithRetry(`${API_BASE_URL}/api/staff`);
            const tableBody = document.querySelector(".staff-table tbody");
            const noDataRow = document.getElementById("noDataRow");
            const paginationControls = document.getElementById("paginationControls");

            tableBody.innerHTML = "";

            const filteredStaff = staff.filter(s => {
                const matchesSearch = s.name.toLowerCase().includes(searchQuery) ||
                                      (s.phone && s.phone.toLowerCase().includes(searchQuery)) ||
                                      (s.category && s.category.toLowerCase().includes(searchQuery));
                
                const matchesStatus = (filterStatus === 'approved') ? s.isApproved === true : s.isApproved === false;

                return matchesSearch && matchesStatus;
            });

            if (filteredStaff.length === 0) {
                noDataRow.style.display = "block";
                paginationControls.style.display = "none";
            } else {
                noDataRow.style.display = "none";
                paginationControls.style.display = "block";

                const startIndex = (currentPage - 1) * staffPerPage;
                const endIndex = startIndex + staffPerPage;
                const staffToDisplay = filteredStaff.slice(startIndex, endIndex);

                staffToDisplay.forEach((s, index) => {
                    const row = document.createElement("tr");

                    let actionsHtml = "";
                    if (filterStatus === 'pending') {
                        actionsHtml = `
                            <button class="approve-button" data-id="${s._id}" style="background-color: #28a745; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; margin-right: 5px;"><i class="fa-solid fa-check"></i> Approve</button>
                            <button class="decline-button" data-id="${s._id}" style="background-color: #d9534f; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer;"><i class="fa-solid fa-x"></i> Decline</button>
                        `;
                    } else {
                        actionsHtml = `
                            <button class="delete-button" data-id="${s._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                        `;
                    }

                    row.innerHTML = `
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <div class="staff-name">
                                ${s.profileImage ? `<img src="${API_BASE_URL}/${s.profileImage}" alt="${s.name}" class="staff-image" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<i class="fa-solid fa-user-circle" style="font-size: 40px; color: #ccc; margin-right: 10px;"></i>'}
                                <span>${s.name} <br><small style="color: #666;">${s.email}</small></span>
                            </div>
                        </td>
                        <td>
                            ${s.image ? `<a href="${API_BASE_URL}/${s.image}" target="_blank" class="certificate-link" style="color: #007bff; text-decoration: none; font-size: 14px;"><i class="fa-solid fa-file-image"></i> View Certificate</a>` : 'No Certificate'}
                        </td>
                        <td>${s.phone || 'N/A'}</td>
                        <td>${s.category}</td>
                        <td>${s.address || 'N/A'}</td>
                        <td>
                            <div class="actions-container">
                                ${actionsHtml}
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                updatePaginationControls(filteredStaff.length);

                // Attach Action Listeners
                if (filterStatus === 'pending') {
                    document.querySelectorAll(".approve-button").forEach(button => {
                        button.addEventListener("click", function () {
                            const staffId = button.getAttribute("data-id");
                            handleStaffApproval(staffId, true);
                        });
                    });
                    document.querySelectorAll(".decline-button").forEach(button => {
                        button.addEventListener("click", function () {
                            const staffId = button.getAttribute("data-id");
                            handleStaffApproval(staffId, false);
                        });
                    });
                } else {
                    document.querySelectorAll(".delete-button").forEach(button => {
                        button.addEventListener("click", function () {
                            const staffId = button.getAttribute("data-id");
                            showAlert("Are you sure you want to delete this staff?", () => {
                                fetchWithRetry(`${API_BASE_URL}/api/delete-staff/${staffId}`, {
                                    method: "DELETE",
                                })
                                .then(data => {
                                    showAlert(data.message || "Staff deleted successfully", () => {
                                        if (filteredStaff.length - 1 <= (currentPage - 1) * staffPerPage) {
                                            currentPage = Math.max(1, currentPage - 1);
                                        }
                                        fetchStaff();
                                    });
                                })
                                .catch(error => showAlert(error.message || "Failed to delete staff"));
                            });
                        });
                    });
                }
            }
        } catch (error) {
            showAlert(error.message || "Error fetching staff");
        } finally {
            isFetching = false;
        }
    }

    async function handleStaffApproval(staffId, isApprove) {
        const actionText = isApprove ? "approve" : "decline";
        
        Swal.fire({
            title: `Are you sure you want to ${actionText} this staff?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionText}`,
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Show loading state
                Swal.fire({
                    title: isApprove ? 'Approving...' : 'Declining...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                fetchWithRetry(`${API_BASE_URL}/api/staff/${staffId}/approve`, {
                    method: "PUT",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approve: isApprove })
                }).then(data => {
                    Swal.fire(
                        isApprove ? 'Approved!' : 'Declined!',
                        data.message || `Staff has been ${actionText}d.`,
                        'success'
                    ).then(() => fetchStaff());
                }).catch(error => {
                    Swal.fire('Error', error.message || `Failed to ${actionText} staff`, 'error');
                });
            }
        });
    }

    // Update pagination controls
    function updatePaginationControls(totalStaff) {
        const totalPages = Math.ceil(totalStaff / staffPerPage);
        document.getElementById("pageNumber").textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById("prevBtn").disabled = currentPage === 1;
        document.getElementById("nextBtn").disabled = currentPage === totalPages;
    }

    // Pagination controls
    document.getElementById("prevBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            fetchStaff(searchInput.value.trim().toLowerCase());
        }
    });

    document.getElementById("nextBtn").addEventListener("click", function () {
        currentPage++;
        fetchStaff(searchInput.value.trim().toLowerCase());
    });

    // Initial fetch
    fetchStaff();
});
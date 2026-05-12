document.addEventListener('DOMContentLoaded', function () {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");
    const staffNameDisplay = document.getElementById('staffName');
    
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const passwordModal = document.getElementById("passwordModal");
    const cancelPasswordChange = document.getElementById("cancelPasswordChange");
    const submitPasswordChange = document.getElementById("submitPasswordChange");

    const editProfileBtn = document.getElementById("editProfileBtn");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const uploadPicBtn = document.getElementById("upload-pic-btn");
    const fileInput = document.getElementById("profile-pic-input");

    const usernameInput = document.getElementById("username");
    const addressInput = document.getElementById("address");
    const phoneInput = document.getElementById("phone");
    const imagePreview = document.getElementById("image-preview");

    let originalData = {};

    // Active menu item highlighting
    const currentPage = window.location.pathname.split("/").pop();
    const menuItems = document.querySelectorAll('.sidebar ul li a');

    menuItems.forEach(item => {
        if (item.getAttribute('href').includes(currentPage)) {
            item.parentElement.classList.add('active');
        } else {
            item.parentElement.classList.remove('active');
        }
    });

    // Redirect if no token or incorrect role
    if (!token || !userId || userRole !== 'staff') {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login as a staff member to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = "/index.html";
        });
        return;
    }

    // Edit Mode Toggling
    editProfileBtn.addEventListener("click", () => {
        toggleEditMode(true);
    });

    cancelEditBtn.addEventListener("click", () => {
        // Restore original data
        usernameInput.value = originalData.name;
        addressInput.value = originalData.address;
        const displayImage = originalData.profileImage || '';
        imagePreview.src = displayImage ? `${API_BASE_URL}/${displayImage}` : '/image/default-staff.png';
        toggleEditMode(false);
    });

    function toggleEditMode(isEditing) {
        usernameInput.disabled = !isEditing;
        addressInput.disabled = !isEditing;
        
        if (isEditing) {
            editProfileBtn.style.display = "none";
            saveProfileBtn.classList.remove("hidden");
            saveProfileBtn.style.display = "inline-block";
            cancelEditBtn.classList.remove("hidden");
            cancelEditBtn.style.display = "inline-block";
            uploadPicBtn.style.display = "block";
        } else {
            editProfileBtn.style.display = "inline-block";
            saveProfileBtn.style.display = "none";
            cancelEditBtn.style.display = "none";
            uploadPicBtn.style.display = "none";
        }
    }

    // Photo Upload Trigger
    uploadPicBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save Changes
    saveProfileBtn.addEventListener("click", async () => {
        const name = usernameInput.value.trim();
        const address = addressInput.value.trim();

        if (!name || !address) {
            Swal.fire("Error", "Name and Address are required.", "error");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("address", address);
        if (fileInput.files[0]) {
            formData.append("profileImage", fileInput.files[0]);
        }

        try {
            Swal.fire({
                title: 'Updating Profile...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`${API_BASE_URL}/api/update-staff/${userId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire("Success", "Profile updated successfully!", "success");
                originalData.name = name;
                originalData.address = address;
                if (data.staff && data.staff.profileImage) {
                    originalData.profileImage = data.staff.profileImage;
                }
                staffNameDisplay.textContent = name;
                toggleEditMode(false);
            } else {
                Swal.fire("Error", data.error || "Update failed", "error");
            }
        } catch (error) {
            console.error("Update error:", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Logout logic
    if (logoutLink) {
        logoutLink.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                title: 'Are you sure?',
                text: "You will be logged out.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Logout'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = "/index.html";
                }
            });
        });
    }

    // Fetch and display staff data
    async function fetchStaffData(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/staff/${userId}`);
            const staffData = await response.json();

            if (response.ok) {
                originalData = staffData;
                usernameInput.value = staffData.name || '';
                phoneInput.value = staffData.phone || '';
                addressInput.value = staffData.address || '';
                document.getElementById('category').value = staffData.categoryId?.name || staffData.category || '';
                
                const displayImage = staffData.profileImage || '';
                imagePreview.src = displayImage ? `${API_BASE_URL}/${displayImage}` : '/image/default-staff.png';
                staffNameDisplay.textContent = staffData.name || 'Staff';
            } else {
                Swal.fire("Error", staffData.error || "Failed to fetch data", "error");
            }
        } catch (error) {
            console.error('Error fetching staff data:', error);
        }
    }

    fetchStaffData(userId);

    // Password change logic
    changePasswordBtn.addEventListener("click", () => {
        passwordModal.classList.remove("hidden");
    });

    cancelPasswordChange.addEventListener("click", () => {
        passwordModal.classList.add("hidden");
    });

    submitPasswordChange.addEventListener("click", async () => {
        const oldPassword = document.getElementById("oldPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            Swal.fire("Error", "All fields are required", "error");
            return;
        }

        if (newPassword.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            Swal.fire("Error", "Password too weak", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire("Error", "Passwords don't match", "error");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/update-staff-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    staffId: userId,
                    phone: phoneInput.value,
                    oldPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                Swal.fire("Success", data.message, "success");
                passwordModal.classList.add("hidden");
            } else {
                Swal.fire("Error", data.error || "Update failed", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', () => {
            const inputId = icon.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });
});
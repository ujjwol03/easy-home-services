document.addEventListener("DOMContentLoaded", () => {
    const staffRegisterForm = document.getElementById("staff-register-form");
    const categoryDropdown = document.getElementById("staff-category");
    const imageInput = document.getElementById("staff-photo");
    const imagePreview = document.getElementById("staff-photo-preview");

    if (categoryDropdown) {
        fetchCategories();
    }

    if (imageInput) {
        imageInput.addEventListener("change", function () {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                };
                reader.readAsDataURL(file);
            } else {
                imagePreview.src = "";
                imagePreview.style.display = "none";
            }
        });
    }

    if (staffRegisterForm) {
        staffRegisterForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const firstName = document.getElementById("staff-first-name").value;
            const lastName = document.getElementById("staff-last-name").value;
            const name = firstName + " " + lastName;
            const email = document.getElementById("staff-email").value;
            const phone = document.getElementById("staff-phone").value;
            const address = document.getElementById("staff-address").value;
            const categoryName = document.getElementById("staff-category").value;
            const image = document.getElementById("staff-photo").files[0];
            const password = document.getElementById("staff-password").value;
            const confirmPassword = document.getElementById("staff-confirm-password").value;

            if (!firstName || !lastName || !email || !phone || !address || !categoryName || !image || !password || !confirmPassword) {
                Swal.fire({
                    icon: "error",
                    title: "Missing Information",
                    text: "Please fill out all fields, including your password and certificate proof.",
                });
                return;
            }

            if (password !== confirmPassword) {
                Swal.fire({
                    icon: "error",
                    title: "Password Mismatch",
                    text: "Passwords do not match. Please try again.",
                });
                return;
            }

            // Password validation
            if (password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                Swal.fire({
                    icon: "error",
                    title: "Invalid Password",
                    text: "Password must be at least 8 characters and contain a special character.",
                });
                return;
            }

            // Phone validation
            const phoneRegex = /^(97|98)\d{8}$/;
            if (!phoneRegex.test(phone)) {
                Swal.fire({
                    icon: "error",
                    title: "Invalid Phone",
                    text: "Phone number must start with 97 or 98 and be exactly 10 digits.",
                });
                return;
            }

            const formData = new FormData();
            formData.append("name", name);
            formData.append("email", email);
            formData.append("phone", phone);
            formData.append("address", address);
            formData.append("categoryName", categoryName);
            formData.append("image", image);
            formData.append("password", password);

            try {
                Swal.fire({
                    title: 'Submitting Application...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const response = await fetch(`${API_BASE_URL}/api/staff/register`, {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Application Submitted!",
                        text: "Your application has been received and is pending admin approval.",
                        confirmButtonText: "Close"
                    }).then(() => {
                        staffRegisterForm.reset();
                        imagePreview.style.display = "none";
                        toggleOverlay('login'); // Close the form
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Registration Failed",
                        text: data.error || "An error occurred while submitting your application.",
                    });
                }
            } catch (error) {
                console.error("Error during staff registration:", error);
                Swal.fire({
                    icon: "error",
                    title: "Server Error",
                    text: "Failed to connect to the server. Please try again later.",
                });
            }
        });
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            const categories = await response.json();
            
            if (response.ok && categories.length > 0) {
                categoryDropdown.innerHTML = '<option value="">Select Category</option>';
                categories.forEach(category => {
                    const option = document.createElement("option");
                    option.value = category.name;
                    option.textContent = category.name;
                    categoryDropdown.appendChild(option);
                });
            } else {
                categoryDropdown.innerHTML = '<option value="">No Categories Available</option>';
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            categoryDropdown.innerHTML = '<option value="">Failed to load categories</option>';
        }
    }
});

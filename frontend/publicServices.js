document.addEventListener("DOMContentLoaded", function () {
    const servicesContainer = document.querySelector("#services .card-list");

    // Fallback images from /image folder mapped by category name (case-insensitive)
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

    // Fetch services
    function fetchServices() {
        fetch(`${API_BASE_URL}/api/services`)
            .then(response => response.json())
            .then(data => {
                renderServices(data);
            })
            .catch(error => {
                console.error("Error fetching services:", error);
                servicesContainer.innerHTML = "<p style='text-align:center;'>Failed to load services.</p>";
            });
    }

    function truncateWords(text, wordLimit) {
        if (!text) return "";
        const words = text.split(" ");
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(" ") + " ....";
        }
        return text;
    }

    function renderServices(services) {
        servicesContainer.innerHTML = "";

        if (services.length === 0) {
            servicesContainer.innerHTML = "<p style='text-align:center; width:100%;'>No services available.</p>";
            return;
        }

        services.forEach(service => {
            // Use local category image directly (backend images are all the same placeholder)
            const imageUrl = getFallbackImage(service.category);
            const serviceCard = document.createElement("li");
            serviceCard.classList.add("card-item", "swiper-slide");

            serviceCard.innerHTML = `
                <div class="card-link" style="display:flex; flex-direction:column; align-items:center;">
                    <img src="${imageUrl}" alt="${service.name}" class="card-image" style="cursor: pointer;">
                    <p class="badge">${service.category}</p>
                    <h3 class="service-name" style="cursor: pointer; font-size: 1.2rem; font-weight: 600; margin: 10px 0;">${service.name}</h3>
                    <p class="card-title" style="cursor: pointer; text-align: center;">${truncateWords(service.description, 10)}</p>
                    <button class="book-now-button" style="margin-top: auto;">Book Now</button>
                </div>
            `;

            const handleServiceClick = () => {
                window.location.href = `User/serviceDetail.html?id=${service._id}`;
            };

            serviceCard.querySelector(".card-image").addEventListener("click", handleServiceClick);
            serviceCard.querySelector(".service-name").addEventListener("click", handleServiceClick);
            serviceCard.querySelector(".card-title").addEventListener("click", handleServiceClick);
            serviceCard.querySelector(".book-now-button").addEventListener("click", handleServiceClick);

            servicesContainer.appendChild(serviceCard);
        });
    }

    fetchServices();
});

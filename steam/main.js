document.addEventListener("DOMContentLoaded", () => {
    const carousels = document.querySelectorAll(".carousel");
    const content = document.querySelector(".content");
    const form = document.querySelector("form");
    const emailInput = form.querySelector("#EMAIL");
    const originInput = form.querySelector("#group");
    const hpInput = form.querySelector("#b_e7f83e702318920efe670e9b1_597f4b8abc");
    const allInputs = form.querySelectorAll("input");
    const statusMessage = form.querySelector("#status-message");
    const qrPanel = document.querySelector(".qr-panel");
    let device; // device type, gets populated "mobile" or "desktop" by the resize handler

    // Checking for "confirmed" parameter when users confirm their email
    // It runs once and then it's done, hence the IIFE
    (() => {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Check if the "?confirmed" parameter is present
        if (urlParams.has("confirmed")) {
            form.className = "submit-completed";
            statusMessage.innerHTML = "Thanks for confirming your email and <nobr>75% launch discount!</nobr>";
        }
    })();

    let carouselCleanup = null;

    const scheduleCarouselStart = (preCarousel, carousel) => {
        if (carouselCleanup) {
            carouselCleanup();
        }

        let started = false;
        let fallbackTimeout;
        let revealTimeout;
        let swapTimeout;

        const startSequence = () => {
            if (started) return;
            started = true;

            clearTimeout(fallbackTimeout);
            carousel.preload = "auto";

            // 2950ms represents 2 seconds 59 frames of a 60fps video, meaning one frame short of exactly 3 seconds
            swapTimeout = setTimeout(() => {
                preCarousel.setAttribute("style", "z-index: -1;");
                carousel.play().catch(() => {});
            }, 2950);

            // 2250ms felt right to start animating the content reveal, given the carousel animation timing
            revealTimeout = setTimeout(() => {
                content.classList.add("reveal");
            }, 2250);
        };

        const onCanPlayThrough = () => startSequence();

        preCarousel.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
        fallbackTimeout = setTimeout(startSequence, 5000);

        carouselCleanup = () => {
            clearTimeout(fallbackTimeout);
            clearTimeout(revealTimeout);
            clearTimeout(swapTimeout);
            preCarousel.removeEventListener("canplaythrough", onCanPlayThrough);
        };
    };

    const resizeHandler = () => {
        // Capture previous device type. When this runs for the first time it populates prevDevice as null.
        const prevDevice = device;

        // Check the current browser width and toggle the device type accordingly
        device = window.innerWidth < 640 ? "mobile" : "desktop";

        // If there's a change between previous and current device type
        if (device !== prevDevice) {
            // Set the body class
            document.body.className = device;

            const preCarousel = document.querySelector(".carousel-pre." + device);
            const carousel = document.querySelector(".carousel." + device);

            if (!preCarousel || !carousel) return;

            content.classList.remove("reveal");
            preCarousel.removeAttribute("style");

            // Get the main carousel ready...
            carousel.preload = "metadata";

            // Play the pre-carousel associated with the current device
            preCarousel.preload = "auto";
            preCarousel.play().catch(() => {});

            scheduleCarouselStart(preCarousel, carousel);
        }
    };

    // Debounce function
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Using debounce with the resize handler
    window.addEventListener("resize", debounce(resizeHandler, 100));
    resizeHandler();

    // Video play/pause on tap or click
    carousels.forEach(carousel => {
        carousel.addEventListener("click", () => carousel.paused ? carousel.play() : carousel.pause());
    });

    // Event listeners for the logo click, and the close-btn click, for the QR panel
    document.querySelector("#logo").addEventListener("click", () => {
        qrPanel.classList.add("qr-shown");
        document.body.classList.add("qr-shown");
    });
    document.querySelector("#close-btn").addEventListener("click", () => {
        qrPanel.classList.remove("qr-shown");
        document.body.classList.remove("qr-shown");
    });

    form.addEventListener("submit", event => {
        // Prevent default form submission
        event.preventDefault();

        // Validate email address
        const emailValue = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // "Simple" email pattern

        if (!emailRegex.test(emailValue)) {
            // If the email does not match the pattern, display an error message
            statusMessage.innerHTML = "Please enter a valid email address.";
            // Stop the form submission
            return;
        }

        // Get the Submit URL from the <form>
        let url = form.getAttribute("action");

        // This URL change makes MailChimp's post action output in JSON
        url = url.replace("/post?u=", "/post-json?u=");

        // This constructs the rest of the URL with the form inputs and values
        // The added "c=displayMailChimpStatus" makes MailChimp output a JS call to displayMailChimpStatus() with an argument, formed as an object, containing the results
        url += "&" + encodeURIComponent(emailInput.name) + "=" + encodeURIComponent(emailInput.value) + "&" + encodeURIComponent(originInput.name) + "=" + encodeURIComponent(originInput.value) + "&" + encodeURIComponent(hpInput.name) + "=" + encodeURIComponent(hpInput.value) + "&c=displayMailChimpStatus";

        // Remove focus from any inputs
        document.activeElement.blur();

        // Disable all form inputs
        allInputs.forEach(input => input.disabled = true);
        form.className = "submit-in-progress";

        // Inject a script with the output from the post action
        // i.e. If all goes well, the post action should output "displayMailChimpStatus({"result":"success","msg":"Thank you for subscribing!"})"
        const script = window.document.createElement("script");
        script.src = url;

        // Insert script tag into the DOM (append to <head>)
        const ref = window.document.getElementsByTagName("script")[0];
        ref.parentNode.insertBefore(script, ref);

        console.log(url);

        // After the script is loaded (and executed), remove it
        script.onload = function () {
            this.remove();
        };
    });

    // Process the form action output arguments from MailChimp
    window.displayMailChimpStatus = (data) => {
        // Make sure the data is in the right format
        if (!data.result || !data.msg) return;

        // Check if the message contains "thank you" (case insensitive)
        const thankYouRegex = /thank you/i;
        const containsThankYou = thankYouRegex.test(data.msg);

        // Choose an appropriate action based on the presence of "thank you"
        if (containsThankYou) {
            // Display a custom status message
            statusMessage.innerHTML = "To complete the subscription process, please click the confirmation link in the email we just sent.";
        } else {
            // Output the raw endpoint status message
            statusMessage.innerHTML = data.msg;
        }

        // If successful, set the appropriate class to the form;
        // otherwise, re-enable all form inputs and reset the form class
        if (data.result === "success") {
            form.className = "submit-completed";
        }
        else {
            allInputs.forEach(input => input.disabled = false);
            form.className = "";
        }
    };
});

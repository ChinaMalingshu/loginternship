(() => {
  const body = document.body;
  if (!body) return;

  const apiBase = body.dataset.apiBase || "http://localhost:8000";
  const forms = document.querySelectorAll("[data-auth-form]");
  if (!forms.length) return;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[+\d\s()-]{7,20}$/;
  const namePattern = /^[A-Za-z]+$/;
  const todayISO = new Date().toISOString().split("T")[0];

  document.querySelectorAll('input[name="dob"]').forEach((input) => {
    if (!input.max) input.max = todayISO;
  });

  const setAlert = (form, message, variant = "error") => {
    const alert = form.querySelector(".form-alert");
    if (!alert) return;
    alert.textContent = message;
    alert.hidden = false;
    if (variant === "success") {
      alert.classList.add("success");
    } else {
      alert.classList.remove("success");
    }
  };

  const clearAlert = (form) => {
    const alert = form.querySelector(".form-alert");
    if (!alert) return;
    alert.hidden = true;
    alert.textContent = "";
    alert.classList.remove("success");
  };

  const setFieldError = (input, message) => {
    const field = input.closest(".field");
    if (!field) return;
    let errorEl = field.querySelector(".error-text");
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "error-text";
      field.appendChild(errorEl);
    }
    errorEl.textContent = message;
    input.classList.add("error");
  };

  const clearFieldError = (input) => {
    input.classList.remove("error");
    const field = input.closest(".field");
    if (!field) return;
    const errorEl = field.querySelector(".error-text");
    if (errorEl) {
      errorEl.remove();
    }
  };

  const clearAllErrors = (form) => {
    form.querySelectorAll(".field input").forEach(clearFieldError);
  };

  const toggleSubmitting = (form, submitting) => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = submitting;
  };

  const handleLogin = async (form) => {
    const data = new FormData(form);
    const identifier = (data.get("identifier") || "").toString().trim();
    const password = (data.get("password") || "").toString();

    let hasError = false;

    const identifierInput = form.querySelector('input[name="identifier"]');
    const passwordInput = form.querySelector('input[name="password"]');

    if (!identifier) {
      hasError = true;
      identifierInput && setFieldError(identifierInput, "Please enter your email.");
    } else if (!emailPattern.test(identifier)) {
      hasError = true;
      identifierInput && setFieldError(identifierInput, "That email does not look right.");
    }

    if (!password) {
      hasError = true;
      passwordInput && setFieldError(passwordInput, "Please enter your password.");
    } else if (password.length < 8) {
      hasError = true;
      passwordInput && setFieldError(passwordInput, "Password must be at least 8 characters.");
    }

    if (hasError) return;

    toggleSubmitting(form, true);

    try {
      const response = await fetch(`${apiBase}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          (payload && typeof payload.detail === "string" && payload.detail) ||
          "Unable to sign in.";

        setAlert(form, message);

        if (!message.toLowerCase().includes("credential")) {
          if (message.toLowerCase().includes("email")) {
            identifierInput && setFieldError(identifierInput, message);
          } else {
            passwordInput && setFieldError(passwordInput, message);
          }
        }
        return;
      }

      form.reset();
      const rememberCheckbox = form.querySelector('input[name="remember"]');
      if (rememberCheckbox) {
        rememberCheckbox.checked = false;
      }

      if (payload && payload.user) {
        sessionStorage.setItem("user_profile", JSON.stringify(payload.user));
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setAlert(form, "Network error. Please try again.");
    } finally {
      toggleSubmitting(form, false);
    }
  };

  const handleRegister = async (form) => {
    const data = new FormData(form);
    const firstName = (data.get("firstName") || "").toString().trim();
    const lastName = (data.get("lastName") || "").toString().trim();
    const dob = (data.get("dob") || "").toString();
    const mobile = (data.get("mobile") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const password = (data.get("password") || "").toString();
    const confirmPassword = (data.get("confirmPassword") || "").toString();

    let hasError = false;

    const firstNameInput = form.querySelector('input[name="firstName"]');
    const lastNameInput = form.querySelector('input[name="lastName"]');
    const dobInput = form.querySelector('input[name="dob"]');
    const mobileInput = form.querySelector('input[name="mobile"]');
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const confirmInput = form.querySelector('input[name="confirmPassword"]');

    if (!firstName) {
      hasError = true;
      firstNameInput && setFieldError(firstNameInput, "First name is required.");
    } else if (!namePattern.test(firstName)) {
      hasError = true;
      firstNameInput &&
        setFieldError(firstNameInput, "First name may only contain letters.");
    }

    if (!lastName) {
      hasError = true;
      lastNameInput && setFieldError(lastNameInput, "Last name is required.");
    } else if (!namePattern.test(lastName)) {
      hasError = true;
      lastNameInput &&
        setFieldError(lastNameInput, "Last name may only contain letters.");
    }

    if (!dob) {
      hasError = true;
      dobInput && setFieldError(dobInput, "Date of birth is required.");
    } else if (new Date(dob) > new Date(todayISO)) {
      hasError = true;
      dobInput && setFieldError(dobInput, "Date of birth cannot be in the future.");
    }

    if (mobile && !phonePattern.test(mobile)) {
      hasError = true;
      mobileInput && setFieldError(mobileInput, "Enter a valid mobile number.");
    }

    if (!email) {
      hasError = true;
      emailInput && setFieldError(emailInput, "Email is required.");
    } else if (!emailPattern.test(email)) {
      hasError = true;
      emailInput && setFieldError(emailInput, "Enter a valid email address.");
    }

    if (!password) {
      hasError = true;
      passwordInput && setFieldError(passwordInput, "Password is required.");
    } else if (password.length < 8) {
      hasError = true;
      passwordInput && setFieldError(passwordInput, "Password must be at least 8 characters.");
    }

    if (!confirmPassword) {
      hasError = true;
      confirmInput && setFieldError(confirmInput, "Please confirm your password.");
    } else if (confirmPassword !== password) {
      hasError = true;
      confirmInput && setFieldError(confirmInput, "Passwords do not match.");
    }

    if (hasError) return;

    toggleSubmitting(form, true);

    try {
      const response = await fetch(`${apiBase}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          dob: dob || null,
          mobile: mobile || null,
          email,
          password,
        }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          (payload && typeof payload.detail === "string" && payload.detail) ||
          "Registration failed.";

        const lowered = message.toLowerCase();

      if (lowered.includes("name")) {
        firstNameInput && setFieldError(firstNameInput, message);
        lastNameInput && setFieldError(lastNameInput, message);
      } else if (lowered.includes("mobile")) {
        mobileInput && setFieldError(mobileInput, message);
      } else if (lowered.includes("email")) {
        emailInput && setFieldError(emailInput, message);
      } else if (lowered.includes("password")) {
        passwordInput && setFieldError(passwordInput, message);
      } else {
        confirmInput && setFieldError(confirmInput, message);
      }
      setAlert(form, message);
      return;
      }

      form.reset();
      setAlert(form, "Registration successful! Redirecting…", "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
    } catch (error) {
      setAlert(form, "Network error. Please try again.");
    } finally {
      toggleSubmitting(form, false);
    }
  };

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearAlert(form);
      clearAllErrors(form);

      const mode = form.dataset.authForm;
      if (mode === "login") {
        handleLogin(form);
      } else if (mode === "register") {
        handleRegister(form);
      }
    });
  });
})();

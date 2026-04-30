/**
 * Validation Utilities for Artisan Settings
 * Provides real-time validation functions for all input fields
 */

// Ethiopian phone format: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, 07XXXXXXXX
export const validateEthiopianPhone = (phone) => {
  if (!phone) return { valid: false, error: "" };

  const phoneRegex = /^(\+2519|\+2517|09|07)\d{8}$/;

  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      error:
        "Please enter a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)",
    };
  }

  return { valid: true, error: "" };
};

// Account holder name: min 3 chars, letters only
export const validateAccountHolderName = (name) => {
  if (!name) return { valid: false, error: "" };

  if (name.length < 3) {
    return {
      valid: false,
      error: "Account holder name must be at least 3 characters",
    };
  }

  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return {
      valid: false,
      error:
        "Account holder name must contain only letters (no numbers or special characters)",
    };
  }

  return { valid: true, error: "" };
};

// Bank name: must be from predefined list
export const VALID_BANKS = [
  "Commercial Bank of Ethiopia (CBE)",
  "Abyssinia Bank",
  "Awash Bank",
  "Dashen Bank",
  "Bank of Abyssinia",
  "Wegagen Bank",
  "United Bank",
  "Nib International Bank",
  "Cooperative Bank of Oromia",
  "Lion International Bank",
  "Oromia International Bank",
  "Zemen Bank",
  "Bunna International Bank",
  "Berhan International Bank",
  "Abay Bank",
  "Addis International Bank",
  "Debub Global Bank",
  "Enat Bank",
  "Gadaa Bank",
  "Hijra Bank",
  "Shabelle Bank",
  "Siinqee Bank",
  "Tsehay Bank",
  "Telebirr",
];

export const validateBankName = (bankName) => {
  if (!bankName) return { valid: false, error: "" };

  if (!VALID_BANKS.includes(bankName)) {
    return {
      valid: false,
      error: "Please select a valid bank from the dropdown list",
    };
  }

  return { valid: true, error: "" };
};

// Account number: numeric only, 10-15 digits
export const validateAccountNumber = (accountNumber) => {
  if (!accountNumber) return { valid: false, error: "" };

  if (!/^\d+$/.test(accountNumber)) {
    return {
      valid: false,
      error: "Account number must contain only digits",
    };
  }

  if (accountNumber.length < 10 || accountNumber.length > 15) {
    return {
      valid: false,
      error: "Account number must be between 10 and 15 digits",
    };
  }

  return { valid: true, error: "" };
};

// Password: min 8 chars, 1 uppercase, 1 number, 1 symbol
export const validatePassword = (password) => {
  if (!password) return { valid: false, error: "" };

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error:
        "Password must contain at least one special character (!@#$%^&*...)",
    };
  }

  return { valid: true, error: "" };
};

// Store name: not empty, 3-50 characters
export const validateStoreName = (storeName) => {
  if (!storeName || storeName.trim().length === 0) {
    return {
      valid: false,
      error: "Store name cannot be empty",
    };
  }

  if (storeName.length < 3 || storeName.length > 50) {
    return {
      valid: false,
      error: "Store name must be between 3 and 50 characters",
    };
  }

  return { valid: true, error: "" };
};

// Validate all bank details at once
export const validateBankDetails = (bankData) => {
  const errors = {};

  if (bankData.accountHolderName) {
    const nameValidation = validateAccountHolderName(
      bankData.accountHolderName,
    );
    if (!nameValidation.valid) {
      errors.accountHolderName = nameValidation.error;
    }
  }

  if (bankData.bankName) {
    const bankValidation = validateBankName(bankData.bankName);
    if (!bankValidation.valid) {
      errors.bankName = bankValidation.error;
    }
  }

  if (bankData.accountNumber) {
    const accountValidation = validateAccountNumber(bankData.accountNumber);
    if (!accountValidation.valid) {
      errors.accountNumber = accountValidation.error;
    }
  }

  if (bankData.telebirrNumber) {
    const phoneValidation = validateEthiopianPhone(bankData.telebirrNumber);
    if (!phoneValidation.valid) {
      errors.telebirrNumber = phoneValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

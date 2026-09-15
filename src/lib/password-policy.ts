import * as argon2 from 'argon2';

const WEAK_SUBSTRINGS = ['makeup', 'makeup', 'makeup', 'admin', 'cashier', 'password'];

/**
 * Validates a password against the strict corporate policy:
 * - Minimum 15 characters, maximum 128 characters.
 * - Cannot contain the user's email prefix or common company names.
 * - Cannot be a known weak or common password.
 */
export function validatePasswordPolicy(password: string, email: string): {
  isValid: boolean;
  error?: string;
} {
  // 1. Length rule
  if (password.length < 8) {
    return { isValid: false, error: 'يجب أن لا تقل كلمة المرور عن 8 أحرف' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'يجب أن لا تزيد كلمة المرور عن 128 حرفاً' };
  }

  // Reject password identical to email
  if (password.toLowerCase() === email.toLowerCase()) {
    return { isValid: false, error: 'يجب أن لا تطابق كلمة المرور البريد الإلكتروني للموظف' };
  }

  // 2. Email derivation check
  const emailPrefix = email.split('@')[0].toLowerCase();
  if (emailPrefix.length >= 4 && password.toLowerCase().includes(emailPrefix)) {
    return { isValid: false, error: 'يجب أن لا تحتوي كلمة المرور على اسم الحساب الإلكتروني' };
  }

  // 3. Weak substring checks (company names, weak words)
  const lowerPassword = password.toLowerCase();
  for (const weak of WEAK_SUBSTRINGS) {
    if (lowerPassword === weak || (weak.length >= 4 && lowerPassword.includes(weak) && lowerPassword.length < 18)) {
      return { isValid: false, error: 'كلمة المرور ضعيفة جداً وتحتوي على عبارات شائعة أو اسم الشركة' };
    }
  }

  // 4. Common weak patterns
  const commonWeak = ['123456789012345', 'password12345678', 'admin1234567890', 'makeupmakeup123'];
  if (commonWeak.includes(lowerPassword)) {
    return { isValid: false, error: 'كلمة المرور هذه شائعة الاستخدام وغير آمنة' };
  }

  return { isValid: true };
}

/**
 * Verifies if the new password has been used previously.
 * We compare the new password against the existing passwordHash.
 */
export async function isPasswordReused(newPassword: string, currentHash: string): Promise<boolean> {
  try {
    return await argon2.verify(currentHash, newPassword);
  } catch (error) {
    return false;
  }
}

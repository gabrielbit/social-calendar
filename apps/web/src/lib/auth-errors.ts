export function authErrorMessage(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("email not confirmed")) {
    return "Confirmá tu email antes de entrar. Revisá la bandeja o el correo de Mailpit en local.";
  }
  if (message.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (message.includes("user already registered") || message.includes("already been registered")) {
    return "Ese email ya tiene una cuenta. Entrá o pedí un enlace.";
  }
  if (message.includes("password")) {
    return "La contraseña tiene que tener al menos 8 caracteres.";
  }
  if (message.includes("invalid_client") || message.includes("unauthorized_client")) {
    return "Google rechazó las credenciales. Revisá el Client ID y el callback de Auth.";
  }
  return raw;
}

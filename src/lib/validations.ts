import { z } from "zod";
import { toMinutes } from "@/lib/time";

// Roles disponibles para autoregistro. Coincide con el enum `Role` de prisma/schema.prisma.
export const RegisterRoles = ["APRENDIZ", "INSTRUCTOR", "COORDINADOR"] as const;
export type RegisterRole = (typeof RegisterRoles)[number];

export const RegisterSchema = z
  .object({
    nombres: z.string().trim().min(2, "Ingresa tus nombres."),
    apellidos: z.string().trim().min(2, "Ingresa tus apellidos."),
    cedula: z.string().trim().min(5, "Ingresa un número de cédula válido."),
    email: z.string().trim().email("Ingresa un correo válido."),
    celular: z.string().trim().min(7, "Ingresa un número de celular válido."),
    direccionResidencia: z.string().trim().min(5, "Ingresa tu dirección de residencia."),
    role: z.enum(RegisterRoles, {
      message: "Selecciona el tipo de usuario.",
    }),
    // Solo obligatorio para Aprendiz; se valida condicionalmente abajo. Referencia a una Ficha
    // ya precargada por el coordinador (ver modelo Ficha) — ya no es texto libre.
    fichaId: z.string().trim().optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  })
  .refine(
    (data) => data.role !== "APRENDIZ" || (data.fichaId && data.fichaId.length > 0),
    {
      message: "Selecciona tu ficha.",
      path: ["fichaId"],
    }
  );

export const ProfileSchema = z.object({
  empresaPatrocinadora: z.string().trim().min(2, "Ingresa el nombre de la empresa patrocinadora."),
  direccionEmpresa: z.string().trim().min(5, "Ingresa la dirección de la empresa."),
  nombreCoformador: z.string().trim().min(2, "Ingresa el nombre del coformador."),
  cargoCoformador: z.string().trim().min(2, "Ingresa el cargo del coformador."),
  correoCoformador: z.string().trim().email("Ingresa un correo válido del coformador."),
  celularCoformador: z.string().trim().min(7, "Ingresa un celular válido del coformador."),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

export const PersonalUpdateSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  celular: z.string().trim().min(7, "Ingresa un número de celular válido."),
  direccionResidencia: z.string().trim().min(5, "Ingresa tu dirección de residencia."),
});

export type PersonalUpdateInput = z.infer<typeof PersonalUpdateSchema>;

// Recuperación de contraseña: el usuario se identifica con su cédula (dato de ingreso principal),
// el enlace de restablecimiento se envía al correo que tiene registrado en la cuenta.
export const ForgotPasswordSchema = z.object({
  cedula: z.string().trim().min(5, "Ingresa un número de cédula válido."),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Enlace inválido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirma tu nueva contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

const todayDateString = () => new Date().toISOString().slice(0, 10);

export const ConcertacionSchema = z
  .object({
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
      .refine((fecha) => fecha >= todayDateString(), {
        message: "La fecha no puede ser en el pasado.",
      }),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de inicio válida."),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de fin válida."),
  })
  .refine((data) => toMinutes(data.horaFin) > toMinutes(data.horaInicio), {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  })
  .refine((data) => toMinutes(data.horaFin) - toMinutes(data.horaInicio) >= 60, {
    message: "La franja debe durar al menos una hora.",
    path: ["horaFin"],
  });

export type ConcertacionInput = z.infer<typeof ConcertacionSchema>;

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
    // Solo obligatorio para Aprendiz; se valida condicionalmente abajo.
    codigoFicha: z.string().trim().optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  })
  .refine(
    (data) => data.role !== "APRENDIZ" || (data.codigoFicha && data.codigoFicha.length > 0),
    {
      message: "Ingresa el código de ficha.",
      path: ["codigoFicha"],
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PersonalUpdateSchema, type PersonalUpdateInput } from "@/lib/validations";

type PersonalData = {
  nombres: string;
  apellidos: string;
  cedula: string;
  codigoFicha: string;
  email: string;
  celular: string;
  direccionResidencia: string;
};

export function PersonalDataForm({
  initialData,
  codigoFichaLabel = "Código de ficha",
}: {
  initialData: PersonalData;
  codigoFichaLabel?: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonalUpdateInput>({
    resolver: zodResolver(PersonalUpdateSchema),
    defaultValues: {
      email: initialData.email,
      celular: initialData.celular,
      direccionResidencia: initialData.direccionResidencia,
    },
  });

  useEffect(() => {
    reset({
      email: initialData.email,
      celular: initialData.celular,
      direccionResidencia: initialData.direccionResidencia,
    });
  }, [initialData, reset]);

  async function onSubmit(values: PersonalUpdateInput) {
    setSaved(false);
    setServerError(null);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.error?.email) {
        setError("email", { message: data.error.email[0] });
      } else {
        setServerError("No se pudo actualizar la información.");
      }
      return;
    }

    await update({ email: values.email });
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Datos personales
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Los datos de identificación no se pueden modificar. Puedes actualizar tu correo,
        celular y dirección de residencia.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Nombres" value={initialData.nombres} />
        <ReadOnlyField label="Apellidos" value={initialData.apellidos} />
        <ReadOnlyField label="Cédula" value={initialData.cedula} />
        <ReadOnlyField label={codigoFichaLabel} value={initialData.codigoFicha} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Correo electrónico" error={errors.email?.message}>
          <input type="email" {...register("email")} className={inputClass} />
        </Field>

        <Field label="Celular" error={errors.celular?.message}>
          <input {...register("celular")} className={inputClass} />
        </Field>

        <Field
          label="Dirección de residencia"
          error={errors.direccionResidencia?.message}
        >
          <input {...register("direccionResidencia")} className={inputClass} />
        </Field>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        {saved && (
          <p className="text-sm text-green-600">Datos personales actualizados correctamente.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Guardando..." : "Actualizar datos personales"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        value={value}
        disabled
        readOnly
        className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
      />
    </div>
  );
}

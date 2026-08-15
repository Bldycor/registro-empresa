"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileSchema, type ProfileInput } from "@/lib/validations";

export function CompanyProfileForm({
  mode,
  defaultValues,
}: {
  mode: "create" | "update";
  defaultValues?: ProfileInput;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues,
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues);
  }, [defaultValues, reset]);

  async function onSubmit(values: ProfileInput) {
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) return;

    if (mode === "create") {
      router.push("/formulario/actualizar");
      router.refresh();
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "create"
            ? "Información del lugar donde va a laborar"
            : "Actualizar información de la empresa"}
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "create"
            ? "Completa los datos de la empresa patrocinadora y del coformador."
            : "Puedes actualizar los datos de la empresa patrocinadora y del coformador cuando lo necesites."}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Empresa patrocinadora
            </legend>

            <Field
              label="Empresa patrocinadora"
              error={errors.empresaPatrocinadora?.message}
            >
              <input {...register("empresaPatrocinadora")} className={inputClass} />
            </Field>

            <Field
              label="Dirección de la empresa"
              error={errors.direccionEmpresa?.message}
            >
              <input {...register("direccionEmpresa")} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Coformador
            </legend>

            <Field label="Nombre del coformador" error={errors.nombreCoformador?.message}>
              <input {...register("nombreCoformador")} className={inputClass} />
            </Field>

            <Field label="Cargo del coformador" error={errors.cargoCoformador?.message}>
              <input {...register("cargoCoformador")} className={inputClass} />
            </Field>

            <Field label="Correo del coformador" error={errors.correoCoformador?.message}>
              <input type="email" {...register("correoCoformador")} className={inputClass} />
            </Field>

            <Field label="Celular del coformador" error={errors.celularCoformador?.message}>
              <input {...register("celularCoformador")} className={inputClass} />
            </Field>
          </fieldset>

          {saved && (
            <p className="text-sm text-green-600">Información actualizada correctamente.</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting
              ? "Guardando..."
              : mode === "create"
                ? "Guardar información"
                : "Actualizar información"}
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

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedCreate, setCompletedCreate] = useState(false);

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
    setSubmitError(null);

    let res: Response;
    try {
      res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      setSubmitError(
        "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo."
      );
      return;
    }

    if (!res.ok) {
      let message = "No se pudo guardar la información. Inténtalo de nuevo.";
      try {
        const data = await res.json();
        if (typeof data?.error === "string") {
          message = data.error;
        } else if (data?.error && typeof data.error === "object") {
          const firstField = Object.values(data.error).flat()[0];
          if (typeof firstField === "string") message = firstField;
        }
      } catch {
        // Respuesta sin cuerpo JSON; se usa el mensaje genérico.
      }
      setSubmitError(message);
      return;
    }

    if (mode === "create") {
      // OJO: no llamar router.refresh() aquí. FormularioPage (el server component de
      // /formulario) redirige a /formulario/actualizar en cuanto detecta que el perfil ya
      // existe — si refrescamos mientras seguimos en esta misma ruta, esa redirección se
      // dispara de inmediato y le salta al usuario la pantalla de confirmación sin que
      // alcance a verla ni a hacer clic en "Continuar". Al navegar con los botones de abajo
      // (router.push a otra ruta) el menú y las páginas siguientes ya leen datos frescos.
      setCompletedCreate(true);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  if (completedCreate) {
    return (
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
          ✓
        </div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Información de la empresa guardada
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Ya registramos los datos de tu empresa y de tu coformador. El siguiente paso es
          agendar la <strong>concertación de funciones</strong>: tu primera evaluación de la
          Etapa Productiva.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              // push cambia de ruta (ya no estamos en /formulario, así que no dispara su
              // redirect); refresh fuerza que el layout compartido (el menú) relea el
              // perfil recién creado en vez de reusar la versión en caché de antes de guardar.
              router.push("/formulario/etapa-productiva");
              router.refresh();
            }}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continuar a Concertación de funciones →
          </button>
          <button
            type="button"
            onClick={() => {
              router.push("/formulario/actualizar");
              router.refresh();
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Ver o editar mis datos
          </button>
        </div>
      </div>
    );
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

          {submitError && (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
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

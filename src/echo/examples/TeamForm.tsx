import type React from "react";
import { useState } from "react";
import { ClientContext, setupSync, useOperation } from "../client";
import { addTeam, updateTeam } from "./team-operations";

// initialize client (in a real app this would be done once at the app level)
const wasmDb = {} as any; // placeholder for a WASM database adapter
const clientCtx = new ClientContext(wasmDb, {});
const syncClient = setupSync("wss://api.example.com");

interface TeamFormProps {
  tournamentId: string;
  existingTeam?: {
    id: string;
    name: string;
    version: number;
  };
}

export function TeamForm({ tournamentId, existingTeam }: TeamFormProps) {
  const [name, setName] = useState(existingTeam?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // get the appropriate operation based on whether we're creating or updating
  const operation = existingTeam ? updateTeam : addTeam;

  // use our operation hook
  const { execute } = useOperation(operation, syncClient, clientCtx, {
    // handle conflicts manually if needed
    onConflict: async (clientChange, serverState) => {
      // in a real app we might show a UI to let the user decide
      console.log("Conflict detected!", { clientChange, serverState });
      return serverState;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (existingTeam) {
        // update existing team
        await execute({
          id: existingTeam.id,
          name,
          version: existingTeam.version,
        });
      } else {
        // create new team
        await execute({
          name,
          tournamentId,
        });
      }

      // reset form after successful submission (for create)
      if (!existingTeam) {
        setName("");
      }
    } catch (err) {
      // handle errors
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="name" className="block font-medium text-sm">
          Team Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-2 text-red-800">{error}</div>
      )}

      <button
        type="submit"
        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Saving..."
          : existingTeam
            ? "Update Team"
            : "Create Team"}
      </button>
    </form>
  );
}

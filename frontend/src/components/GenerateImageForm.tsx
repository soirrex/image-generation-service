import { useState } from "react";
import type { SyntheticEvent } from "react";
import { FormField } from "./FormField";
import type { GenerateImageDto } from "../hooks/useImages";
import type { ApiErrorBody } from "../hooks/useApi";

interface GenerateImageFormProps {
  isSubmitting: boolean;
  submitError: ApiErrorBody | null;
  onSubmit: (dto: GenerateImageDto) => void | Promise<void>;
}

export function GenerateImageForm({ isSubmitting, submitError, onSubmit }: GenerateImageFormProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    const dto: GenerateImageDto = { name: name.trim(), prompt: prompt.trim() };
    if (dto.name.length === 0 || dto.prompt.length === 0) return;
    void Promise.resolve(onSubmit(dto)).then(() => {
      setName("");
      setPrompt("");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Generate image</h2>

      <FormField
        id="image-name"
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        placeholder="My sunset"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image-prompt" className="text-sm font-medium text-gray-700">
          Prompt
        </label>
        <textarea
          id="image-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A sunset over mountains, oil painting..."
          required
          maxLength={1000}
          rows={3}
          className="resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {submitError !== null && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Generating..." : "Generate"}
      </button>
    </form>
  );
}

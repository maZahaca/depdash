"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AddUserForm({ organizationId }: { organizationId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.get("email"),
          name: formData.get("name"),
          password: formData.get("password"),
          role: formData.get("role"),
          organizationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add user");
      }

      setSuccess("User added successfully!");
      router.refresh();

      // Reset form
      const form = document.getElementById("add-user-form") as HTMLFormElement;
      form?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      id="add-user-form"
      action={handleSubmit}
      className="space-y-4"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-2">
            Role *
          </label>
          <select
            id="role"
            name="role"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Adding..." : "Add User"}
      </Button>
    </form>
  );
}

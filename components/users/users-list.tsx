"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
  };
};

export function UsersList({
  members,
  canManageUsers,
  currentUserId,
}: {
  members: Member[];
  canManageUsers: boolean;
  currentUserId: string;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(memberId: string) {
    if (!confirm("Are you sure you want to remove this user?")) {
      return;
    }

    setDeletingId(memberId);

    try {
      const response = await fetch(`/api/v1/users/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{member.user.name || "No name"}</p>
                <p className="text-sm text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.role === "OWNER"
                    ? "bg-purple-100 text-purple-800"
                    : member.role === "ADMIN"
                    ? "bg-blue-100 text-blue-800"
                    : member.role === "MEMBER"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {member.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </p>
          </div>

          {canManageUsers && member.user.id !== currentUserId && member.role !== "OWNER" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(member.id)}
              disabled={deletingId === member.id}
            >
              {deletingId === member.id ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No users found
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface ApiTokenListProps {
  tokens: ApiToken[];
  organizationId: string;
  canEdit: boolean;
}

export function ApiTokenList({ tokens, organizationId, canEdit }: ApiTokenListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newlyCreatedToken, setNewlyCreatedToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      alert("Token name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/v1/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName,
          organizationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedToken(data.token);
        setShowCreateDialog(false);
        setShowTokenDialog(true);
        setNewTokenName("");
      } else {
        alert("Failed to create token");
      }
    } catch (error) {
      alert("Error creating token");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this token? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to revoke token");
      }
    } catch (error) {
      alert("Error revoking token");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Token copied to clipboard!");
  };

  return (
    <>
      <div className="space-y-4">
        {canEdit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            Generate New Token
          </Button>
        )}

        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "No API tokens yet. Generate one to start ingesting audit reports."
              : "No API tokens configured."}
          </p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{token.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {token.prefix}...
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {token.createdAt.toLocaleString()}
                    {token.lastUsedAt && (
                      <> · Last used: {token.lastUsedAt.toLocaleString()}</>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevokeToken(token.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Token</DialogTitle>
            <DialogDescription>
              Create a new API token for ingesting audit reports from CI/CD pipelines
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Token Name
              </label>
              <Input
                placeholder="e.g., GitHub Actions CI"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A descriptive name to identify where this token is used
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateToken} disabled={loading}>
              {loading ? "Generating..." : "Generate Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Newly Created Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={(open) => {
        setShowTokenDialog(open);
        if (!open) {
          window.location.reload();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Generated Successfully</DialogTitle>
            <DialogDescription>
              Copy this token now - you won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-md font-mono text-sm break-all">
              {newlyCreatedToken}
            </div>
            <Button
              onClick={() => copyToClipboard(newlyCreatedToken)}
              className="w-full"
            >
              Copy to Clipboard
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowTokenDialog(false);
                window.location.reload();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  ShieldCheck,
  Filter,
  X,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { DocumentCategory, Role } from "@prisma/client";
import { ClubDocumentWithStatus } from "@/modules/communications/services/document.service";
import { DocumentSignOffModal } from "./document-sign-off-modal";
import { createClubDocumentAction } from "@/modules/communications/actions/document.actions";

interface DocumentLibraryProps {
  documents: ClubDocumentWithStatus[];
  isAdmin: boolean;
  currentProfileId: string;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.BYLAWS]: "Club Bylaws (Vedtægter)",
  [DocumentCategory.CHILD_SAFETY]: "Child Safety (Børneattest)",
  [DocumentCategory.CODE_OF_CONDUCT]: "Code of Conduct",
  [DocumentCategory.GENERAL_POLICY]: "General Club Policy",
};

export function DocumentLibrary({
  documents,
  isAdmin,
  currentProfileId,
}: DocumentLibraryProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDocForModal, setSelectedDocForModal] = useState<ClubDocumentWithStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL_POLICY);
  const [newVersion, setNewVersion] = useState("2026.1");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRequiresSignOff, setNewRequiresSignOff] = useState(false);
  const [newTargetRole, setNewTargetRole] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== "ALL" && doc.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(q);
      const matchesCategory = doc.category.toLowerCase().includes(q);
      if (!matchesTitle && !matchesCategory) return false;
    }
    return true;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    startCreateTransition(async () => {
      const res = await createClubDocumentAction({
        title: newTitle,
        category: newCategory,
        version: newVersion,
        fileUrl: newFileUrl || undefined,
        contentMarkdown: newContent,
        requiresSignOff: newRequiresSignOff,
        targetRole: (newTargetRole as Role) || undefined,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to publish document.");
        return;
      }

      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewFileUrl("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 font-semibold pl-1 pr-1 text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            Category:
          </span>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              selectedCategory === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Documents ({documents.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
            const count = documents.filter((d) => d.category === catKey).length;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === catKey
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {label.split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all active:scale-[0.98] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Publish Document
            </button>
          )}
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="md:col-span-2 bg-card border border-dashed rounded-3xl p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <h3 className="text-base font-bold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No policies or governance documents match your selected filters.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSigned = doc.isSigned;
            const requiresSignOff = doc.requiresSignOff;

            return (
              <div
                key={doc.id}
                className={`bg-card border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 ${
                  requiresSignOff && !isSigned
                    ? "border-amber-500/35 bg-gradient-to-r from-amber-500/[0.03] to-card"
                    : ""
                }`}
              >
                <div className="space-y-2.5">
                  {/* Category & Version */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                      v{doc.version}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground leading-snug">
                    {doc.title}
                  </h3>

                  {/* Description preview */}
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {doc.contentMarkdown?.slice(0, 180)}...
                  </p>

                  {/* Target role badge */}
                  {doc.targetRole && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Applies to: <strong>{doc.targetRole}s</strong>
                    </div>
                  )}
                </div>

                {/* Footer Status & Actions */}
                <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                  {/* Status Indicator */}
                  <div>
                    {requiresSignOff ? (
                      isSigned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Signed (v{doc.versionSigned || doc.version})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Sign-Off Pending
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Informational Policy
                      </span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Download official PDF"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedDocForModal(doc)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] ${
                        requiresSignOff && !isSigned
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                      }`}
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      {requiresSignOff && !isSigned ? "Review & Sign" : "Read Policy"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review & Sign Modal */}
      {selectedDocForModal && (
        <DocumentSignOffModal
          document={selectedDocForModal}
          isOpen={Boolean(selectedDocForModal)}
          onClose={() => setSelectedDocForModal(null)}
          targetProfileId={currentProfileId}
        />
      )}

      {/* Publish New Document Modal (Admin) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Publish Club Governance Document
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Danish Cricket Federation Child Protection Guidelines"
                  className="w-full text-xs px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                    className="w-full text-xs px-3 py-2 rounded-xl border bg-background focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                      <option key={catKey} value={catKey}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Version Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="2026.1"
                    className="w-full text-xs px-3 py-2 rounded-xl border bg-background focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Policy Body Content (Markdown)
                </label>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="# Section 1: Code of Conduct&#10;All members and coaches agree to..."
                  className="w-full text-xs p-3 rounded-xl border bg-background focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Official PDF Link (Optional)
                </label>
                <input
                  type="url"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 rounded-xl border bg-background focus:outline-none"
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-xl space-y-2 border">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequiresSignOff}
                    onChange={(e) => setNewRequiresSignOff(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  Require Mandatory Digital Sign-Off
                </label>

                {newRequiresSignOff && (
                  <div className="pt-2 border-t">
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Target Role (Optional – leave blank for all members)
                    </label>
                    <select
                      value={newTargetRole}
                      onChange={(e) => setNewTargetRole(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border bg-background text-foreground focus:outline-none"
                    >
                      <option value="">All Members &amp; Parents</option>
                      <option value={Role.COACH}>Coaches Only (e.g. Børneattest)</option>
                      <option value={Role.PLAYER}>Players Only</option>
                      <option value={Role.PARENT}>Parents Only</option>
                      <option value={Role.ADMIN}>Administrators Only</option>
                    </select>
                  </div>
                )}
              </div>

              {createError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatePending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatePending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  Publish Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseCommits, generateMarkdown } from "@/lib/changelog";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

interface Tag {
  name: string;
  commit: {
    sha: string;
  };
}

interface CommitFilters {
  feat: boolean;
  fix: boolean;
  chore: boolean;
  docs: boolean;
  merge: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Mevcut state'ler
  const [repos, setRepos] = useState<Repo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [changelog, setChangelog] = useState<string>("");
  const [error, setError] = useState<string>("");

  // YENİ: Manuel tag range state'leri
  const [manualMode, setManualMode] = useState(false);
  const [fromTag, setFromTag] = useState<string>("");
  const [toTag, setToTag] = useState<string>("");
  const [tagError, setTagError] = useState<string>("");

  // YENİ: Commit filtering state
  const [commitFilters, setCommitFilters] = useState<CommitFilters>({
    feat: true,
    fix: true,
    chore: true,
    docs: true,
    merge: true,
  });

  // YENİ: Editable changelog state
  const [isEditing, setIsEditing] = useState(false);
  const [editedChangelog, setEditedChangelog] = useState("");

  // Auth kontrolü
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Repoları yükle
  useEffect(() => {
    if (status === "authenticated") {
      fetchRepos();
    }
  }, [status]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (error) {
      console.error("Failed to fetch repos:", error);
      setError("Repository'ler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async (repo: Repo) => {
    setLoading(true);
    setTags([]);
    setSelectedTag("");
    setChangelog("");
    setError("");
    setManualMode(false);
    setFromTag("");
    setToTag("");

    try {
      const res = await fetch(
        `/api/github/tags?owner=${repo.owner.login}&repo=${repo.name}`
      );

      if (!res.ok) {
        throw new Error("Tag fetch failed");
      }

      const data = await res.json();

      // EDGE CASE: Tag yok
      if (!data || data.length === 0) {
        setError(
          "⚠️ Bu repoda hiç tag/release bulunamadı. Önce GitHub'da bir release oluşturun."
        );
        setTags([]);
        return;
      }

      // EDGE CASE: Tek tag var
      if (data.length === 1) {
        setError(
          "⚠️ Bu repoda sadece 1 tag var. Changelog oluşturmak için en az 2 tag gerekli."
        );
        setTags(data);
        return;
      }

      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      setError("Tag'ler yüklenirken hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoFullName = e.target.value;
    if (!repoFullName) {
      setSelectedRepo(null);
      setTags([]);
      setSelectedTag("");
      setChangelog("");
      setError("");
      setManualMode(false);
      return;
    }

    const repo = repos.find((r) => r.full_name === repoFullName);
    if (repo) {
      setSelectedRepo(repo);
      fetchTags(repo);
    }
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTag(e.target.value);
    setChangelog("");
    setError("");
    setTagError("");
  };

  // YENİ: Tag range validation
  const validateTagRange = (): boolean => {
    if (!manualMode) return true;

    if (!fromTag || !toTag) {
      setTagError("❌ Her iki tag'i de seçmelisin");
      return false;
    }

    if (fromTag === toTag) {
      setTagError("❌ Aynı tag'i seçemezsin");
      return false;
    }

    const fromIndex = tags.findIndex((t) => t.name === fromTag);
    const toIndex = tags.findIndex((t) => t.name === toTag);

    if (fromIndex < toIndex) {
      setTagError("❌ Başlangıç tag'i (FROM) bitiş tag'inden (TO) daha eski olmalı");
      return false;
    }

    return true;
  };

  // YENİ: Commit filtering
  const filterCommits = (commits: any[]): any[] => {
    return commits.filter((commit) => {
      const message = commit.commit.message.toLowerCase();

      if (!commitFilters.merge && message.startsWith("merge")) {
        return false;
      }

      if (!commitFilters.feat && (message.startsWith("feat") || message.startsWith("feature"))) {
        return false;
      }

      if (!commitFilters.fix && message.startsWith("fix")) {
        return false;
      }

      if (
        !commitFilters.chore &&
        (message.startsWith("chore") ||
          message.startsWith("refactor") ||
          message.startsWith("style") ||
          message.startsWith("test"))
      ) {
        return false;
      }

      if (!commitFilters.docs && message.startsWith("docs")) {
        return false;
      }

      return true;
    });
  };

  const generateChangelog = async () => {
    if (!selectedRepo || (!selectedTag && !manualMode)) return;

    if (!validateTagRange()) return;

    setLoading(true);
    setError("");
    setChangelog("");
    setIsEditing(false);

    try {
      let baseTagName: string;
      let headTagName: string;

      if (manualMode) {
        baseTagName = fromTag;
        headTagName = toTag;
      } else {
        const currentIndex = tags.findIndex((t) => t.name === selectedTag);

        if (currentIndex === -1) {
          setError("Seçilen tag bulunamadı");
          return;
        }

        if (currentIndex === tags.length - 1) {
          setError(
            "⚠️ Bu en eski tag. Önceki bir tag yok. Manuel mod kullanarak başka bir aralık seçebilirsin."
          );
          return;
        }

        const previousTag = tags[currentIndex + 1];
        baseTagName = previousTag.name;
        headTagName = selectedTag;
      }

      const res = await fetch(
        `/api/github/compare?owner=${selectedRepo.owner.login}&repo=${selectedRepo.name}&base=${baseTagName}&head=${headTagName}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          setError("❌ Tag'lerden biri bulunamadı. Lütfen geçerli tag'ler seçin.");
        } else if (res.status === 403) {
          setError(
            "❌ GitHub API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin."
          );
        } else {
          setError("❌ GitHub API'den veri alınamadı. Lütfen tekrar deneyin.");
        }
        return;
      }

      const data = await res.json();

      if (!data.commits || data.commits.length === 0) {
        setChangelog(
          `# Değişiklik Yok\n\n**${baseTagName}** → **${headTagName}**\n\nBu iki tag arasında hiçbir commit bulunamadı.`
        );
        return;
      }

      // YENİ: Commit filtreleme
      const filteredCommits = filterCommits(data.commits);

      if (filteredCommits.length === 0) {
        setChangelog(
          `# Filtrelenmiş Commit Yok\n\n**${baseTagName}** → **${headTagName}**\n\nSeçilen filtrelere uygun commit bulunamadı.\nFiltreleri genişletmeyi deneyin.`
        );
        return;
      }

      const parsed = parseCommits(filteredCommits);
      const markdown = generateMarkdown(
        parsed,
        selectedRepo.full_name,
        baseTagName,
        headTagName
      );

      setChangelog(markdown);
      setEditedChangelog(markdown);
    } catch (error) {
      console.error("Failed to generate changelog:", error);
      setError("❌ Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Changelog Generator</h1>

          <div className="mb-6 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-600">
              Hoş geldin, <strong>{session?.user?.name}</strong>
            </p>
          </div>

          {/* Repo Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              1️⃣ Repository Seç
            </label>
            <select
              onChange={handleRepoChange}
              disabled={loading || repos.length === 0}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              value={selectedRepo?.full_name || ""}
            >
              <option value="">
                {repos.length === 0
                  ? "Repository'ler yükleniyor..."
                  : "Bir repository seç"}
              </option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Selection (Otomatik Mod) */}
          {selectedRepo && tags.length > 0 && !manualMode && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                2️⃣ Hedef Tag Seç (En Yeni Versiyon)
              </label>
              <select
                onChange={handleTagChange}
                disabled={loading}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={selectedTag}
              >
                <option value="">Bir tag seç</option>
                {tags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 Otomatik olarak bir önceki tag'den değişiklikleri alacağız
              </p>
            </div>
          )}

          {/* YENİ: Manuel Mod Toggle */}
          {selectedRepo && tags.length > 1 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={(e) => {
                    setManualMode(e.target.checked);
                    setTagError("");
                    setError("");
                    if (!e.target.checked) {
                      setFromTag("");
                      setToTag("");
                    } else {
                      setSelectedTag("");
                    }
                  }}
                  className="rounded"
                />
                <span className="font-medium">
                  🔧 İleri Düzey: Manuel tag aralığı seç
                </span>
              </label>
            </div>
          )}

          {/* YENİ: Manuel Tag Range Selection */}
          {manualMode && selectedRepo && tags.length > 1 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800 mb-3 font-medium">
                ⚙️ Manuel Mod Aktif: Otomatik tespit devre dışı
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    FROM (Eski Tag)
                  </label>
                  <select
                    value={fromTag}
                    onChange={(e) => {
                      setFromTag(e.target.value);
                      setTagError("");
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Başlangıç tag seç...</option>
                    {tags.map((tag) => (
                      <option key={`from-${tag.name}`} value={tag.name}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    TO (Yeni Tag)
                  </label>
                  <select
                    value={toTag}
                    onChange={(e) => {
                      setToTag(e.target.value);
                      setTagError("");
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Bitiş tag seç...</option>
                    {tags.map((tag) => (
                      <option key={`to-${tag.name}`} value={tag.name}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {tagError && (
                <p className="text-sm text-red-600 mt-2 font-medium">{tagError}</p>
              )}
            </div>
          )}

          {/* YENİ: Commit Filters */}
          {selectedRepo && ((selectedTag && !manualMode) || (manualMode && fromTag && toTag)) && (
            <div className="mb-4 p-4 bg-gray-50 border rounded">
              <p className="text-sm font-medium mb-3">🔍 Commit Filtreleri</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(commitFilters).map(([type, enabled]) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setCommitFilters((prev) => ({
                          ...prev,
                          [type]: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                💡 En az bir filtre aktif olmalı
              </p>
            </div>
          )}

          {/* Generate Button */}
          {selectedRepo &&
            ((selectedTag && !manualMode) || (manualMode && fromTag && toTag)) && (
              <button
                onClick={generateChangelog}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
              >
                {loading ? "🔄 Changelog Oluşturuluyor..." : "✨ Changelog Oluştur"}
              </button>
            )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mt-4 flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {tags.length === 0
                    ? "Tag'ler yükleniyor..."
                    : "Changelog oluşturuluyor..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* YENİ: Changelog Output with Edit Mode */}
        {changelog && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isEditing ? "✏️ Changelog Düzenleme" : "📄 Generated Changelog"}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setEditedChangelog(changelog);
                    }
                  }}
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded font-medium transition"
                >
                  {isEditing ? "👁️ Önizleme" : "✏️ Düzenle"}
                </button>
                <button
                  onClick={() => {
                    const textToCopy = isEditing ? editedChangelog : changelog;
                    navigator.clipboard.writeText(textToCopy);
                    alert("✅ Changelog panoya kopyalandı!");
                  }}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded font-medium transition"
                >
                  📋 Kopyala
                </button>
              </div>
            </div>

            {isEditing ? (
              <div>
                <textarea
                  value={editedChangelog}
                  onChange={(e) => setEditedChangelog(e.target.value)}
                  className="w-full h-96 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Changelog'i düzenle..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Değişiklikler sadece bu oturumda saklanır. Kopyalayıp
                  kaydetmeyi unutma!
                </p>
              </div>
            ) : (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap font-mono border">
                {changelog}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
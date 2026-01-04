interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface ParsedCommits {
  features: Commit[];
  fixes: Commit[];
  chores: Commit[];
  breaking: Commit[];
  other: Commit[];
}

export function parseCommits(commits: Commit[]): ParsedCommits {
  const parsed: ParsedCommits = {
    features: [],
    fixes: [],
    chores: [],
    breaking: [],
    other: [],
  };

  commits.forEach((commit) => {
    const message = commit.commit.message.toLowerCase();
    const fullMessage = commit.commit.message;

    // Breaking changes kontrolü (BREAKING CHANGE: veya !)
    if (
      fullMessage.includes("BREAKING CHANGE:") ||
      /^[a-z]+(\(.+\))?!:/.test(fullMessage)
    ) {
      parsed.breaking.push(commit);
    }
    // feat: veya feature:
    else if (message.startsWith("feat:") || message.startsWith("feature:")) {
      parsed.features.push(commit);
    }
    // fix:
    else if (message.startsWith("fix:")) {
      parsed.fixes.push(commit);
    }
    // chore:, docs:, style:, refactor:, test:
    else if (
      message.startsWith("chore:") ||
      message.startsWith("docs:") ||
      message.startsWith("style:") ||
      message.startsWith("refactor:") ||
      message.startsWith("test:")
    ) {
      parsed.chores.push(commit);
    }
    // Diğerleri
    else {
      parsed.other.push(commit);
    }
  });

  return parsed;
}

export function generateMarkdown(
  parsed: ParsedCommits,
  repoName: string,
  baseTag: string,
  headTag: string
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Changelog: ${repoName}`);
  lines.push("");
  lines.push(`**${baseTag}** → **${headTag}**`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Breaking Changes
  if (parsed.breaking.length > 0) {
    lines.push("## ⚠️ Breaking Changes");
    lines.push("");
    parsed.breaking.forEach((commit) => {
      const msg = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`- ${msg} (\`${shortSha}\`)`);
    });
    lines.push("");
  }

  // Features
  if (parsed.features.length > 0) {
    lines.push("## ✨ Features");
    lines.push("");
    parsed.features.forEach((commit) => {
      const msg = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`- ${msg} (\`${shortSha}\`)`);
    });
    lines.push("");
  }

  // Fixes
  if (parsed.fixes.length > 0) {
    lines.push("## 🐛 Bug Fixes");
    lines.push("");
    parsed.fixes.forEach((commit) => {
      const msg = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`- ${msg} (\`${shortSha}\`)`);
    });
    lines.push("");
  }

  // Chores
  if (parsed.chores.length > 0) {
    lines.push("## 🔧 Chores");
    lines.push("");
    parsed.chores.forEach((commit) => {
      const msg = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`- ${msg} (\`${shortSha}\`)`);
    });
    lines.push("");
  }

  // Other
  if (parsed.other.length > 0) {
    lines.push("## 📝 Other Changes");
    lines.push("");
    parsed.other.forEach((commit) => {
      const msg = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`- ${msg} (\`${shortSha}\`)`);
    });
    lines.push("");
  }

  return lines.join("\n");
}
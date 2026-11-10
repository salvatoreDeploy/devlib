// Parser de package.json (arquivo ou texto colado) pra importação de
// bibliotecas no projeto. Puro: não chama a API — gera a lista que o drawer
// mostra na prévia e depois manda pra POST /projects/:id/libraries/import.

export type DependencySource = "dependencies" | "devDependencies";

export type PackageJsonDependency = {
  name: string;
  // ausente quando vazia no arquivo ou quando há conflito entre os grupos
  version?: string;
  // true só quando a lib está APENAS em devDependencies
  dev: boolean;
  sources: DependencySource[];
  // mesma lib nos dois grupos com versões diferentes — quem usa precisa
  // escolher; o parser não decide sozinho. Versão vazia fica de fora
  conflict?: Partial<Record<DependencySource, string>>;
};

export type ParsePackageJsonResult =
  { ok: true; items: PackageJsonDependency[] } | { ok: false; error: string };

const SOURCES: DependencySource[] = ["dependencies", "devDependencies"];

type Entry = { name: string; version?: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(error: string): ParsePackageJsonResult {
  return { ok: false, error };
}

function readGroup(
  pkg: Record<string, unknown>,
  source: DependencySource,
): Entry[] | string {
  const group = pkg[source];

  if (group === undefined) {
    return [];
  }
  if (!isPlainObject(group)) {
    return `O campo "${source}" precisa ser um objeto { "nome": "versão" }.`;
  }

  const entries: Entry[] = [];
  const seen = new Set<string>();

  for (const [rawName, rawVersion] of Object.entries(group)) {
    const name = rawName.trim();

    if (!name) {
      return `Há uma dependência sem nome em "${source}".`;
    }
    if (typeof rawVersion !== "string") {
      return `Versão inválida para "${name}" em "${source}" — esperado um texto como "^1.2.3".`;
    }
    if (seen.has(name)) {
      return `"${name}" aparece repetida em "${source}".`;
    }
    seen.add(name);

    const version = rawVersion.trim();
    entries.push(version ? { name, version } : { name });
  }

  return entries;
}

export function parsePackageJson(text: string): ParsePackageJsonResult {
  // trim() também remove o BOM (U+FEFF) do início — comum em arquivo salvo
  // no Windows, quebraria o JSON.parse
  const trimmed = text.trim();

  if (!trimmed) {
    return fail("O conteúdo está vazio — envie ou cole um package.json.");
  }

  let pkg: unknown;
  try {
    pkg = JSON.parse(trimmed);
  } catch {
    return fail(
      "O conteúdo não é um JSON válido — confira vírgulas, aspas e chaves.",
    );
  }

  if (!isPlainObject(pkg)) {
    return fail(
      'O conteúdo não parece um package.json — esperado um objeto JSON com "dependencies" e/ou "devDependencies".',
    );
  }

  const groups = {} as Record<DependencySource, Entry[]>;
  for (const source of SOURCES) {
    const group = readGroup(pkg, source);
    if (typeof group === "string") {
      return fail(group);
    }
    groups[source] = group;
  }

  // Map preserva a ordem de inserção: produção primeiro, depois as só-dev
  const byName = new Map<string, PackageJsonDependency>();

  for (const { name, version } of groups.dependencies) {
    byName.set(name, {
      name,
      ...(version !== undefined && { version }),
      dev: false,
      sources: ["dependencies"],
    });
  }

  for (const { name, version } of groups.devDependencies) {
    const prod = byName.get(name);

    if (!prod) {
      byName.set(name, {
        name,
        ...(version !== undefined && { version }),
        dev: true,
        sources: ["devDependencies"],
      });
      continue;
    }

    prod.sources = ["dependencies", "devDependencies"];

    if (prod.version !== version) {
      const conflict: PackageJsonDependency["conflict"] = {};
      if (prod.version !== undefined) conflict.dependencies = prod.version;
      if (version !== undefined) conflict.devDependencies = version;

      delete prod.version;
      prod.conflict = conflict;
    }
  }

  if (byName.size === 0) {
    return fail(
      'Nenhuma dependência encontrada em "dependencies" ou "devDependencies".',
    );
  }

  return { ok: true, items: [...byName.values()] };
}

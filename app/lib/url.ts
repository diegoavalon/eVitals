function normalizedBasePath(basePath: string): string {
  if (!basePath) return "/";
  if (basePath === "./" || basePath === ".") return "./";
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function withBasePath(path: string, basePath: string = import.meta.env.BASE_URL): string {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) return path;
  const normalizedBase = normalizedBasePath(basePath);
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}

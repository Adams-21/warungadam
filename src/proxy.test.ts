import { describe, expect, it } from "vitest";
import { config, resolveProxyRedirect } from "./proxy";

describe("Proxy autentikasi", () => {
  it("mengarahkan path terproteksi tanpa cookie ke login", () => {
    expect(resolveProxyRedirect("/dashboard", false)).toBe("/login");
    expect(resolveProxyRedirect("/settings", false)).toBe("/login");
    expect(resolveProxyRedirect("/settings/business", false)).toBe("/login");
  });

  it("tidak mengarahkan path terproteksi yang memiliki cookie", () => {
    expect(resolveProxyRedirect("/dashboard", true)).toBeNull();
    expect(resolveProxyRedirect("/settings", true)).toBeNull();
  });

  it("tidak mengarahkan /login meskipun cookie basi masih ada", () => {
    expect(resolveProxyRedirect("/login", true)).toBeNull();
  });

  it("tidak mengarahkan path publik", () => {
    expect(resolveProxyRedirect("/bantuan", false)).toBeNull();
  });

  it("memasukkan settings ke matcher proxy", () => {
    expect(config.matcher).toContain("/settings/:path*");
  });
});

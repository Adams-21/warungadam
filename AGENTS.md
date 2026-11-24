<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan Pengembangan Warungadam

### Unit Testing (wajib)

- Setiap fitur baru **atau perubahan logika** wajib memiliki file unit test dengan format `*.test.ts` yang ditempatkan **colocated di dalam folder fiturnya masing-masing** (misalnya `src/app/(protected)/purchases/purchases.test.ts`).
- File test wajib menggunakan `describe`, `it`, dan `expect` dari Vitest. Skenario positif dan negatif harus diuji.
- Logika bisnis dan rumus perhitungan harus diekstrak ke fungsi helper murni terpisah (bukan dibiarkan bersarang di Server Action) agar dapat diuji tanpa database, `fetch`, atau efek samping Next.js.
- Dilarang mengubah aturan atau rumus fitur lama tanpa memastikan **seluruh unit test tetap hijau** (`npm test`).

### Mutasi Database (wajib)

- Semua mutasi database wajib berada di dalam `prisma.$transaction(...)`.
- Semua mutasi database wajib memanggil `requireAuth()` terlebih dahulu dan menggunakan identitas user hasil autentikasi tersebut.
- Jangan menulis mutation langsung di luar transaksi, termasuk `create`, `update`, `delete`, `upsert`, dan `deleteMany`.

### Verifikasi Sebelum Selesai (wajib)

Setiap selesai mengubah kode, jalankan dan pastikan lolos tanpa error:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

### Konfigurasi Test

- Framework: Vitest, script `npm test` (`vitest run`) dan `npm run test:watch` (`vitest`).
- Konfigurasi: `vitest.config.ts`, alias `@/*` mengikuti `tsconfig.json`, include `src/**/*.test.ts`.

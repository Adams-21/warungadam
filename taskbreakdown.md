# BizManage - Step 1: Fondasi Proyek

**Tujuan:** Menyiapkan fondasi aplikasi BizManage sebelum masuk ke pengembangan fitur bisnis.

**Stack Teknologi:**

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Zod untuk validasi data

**Status:** Belum dikerjakan

---

## 1. Task Breakdown

| ID     | Task                        | Detail Pekerjaan                                                                              | Kriteria Selesai                                               | Status |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| SET-01 | Inisialisasi proyek         | Membuat proyek Next.js menggunakan App Router dan TypeScript.                                 | Proyek berhasil dibuat dan dapat dijalankan.                   | Todo   |
| SET-02 | Konfigurasi struktur folder | Menyiapkan struktur folder untuk aplikasi, komponen, library, validasi, dan modul fitur.      | Struktur folder konsisten dan mudah dikembangkan.              | Todo   |
| SET-03 | Konfigurasi Tailwind CSS    | Memastikan Tailwind CSS terpasang dan berfungsi.                                              | Styling dapat digunakan pada halaman Next.js.                  | Todo   |
| SET-04 | Instalasi Prisma            | Memasang Prisma ORM dan menginisialisasi konfigurasi Prisma.                                  | Prisma berhasil dikenali oleh proyek.                          | Todo   |
| SET-05 | Konfigurasi PostgreSQL      | Menghubungkan aplikasi dengan database PostgreSQL melalui environment variable.               | Koneksi database berhasil diuji.                               | Todo   |
| SET-06 | Konfigurasi environment     | Membuat `.env` dan `.env.example` untuk konfigurasi aplikasi.                                 | Tidak ada credential sensitif yang masuk Git.                  | Todo   |
| SET-07 | Konfigurasi Zod             | Memasang Zod untuk validasi data.                                                             | Zod dapat digunakan untuk memvalidasi input.                   | Todo   |
| SET-08 | Pengujian fondasi           | Menjalankan aplikasi, memeriksa koneksi database, dan memastikan tidak ada error konfigurasi. | Build dan pengujian dasar berhasil.                            | Todo   |
| SET-09 | Dokumentasi setup           | Membuat dokumentasi instalasi dan cara menjalankan proyek.                                    | Developer lain dapat menjalankan proyek mengikuti dokumentasi. | Todo   |

---

## 2. Rekomendasi Struktur Folder

Struktur awal yang disarankan:

```text
bizmanage/
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── utils.ts
│   ├── modules/
│   ├── schemas/
│   └── types/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Catatan:

- Gunakan Server Components sebagai pilihan default.
- Gunakan Client Components hanya ketika membutuhkan interaksi browser.
- Pisahkan logika bisnis dari komponen UI.
- Jangan menaruh credential database di dalam source code.

---

## 3. Batasan Pengerjaan

Pada tahap ini, jangan mengerjakan:

- Fitur login dan autentikasi.
- CRUD produk dan supplier.
- Transaksi penjualan.
- Perhitungan HPP.
- Pengelolaan stok.
- Laporan keuangan.
- Fitur retur marketplace.

Fokus hanya pada fondasi teknis agar tahap berikutnya tidak terganggu masalah konfigurasi.

---

## 4. Instruksi untuk OpenCode

Kerjakan task SET-01 sampai SET-09 secara bertahap dengan ketentuan:

1. Periksa kondisi repository sebelum mengubah file.
2. Jangan menghapus atau menimpa file yang sudah ada tanpa alasan.
3. Gunakan versi dependency yang kompatibel dan stabil.
4. Jangan mengarang konfigurasi database. Gunakan environment variable.
5. Jangan membuat fitur bisnis yang belum diminta.
6. Setelah setiap task selesai, jalankan pemeriksaan yang relevan.
7. Jika terjadi error, cari penyebab dan perbaiki sebelum melanjutkan.
8. Jangan melakukan commit atau push tanpa instruksi.
9. Laporkan file yang dibuat atau diubah.
10. Jika ada keputusan teknis yang belum jelas, tanyakan terlebih dahulu.

**Output akhir yang diharapkan:**

- Proyek Next.js berhasil berjalan.
- Prisma terhubung ke PostgreSQL.
- Konfigurasi environment tersedia.
- Struktur folder siap dikembangkan.
- Validasi Zod tersedia.
- README berisi panduan instalasi dan menjalankan aplikasi.

---

## 5. Checklist Penyelesaian

- [ ] SET-01 Inisialisasi proyek
- [ ] SET-02 Struktur folder
- [ ] SET-03 Tailwind CSS
- [ ] SET-04 Prisma
- [ ] SET-05 PostgreSQL
- [ ] SET-06 Environment
- [ ] SET-07 Zod
- [ ] SET-08 Pengujian
- [ ] SET-09 Dokumentasi

**Tahap berikutnya:** Step 2 - Autentikasi dan Hak Akses Pengguna.

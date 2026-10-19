# 🤖 WarungAdam - Agentic Engineering Protocol & Workflow

Dokumen ini adalah Single Source of Truth yang berisi alur kerja, arsitektur, dan aturan main (strict rules) bagi AI Agent (seperti Cursor, Claude, Copilot) dan Developer dalam membangun serta memelihara aplikasi WarungAdam (Aplikasi Kasir & Inventaris Warung).

---

## 🏛️ 1. Architecture & Tech Stack Context

Setiap perubahan kode WAJIB mematuhi arsitektur dasar berikut:

- Project Name: `warungadam`
- Framework: Next.js (App Router - TypeScript)
- Database: PostgreSQL (Local Server / PostgreSQL Direct Service)
- ORM: Prisma ORM (`prisma/schema.prisma` sebagai acuan utama)
- Database GUI: TablePlus / Prisma Studio
- Data Flow Pattern:
  [Client Component / Form] ➔ [Server Action] ➔ [Prisma Query] ➔ [PostgreSQL DB]

---

## 🎯 2. Role Division (Dev vs AI Agent)

| Peran | Pihak | Tanggung Jawab |
| :--- | :--- | :--- |
| System Architect & Reviewer | Human Developer | Menentukan kebutuhan bisnis warung, menyetujui schema, mengecek logika stok & transaksi, serta melakukan tes/review akhir. |
| Code Executor & Refactorer | AI Agent | Menulis fungsi TypeScript, menyusun query Prisma, membuat komponen UI, serta menangani error penulisan kode (type checking). |

---

## 🔄 3. Step-by-Step Agentic Workflow

Setiap kali menambah fitur baru atau memperbaiki bug, AI Agent dan Developer harus menjalankan alur 5 langkah ini secara berurutan:

[ Step 1: Spec & Plan ] ➔ [ Step 2: Schema Migration ] ➔ [ Step 3: Server Logic ] ➔ [ Step 4: UI & Actions ] ➔ [ Step 5: Verification ]

---

## 📝 Catatan Step 1 - Halaman Kategori

### Kita bikin apa di Step 1?
Membuat halaman baru bernama Halaman Kategori di alamat `/categories`. Di halaman ini penjaga warung bisa:

1. Nambah kategori baru (misal: Makanan, Minuman, Snack).
2. Lihat daftar kategori yang sudah ada beserta jumlah produknya.
3. Hapus kategori yang sudah tidak dipakai.

### Kenapa Step 1 ini penting?
Kategori ibarat "rak" di warung. Produk harus ditempatkan di rak, jadi rak harus disiapkan terlebih dahulu sebelum barang-barang ditata.

### File-file yang disentuh

| File | Perannya |
| :--- | :--- |
| `app/categories/page.tsx` | Halaman utama kategori (Server Component). Tugasnya mengambil data menggunakan `getCategories()`. |
| `app/categories/category-manager.tsx` | Bagian interaktif (Client Component): form tambah, tombol hapus, loading, dan notifikasi. |
| `app/actions.ts` | Rumah Server Action: `createCategory` (tambah) dan `deleteCategory` (hapus). |
| `lib/queries.ts` | Menggunakan fungsi `getCategories()`. |

### Alur Data
[ Form / Tombol Hapus ] ➔ [ Server Action (app/actions.ts) ] ➔ [ Prisma / db ] ➔ [ PostgreSQL ]

- Saat form diisi dan mengklik Simpan, data dikirim ke `createCategory`.
- Di dalam action dilakukan validasi (nama tidak boleh kosong) sebelum disimpan ke database.
- Jika nama kategori sudah ada (aturan `@unique`), error ditangkap dan menampilkan pesan "Kategori sudah ada".
- Setelah menyimpan/menghapus, memanggil `revalidatePath("/categories")` agar halaman otomatis menampilkan data terbaru.

### Penggunaan Suspense dan Client Component
- `getCategories()` mengambil data dari database, sehingga berjalan di Server Component. Karena project menggunakan `cacheComponents` di `next.config.ts`, bagian pengambilan data dibungkus menggunakan `<Suspense>`.
- Interaksi (mengisi form, submit, tombol hapus loading) dilakukan di Client Component (`category-manager.tsx`).

### Loading & Feedback
- Saat form di-submit ➔ tombol berubah menjadi "Menyimpan..." dan dinonaktifkan.
- Sukses simpan ➔ muncul banner hijau, dan kolom input otomatis dikosongkan.
- Gagal ➔ muncul banner merah berisi alasannya.
- Tombol hapus ➔ meminta konfirmasi, lalu menampilkan "Menghapus..." selagi proses.
- Jika kategori masih memiliki produk, tombol hapus dimatikan (disabled) dengan keterangan "Masih dipakai produk".

---

## 📝 Catatan Step 2 - Halaman Manajemen Produk

Menata barang dagangan ke dalam rak yang sudah dibuat.

### Kita bikin apa di Step 2?
Halaman baru di alamat `/products` sebagai "gudang" digital warung:

1. Tambah produk baru lengkap dengan SKU, stok, harga beli, dan harga jual.
2. Lihat semua produk dalam bentuk tabel yang rapi.
3. Edit produk jika ada perubahan harga atau stok.
4. Hapus produk yang sudah tidak dijual.

### File-file yang disentuh

| File | Perannya |
| :--- | :--- |
| `app/products/page.tsx` | Halaman utama produk (Server Component). Mengambil data via `getProducts()` + `getCategories()`. |
| `app/products/product-manager.tsx` | Bagian interaktif (Client Component): tabel, modal tambah, modal edit, tombol hapus, dan loading state. |
| `app/actions.ts` | Server Action: `createProduct`, `updateProduct`, `deleteProduct`. |
| `lib/queries.ts` | Menggunakan `getProducts()` dan `getCategories()`. |

### Validasi Data
- Nama dan Kategori wajib diisi.
- Stok harus angka bulat 0 atau lebih.
- Harga beli & harga jual wajib diisi dan tidak boleh bernilai negatif.
- SKU bersifat opsional (disimpan sebagai `null`). Jika diisi tapi bentrok, database akan menolak (`@unique`).
- Produk yang sudah pernah dipakai di transaksi tidak bisa dihapus untuk menjaga integritas laporan keuangan.

### Tampilan UI
- Tabel produk: Nama Produk, SKU, Stok, Harga Beli, Harga Jual, Nama Kategori, dan tombol Aksi (Edit + Hapus).
- Indikator Stok: Merah (0/habis), Kuning (≤ 5/menipis), Hijau (aman).
- Format harga menggunakan Rupiah (`Intl.NumberFormat`).

---

## 📝 Catatan Step 3 - Halaman Kasir / POS

Buka loket pembayaran di alamat `/cashier`.

### Fitur Halaman Kasir
1. Sisi Kiri: Daftar produk model kartu (nama, harga jual, stok, tombol "Tambah ke Keranjang"), dan kotak pencarian (nama/SKU).
2. Sisi Kanan: Sidebar Keranjang Belanja: daftar barang, atur jumlah, total harga, tombol Reset Keranjang, dan tombol "Bayar / Proses Transaksi".

### State Management: Zustand 🧠
State keranjang disimpan di `lib/use-cart.ts`:
- `addToCart(product)`
- `removeFromCart(id)`
- `updateQuantity(id, qty)`
- `clearCart()`
- `getTotalPrice()`

### Alur Transaksi
[ Klik "Bayar" ] ➔ [ createTransaction (Server Action) ] ➔ [ $transaction Prisma ] ➔ [ PostgreSQL ]

1. Isi keranjang dikirim ke `createTransaction` di `app/actions.ts`.
2. Validasi ulang stok di sisi server.
3. Eksekusi transaksi atomik via `db.$transaction`:
   - Buat record `Transaction` + `TransactionItem`.
   - Potong stok produk otomatis (`decrement`).
4. Jika sukses ➔ muncul banner hijau dan keranjang dibersihkan otomatis.

---

## 📝 Catatan Step 4 - Dashboard & Ringkasan Laporan

Halaman utama di `/` (`app/page.tsx`) sebagai pusat pemantauan performa warung.

### Ringkasan Fitur
1. 3 Kartu Navigasi Cepat (`/cashier`, `/products`, `/categories`).
2. 4 Kartu Statistik: Total Omzet, Total Transaksi, Total Produk, dan Total Kategori.
3. Tabel Riwayat Transaksi Terbaru (10 transaksi terakhir) dengan fitur rincian barang (accordion via HTML `<details>` + `<summary>`).

---

## 🛠️ Catatan Penyesuaian UX - SKU Otomatis

1. SKU Opsional: Kolom SKU di form produk boleh dikosongkan.
2. Auto-Generate SKU: Jika dikosongkan, frontend (`app/products/product-manager.tsx`) membuat SKU otomatis berformat `PRD-XXXX` (4 digit acak).
3. Badge Tampilan: SKU buatan sistem berawalan `PRD-` ditampilkan dengan elemen badge/pill ungu di tabel dan grid kasir.

---

## 🐛 Catatan Perbaikan Bug - Error "use server"

### Masalah
Pesan error: `A "use server" file can only export async functions, found object.`

### Penyebab & Solusi
File dengan instruksi `"use server"` (`app/actions.ts`) hanya boleh meng-export fungsi `async`. Objek `initialActionState` dipindahkan ke file terpisah: `app/action-state.ts`.

---

## 📅 Catatan Fitur Baru - Tanggal Kedaluwarsa (Expired Date)

1. Schema DB: Menambahkan field `expiredAt DateTime?` pada model `Product`.
2. Indikator Warna:
   - 🔴 Expired (lewat tanggal hari ini)
   - 🟡 Segera Expired (≤ 30 hari)
   - 🟢 Aman (> 30 hari)
3. Helper Shared: Logika kalkulasi tanggal dibuat terpusat di `lib/expiry.ts`.

---

## 💵 Catatan Perbaikan - UI & Logika Halaman Kasir

1. Auto-Refresh Stok: Memanggil `revalidatePath("/cashier")` di server action dan `router.refresh()` di client setelah transaksi berhasil.
2. Perhitungan Kembalian: Menambahkan input Uang Diterima dan kalkulasi Kembalian. Tombol Bayar dinonaktifkan otomatis jika uang kurang.
3. Tema Visual (Modern Emerald): Desain kartu produk putih minimalis (`bg-white border-slate-200`) dengan badge kategori berwarna soft dan background `bg-slate-50`.

---

## 🔐 Catatan Fitur - Autentikasi Toko & Proteksi PIN Laporan

### 1. Auth Satu Akun per Toko
- Model User: `storeName`, `username`, `password` (hash `scrypt`), dan `pin` (default `"1234"`).
- Halaman `/login` & `/register` dengan cookie session ter-sign HMAC SHA-256 (`warungadam_session`).
- Header/Navbar menampilkan nama toko yang aktif dan tombol Logout.

### 2. Proteksi PIN 4-Digit
- `/cashier`: Bebas diakses langsung tanpa PIN.
- Dashboard (`/`) & Produk (`/products`): Terkunci modal PIN (`app/pin-gate.tsx`). Verifikasi dilakukan via server action `verifyPin`. Setelah terverifikasi, status disimpan di cookie `warungadam_pin`.